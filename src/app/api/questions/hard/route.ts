import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { auth } from "@/lib/auth";

/**
 * Returns questions the user historically struggles with.
 * Sorted by lowest accuracy (times_correct / times_shown).
 * Falls back to random unseen questions if no history.
 */
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10");
  const exclude = searchParams.get("exclude")?.split(",").filter(Boolean) || [];

  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    // Get questions with worst accuracy from question_history
    const { data: history } = await supabase
      .from("question_history")
      .select("question_id, times_shown, times_correct")
      .eq("user_id", userId)
      .gt("times_shown", 0)
      .order("ease_factor", { ascending: true });

    if (history && history.length > 0) {
      // Sort by accuracy ascending (worst first), then by most shown
      const sorted = history
        .map((h) => ({
          ...h,
          accuracy: h.times_correct / h.times_shown,
        }))
        .sort((a, b) => a.accuracy - b.accuracy || b.times_shown - a.times_shown);

      const hardIds = sorted
        .map((h) => h.question_id)
        .filter((id) => !exclude.includes(id))
        .slice(0, limit * 2); // fetch extra in case some are missing

      if (hardIds.length > 0) {
        const { data: questions } = await supabase
          .from("questions")
          .select("*")
          .in("id", hardIds);

        if (questions && questions.length > 0) {
          // Shuffle the hard questions so they're not always in the same order
          for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
          }
          return NextResponse.json(questions.slice(0, limit));
        }
      }
    }
  }

  // Fallback: random questions (for unauthenticated or no history)
  const { data: questions } = await supabase.from("questions").select("*");
  if (!questions) return NextResponse.json([]);

  // Exclude already-used questions
  let pool = questions.filter((q) => !exclude.includes(q.id));
  if (pool.length === 0) pool = questions;

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return NextResponse.json(pool.slice(0, limit));
}
