import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { calculateXp } from "@/lib/scoring";
import { updateQuestionRecord, createQuestionRecord } from "@/lib/spaced-repetition";

interface SprintPayload {
  berserk: boolean;
  answers: {
    questionId: string;
    selectedAnswer: string | null;
    timeRemaining: number;
  }[];
  totalTimeUsed: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = (await req.json()) as SprintPayload;
  const { berserk, answers, totalTimeUsed } = body;

  const supabase = createServiceClient();

  // Verify tournament is active and is a sprint type
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, type, status, ends_at")
    .eq("id", id)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.status === "finished" || new Date(tournament.ends_at) < new Date()) {
    return NextResponse.json({ error: "Tournament has ended" }, { status: 400 });
  }

  if (!tournament.type.startsWith("sprint-")) {
    return NextResponse.json({ error: "Not a sprint tournament" }, { status: 400 });
  }

  // Fetch correct answers from DB
  const questionIds = answers.map((a) => a.questionId);
  const { data: dbQuestions } = await supabase
    .from("questions")
    .select("id, answer, explanation")
    .in("id", questionIds);

  if (!dbQuestions) {
    return NextResponse.json({ error: "Failed to verify answers" }, { status: 500 });
  }

  const answerMap = new Map(dbQuestions.map((q) => [q.id, q]));

  // Sprint: 60s base, berserk halves to 30s
  const baseClock = 60;
  const maxClock = berserk ? Math.ceil(baseClock / 2) : baseClock;

  const MIN_HUMAN_ANSWER_TIME = 1.0; // Sprint is faster-paced

  // Validate each answer server-side
  let score = 0;
  let suspiciousCount = 0;
  const validatedAnswers: { questionId: string; correct: boolean; timeRemaining: number }[] = [];

  for (const ans of answers) {
    const dbQ = answerMap.get(ans.questionId);
    if (!dbQ) continue;

    const correct = ans.selectedAnswer !== null && ans.selectedAnswer === dbQ.answer;

    // In sprint, timeRemaining is the global clock remaining at answer time
    const clampedTime = Math.max(0, Math.min(ans.timeRemaining, maxClock));

    // Suspicious: answered too quickly (check gap between consecutive answers)
    const isSuspicious = ans.selectedAnswer !== null && clampedTime > maxClock - MIN_HUMAN_ANSWER_TIME && validatedAnswers.length === 0;
    if (isSuspicious) suspiciousCount++;

    if (correct) {
      score++;
    }

    validatedAnswers.push({
      questionId: ans.questionId,
      correct,
      timeRemaining: clampedTime,
    });
  }

  const total = validatedAnswers.length;

  // Time bonus: remaining seconds from the sprint clock
  const clampedTimeUsed = Math.max(0, Math.min(totalTimeUsed, maxClock));
  const remainingTime = maxClock - clampedTimeUsed;
  let timeBonus = Math.floor(remainingTime) * 5;

  if (suspiciousCount > validatedAnswers.length / 2) {
    timeBonus = 0;
  }

  // Submit round via RPC
  const { data: result, error } = await supabase.rpc("submit_tournament_round", {
    p_tournament_id: id,
    p_user_id: userId,
    p_score: score,
    p_total: total,
    p_time_bonus: timeBonus,
    p_berserk: berserk,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update question_history
  for (const ans of validatedAnswers) {
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

  // Award XP
  const pointsEarned = result?.points_earned || 0;
  const xpResult = calculateXp(pointsEarned, "sprint", score, total, 0);

  await supabase.rpc("increment_xp", {
    p_user_id: userId,
    p_amount: xpResult.totalXp,
  });

  // Return result + explanations
  const explanations: Record<string, { correct: boolean; answer: string; explanation: string }> = {};
  for (const ans of validatedAnswers) {
    const dbQ = answerMap.get(ans.questionId);
    if (dbQ) {
      explanations[ans.questionId] = {
        correct: ans.correct,
        answer: dbQ.answer,
        explanation: dbQ.explanation,
      };
    }
  }

  return NextResponse.json({
    ...result,
    score,
    total,
    accuracy: total > 0 ? Math.round((score / total) * 100) : 0,
    xp: xpResult,
    explanations,
  });
}
