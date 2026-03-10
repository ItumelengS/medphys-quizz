import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { applyDifficultyFilter } from "@/lib/difficulty-filter";
import { applyDisciplineFilter } from "@/lib/discipline-filter";

function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const rng = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Check if already completed
  const { data: daily } = await supabase
    .from("daily_challenges")
    .select("last_completed_date, last_score")
    .eq("user_id", session.user.id)
    .single();

  if (daily?.last_completed_date === today) {
    return NextResponse.json({ locked: true, score: daily.last_score });
  }

  // Get user profile for difficulty + discipline filtering
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, discipline")
    .eq("id", session.user.id)
    .single();

  const xp = profile?.xp ?? 0;
  const discipline = profile?.discipline ?? "physicist";

  // Get question IDs filtered by user's difficulty range and discipline
  let idsQuery = applyDisciplineFilter(
    supabase.from("questions").select("id"),
    discipline
  );
  idsQuery = applyDifficultyFilter(idsQuery, xp);
  const { data: allIds } = await idsQuery.order("id");

  if (!allIds?.length) {
    return NextResponse.json({ error: "No questions" }, { status: 500 });
  }

  const seed = dateToSeed(today);
  const shuffled = seededShuffle(allIds, seed);
  const { DAILY_QUESTION_COUNT } = await import("@/lib/daily-config");
  const selectedIds = shuffled.slice(0, DAILY_QUESTION_COUNT).map((q) => q.id);

  const { data: selected } = await supabase
    .from("questions")
    .select("*")
    .in("id", selectedIds);

  return NextResponse.json({ locked: false, questions: selected || [] });
  } catch (error) {
    console.error("GET /api/quiz/daily error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  try {
  // Daily submit is handled by /api/quiz/submit with mode="daily"
  // This endpoint just checks status
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_challenges")
    .select("last_completed_date")
    .eq("user_id", session.user.id)
    .single();

  return NextResponse.json({ completed: data?.last_completed_date === today });
  } catch (error) {
    console.error("POST /api/quiz/daily error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
