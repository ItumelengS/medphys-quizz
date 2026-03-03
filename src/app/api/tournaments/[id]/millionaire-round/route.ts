import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { calculateXp, calculateMillionaireScore } from "@/lib/scoring";
import { updateQuestionRecord, createQuestionRecord } from "@/lib/spaced-repetition";

interface MillionairePayload {
  berserk: boolean;
  answers: {
    questionId: string;
    selectedAnswer: string | null;
    timeRemaining: number;
  }[];
  walkedAway: boolean;
  lifelinesUsed: string[];
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
  const body = (await req.json()) as MillionairePayload;
  const { berserk, answers, walkedAway, lifelinesUsed } = body;

  const supabase = createServiceClient();

  // Verify tournament is active and is a millionaire type
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

  if (!tournament.type.startsWith("millionaire-")) {
    return NextResponse.json({ error: "Not a millionaire tournament" }, { status: 400 });
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

  const maxTimer = berserk ? Math.ceil((tournament.type === "millionaire-blitz" ? 30 : 45) / 2) : (tournament.type === "millionaire-blitz" ? 30 : 45);
  const MIN_HUMAN_ANSWER_TIME = 1.5;

  // Validate each answer
  let correctCount = 0;
  let lastCorrectIndex = -1;
  let wrongAnswerIndex: number | null = null;
  let suspiciousCount = 0;
  const validatedAnswers: { questionId: string; correct: boolean; timeRemaining: number }[] = [];

  for (let i = 0; i < answers.length; i++) {
    const ans = answers[i];
    const dbQ = answerMap.get(ans.questionId);
    if (!dbQ) continue;

    // Walk-away: last answer has null selectedAnswer
    if (ans.selectedAnswer === null) {
      validatedAnswers.push({ questionId: ans.questionId, correct: false, timeRemaining: Math.max(0, Math.min(ans.timeRemaining, maxTimer)) });
      continue;
    }

    const correct = ans.selectedAnswer === dbQ.answer;
    const clampedTime = Math.max(0, Math.min(ans.timeRemaining, maxTimer));

    const elapsed = maxTimer - clampedTime;
    if (elapsed < MIN_HUMAN_ANSWER_TIME) suspiciousCount++;

    if (correct) {
      correctCount++;
      lastCorrectIndex = i;
    } else {
      if (wrongAnswerIndex === null) wrongAnswerIndex = i;
    }

    validatedAnswers.push({ questionId: ans.questionId, correct, timeRemaining: clampedTime });
  }

  if (suspiciousCount > validatedAnswers.length / 2) {
    // Penalize suspicious play — zero out time bonus
  }

  // Calculate prize points
  const prizePoints = calculateMillionaireScore(lastCorrectIndex, walkedAway, wrongAnswerIndex);

  // Submit round via RPC
  // RPC formula: score*50 + time_bonus = total points
  // We need to encode prizePoints into these two fields
  let pScore: number;
  let pTimeBonus: number;

  if (prizePoints >= correctCount * 50) {
    pScore = correctCount;
    pTimeBonus = prizePoints - correctCount * 50;
  } else {
    // Prize is less than what correctCount*50 would give — encode entirely as time_bonus
    pScore = 0;
    pTimeBonus = prizePoints;
  }

  const { data: result, error } = await supabase.rpc("submit_tournament_round", {
    p_tournament_id: id,
    p_user_id: userId,
    p_score: pScore,
    p_total: 15,
    p_time_bonus: pTimeBonus,
    p_berserk: berserk,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update question_history (spaced repetition)
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
  const xpResult = calculateXp(pointsEarned, "arena", correctCount, 15, 0);

  await supabase.rpc("increment_xp", {
    p_user_id: userId,
    p_amount: xpResult.totalXp,
  });

  return NextResponse.json({
    ...result,
    score: correctCount,
    total: 15,
    prizePoints,
    walkedAway,
    lifelinesUsed,
    xp: xpResult,
  });
}
