import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

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

export async function GET() {
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

  // Get all questions and deterministically pick 10
  const { data: allQuestions } = await supabase
    .from("questions")
    .select("*")
    .order("id");

  if (!allQuestions?.length) {
    return NextResponse.json({ error: "No questions" }, { status: 500 });
  }

  const seed = dateToSeed(today);
  const shuffled = seededShuffle(allQuestions, seed);
  const selected = shuffled.slice(0, 10);

  return NextResponse.json({ locked: false, questions: selected });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
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
}
