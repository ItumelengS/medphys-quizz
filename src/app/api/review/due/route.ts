import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_REVIEW = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const userId = session.user.id;
  const now = new Date().toISOString();

  // Get all questions
  const { data: allQuestions } = await supabase
    .from("questions")
    .select("*")
    .order("id");

  if (!allQuestions?.length) {
    return NextResponse.json([]);
  }

  // Get user's question history
  const { data: history } = await supabase
    .from("question_history")
    .select("*")
    .eq("user_id", userId);

  const historyMap = new Map(
    (history || []).map((h) => [h.question_id, h])
  );

  // Determine due questions
  const due: { question: typeof allQuestions[0]; priority: number; date: string }[] = [];

  for (const q of allQuestions) {
    const record = historyMap.get(q.id);
    if (!record) {
      // Never seen — medium priority
      due.push({ question: q, priority: 1, date: "1970-01-01" });
    } else if (new Date(record.next_due) <= new Date(now)) {
      // Wrong recently = highest priority
      const priority = record.streak === 0 && record.times_shown > 0 ? 0 : 2;
      due.push({ question: q, priority, date: record.next_due });
    }
  }

  const sorted = due
    .sort((a, b) => a.priority - b.priority || a.date.localeCompare(b.date))
    .slice(0, MAX_REVIEW)
    .map((d) => d.question);

  return NextResponse.json(sorted);
}
