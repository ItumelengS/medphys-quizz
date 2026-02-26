import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { calculateXp } from "@/lib/scoring";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import { updateQuestionRecord, createQuestionRecord } from "@/lib/spaced-repetition";

interface RoundPayload {
  berserk: boolean;
  answers: {
    questionId: string;
    selectedAnswer: string | null;
    timeRemaining: number;
  }[];
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
  const body = (await req.json()) as RoundPayload;
  const { berserk, answers } = body;

  const supabase = createServiceClient();

  // Verify tournament is active
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

  // Fetch correct answers from DB to validate server-side
  const questionIds = answers.map((a) => a.questionId);
  const { data: dbQuestions } = await supabase
    .from("questions")
    .select("id, answer, explanation")
    .in("id", questionIds);

  if (!dbQuestions) {
    return NextResponse.json({ error: "Failed to verify answers" }, { status: 500 });
  }

  const answerMap = new Map(dbQuestions.map((q) => [q.id, q]));

  // Get timer config to cap timeRemaining
  const config = TOURNAMENT_TYPES[tournament.type];
  const maxTimer = berserk
    ? Math.ceil((config?.timerSeconds || 15) / 2)
    : (config?.timerSeconds || 15);

  // Anti-cheat: minimum time to read and answer a question (seconds).
  // A human needs at least ~1.5s to read + click. Answers faster than this
  // get zero time bonus (suspicious). For prize tournaments this threshold
  // could be raised or the round rejected entirely.
  const MIN_HUMAN_ANSWER_TIME = 1.5;

  // Validate each answer server-side
  let score = 0;
  let timeBonus = 0;
  let suspiciousCount = 0;
  const validatedAnswers: { questionId: string; correct: boolean; timeRemaining: number }[] = [];

  for (const ans of answers) {
    const dbQ = answerMap.get(ans.questionId);
    if (!dbQ) continue;

    const correct = ans.selectedAnswer !== null && ans.selectedAnswer === dbQ.answer;
    // Clamp timeRemaining to valid range — can't exceed the timer
    const clampedTime = Math.max(0, Math.min(ans.timeRemaining, maxTimer));

    // How long did they take? If they answered suspiciously fast, zero the time bonus
    const elapsed = maxTimer - clampedTime;
    const isSuspicious = ans.selectedAnswer !== null && elapsed < MIN_HUMAN_ANSWER_TIME;
    if (isSuspicious) suspiciousCount++;

    if (correct) {
      score++;
      // Suspicious answers get no time bonus — you can't read and answer in <1.5s
      if (!isSuspicious) {
        timeBonus += Math.floor(clampedTime) * 10;
      }
    }

    validatedAnswers.push({
      questionId: ans.questionId,
      correct,
      timeRemaining: clampedTime,
    });
  }

  // If majority of answers are suspiciously fast, zero ALL time bonus (likely a bot)
  if (suspiciousCount > validatedAnswers.length / 2) {
    timeBonus = 0;
  }

  const total = validatedAnswers.length;

  // Submit round via RPC with server-computed values
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
  const xpResult = calculateXp(pointsEarned, "speed", score, total, 0);

  await supabase.rpc("increment_xp", {
    p_user_id: userId,
    p_amount: xpResult.totalXp,
  });

  // Return result + explanations (safe now — round is over)
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
    xp: xpResult,
    explanations,
  });
}
