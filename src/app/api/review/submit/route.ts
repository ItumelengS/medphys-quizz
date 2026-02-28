import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { calculateXp, calculateXpWithPenalty } from "@/lib/scoring";
import { applyXpChange } from "@/lib/apply-xp";
import { updateQuestionRecord, createQuestionRecord } from "@/lib/spaced-repetition";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { answers, score, total } = body as {
    answers: { questionId: string; correct: boolean }[];
    score: number;
    total: number;
  };

  const supabase = createServiceClient();

  // Update question_history
  for (const ans of answers) {
    const { data: existing } = await supabase
      .from("question_history")
      .select("*")
      .eq("user_id", userId)
      .eq("question_id", ans.questionId)
      .single();

    const record = existing
      ? {
          questionId: existing.question_id,
          timesShown: existing.times_shown,
          timesCorrect: existing.times_correct,
          lastShown: existing.last_shown,
          nextDue: existing.next_due,
          easeFactor: existing.ease_factor,
          interval: existing.interval,
          streak: existing.streak,
        }
      : createQuestionRecord(ans.questionId);

    const updated = updateQuestionRecord(record, ans.correct);

    await supabase.from("question_history").upsert({
      user_id: userId,
      question_id: ans.questionId,
      times_shown: updated.timesShown,
      times_correct: updated.timesCorrect,
      ease_factor: updated.easeFactor,
      interval: updated.interval,
      next_due: updated.nextDue,
      streak: updated.streak,
      last_shown: updated.lastShown,
    });
  }

  // Get daily streak for XP calc
  const { data: stats } = await supabase
    .from("user_stats")
    .select("daily_streak")
    .eq("user_id", userId)
    .single();

  const xpResult = calculateXp(0, "review", score, total, stats?.daily_streak || 0);
  const { xpChange, penalized } = calculateXpWithPenalty(score, total, xpResult.totalXp);

  // Apply XP change (handles penalty + level demotion)
  const { newXp, demoted, newConfirmedLevel } = await applyXpChange(userId, xpChange);

  // Update stats
  await supabase.rpc("update_user_stats_after_quiz", {
    p_user_id: userId,
    p_answered: total,
    p_correct: score,
    p_best_streak: 0,
  });

  return NextResponse.json({
    xp: xpResult,
    xpChange,
    penalized,
    demoted,
    newConfirmedLevel,
    newTotalXp: newXp,
  });
}
