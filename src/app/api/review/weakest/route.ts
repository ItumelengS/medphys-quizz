import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const userId = session.user.id;

    // Get question history entries with at least 2 attempts and accuracy below 50%
    const { data: weakHistory, error: histError } = await supabase
      .from("question_history")
      .select("question_id, times_shown, times_correct")
      .eq("user_id", userId)
      .gte("times_shown", 2);

    if (histError) {
      console.error("Weakest questions history error:", histError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    if (!weakHistory || weakHistory.length === 0) {
      return NextResponse.json([]);
    }

    // Filter for accuracy < 50% and sort by accuracy ascending (weakest first)
    const weak = weakHistory
      .map((h) => ({
        questionId: h.question_id,
        timesShown: h.times_shown,
        timesCorrect: h.times_correct,
        accuracy: h.times_shown > 0 ? h.times_correct / h.times_shown : 0,
      }))
      .filter((h) => h.accuracy < 0.5)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 20);

    if (weak.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch full question data for the weak questions
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .in("id", weak.map((w) => w.questionId));

    if (qError) {
      console.error("Weakest questions fetch error:", qError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Preserve sort order (weakest first) and attach accuracy info
    const questionMap = new Map((questions || []).map((q) => [q.id, q]));
    const result = weak
      .map((w) => {
        const q = questionMap.get(w.questionId);
        if (!q) return null;
        return {
          ...q,
          times_shown: w.timesShown,
          times_correct: w.timesCorrect,
          accuracy: Math.round(w.accuracy * 100),
        };
      })
      .filter(Boolean);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/review/weakest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
