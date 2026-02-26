import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const userId = session.user.id;

  const [profileRes, statsRes, historyRes, sectionsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("user_stats").select("*").eq("user_id", userId).single(),
    supabase.from("question_history").select("*").eq("user_id", userId),
    supabase.from("sections").select("*").order("sort_order"),
  ]);

  // Calculate section mastery from question_history
  const history = historyRes.data || [];
  const sectionMastery: Record<string, { shown: number; correct: number; percent: number }> = {};

  for (const section of sectionsRes.data || []) {
    const sectionHistory = history.filter((h) =>
      h.question_id.startsWith(section.id)
    );
    const shown = sectionHistory.reduce((s, h) => s + h.times_shown, 0);
    const correct = sectionHistory.reduce((s, h) => s + h.times_correct, 0);
    sectionMastery[section.id] = {
      shown,
      correct,
      percent: shown > 0 ? Math.round((correct / shown) * 100) : 0,
    };
  }

  // Activity calendar (last 30 days from question history)
  const activityMap: Record<string, number> = {};
  for (const record of history) {
    if (record.last_shown) {
      const day = record.last_shown.split("T")[0];
      activityMap[day] = (activityMap[day] || 0) + 1;
    }
  }

  return NextResponse.json({
    profile: profileRes.data,
    stats: statsRes.data,
    sections: sectionsRes.data,
    sectionMastery,
    activityMap,
  });
}
