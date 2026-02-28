import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { calculateXp, calculateXpWithPenalty } from "@/lib/scoring";
import { applyXpChange } from "@/lib/apply-xp";
import { updateQuestionRecord, createQuestionRecord } from "@/lib/spaced-repetition";
import { parseInventory, awardPowerUp } from "@/lib/powerups";
import type { GameVariant, GameMode } from "@/lib/types";

interface AnswerPayload {
  questionId: string;
  correct: boolean;
  timeRemaining: number;
  pointsEarned: number;
}

interface GameSubmission {
  variant: GameVariant;
  answers: AnswerPayload[];
  score: number;
  total: number;
  points: number;
  bestStreak: number;
  section: string;
  sectionName: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = (await req.json()) as GameSubmission;
  const { variant, answers, score, total, points, bestStreak, section, sectionName, durationSeconds, metadata } = body;

  if (!["sudden-death", "sprint", "crossword"].includes(variant)) {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const mode: GameMode = variant;

  // 1. Update question_history (spaced repetition)
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

  // 2. Calculate XP (with 70% penalty rule + ELO weighting)
  const xpResult = calculateXp(points, mode, score, total, 0);

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("confirmed_level")
    .eq("id", userId)
    .single();
  const confirmedLevel = userProfile?.confirmed_level ?? 1;

  const wrongIds = answers.filter((a) => !a.correct).map((a) => a.questionId);
  let wrongDifficulties: number[] = [];
  if (wrongIds.length > 0) {
    const { data: wrongQs } = await supabase
      .from("questions")
      .select("difficulty")
      .in("id", wrongIds);
    wrongDifficulties = (wrongQs || []).map((q) => q.difficulty);
  }

  const { xpChange, penalized } = calculateXpWithPenalty(
    score, total, xpResult.totalXp, confirmedLevel, wrongDifficulties
  );

  // 3. Apply XP change (handles penalty + level demotion)
  const { newXp, demoted, newConfirmedLevel } = await applyXpChange(userId, xpChange);

  // 4. Update user stats
  await supabase.rpc("update_user_stats_after_quiz", {
    p_user_id: userId,
    p_answered: total,
    p_correct: score,
    p_best_streak: bestStreak,
    p_best_score: score,
    p_is_daily: false,
    p_daily_streak: null,
  });

  // 5. Add leaderboard entry
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, xp, powerups")
    .eq("id", userId)
    .single();

  await supabase.from("leaderboard_entries").insert({
    user_id: userId,
    player_name: profile?.display_name || session.user.name || "Player",
    score,
    total,
    points,
    best_streak: bestStreak,
    section,
    section_name: sectionName,
    mode,
  });

  // 6. Record game result
  await supabase.from("game_results").insert({
    user_id: userId,
    variant,
    score,
    total,
    points,
    xp_earned: xpResult.totalXp,
    best_streak: bestStreak,
    duration_seconds: durationSeconds || null,
    metadata: metadata || {},
  });

  // 7. Award power-ups
  const awardedPowerUps: string[] = [];
  let currentInventory = parseInventory(profile?.powerups);

  const { data: currentStats } = await supabase
    .from("user_stats")
    .select("games_played")
    .eq("user_id", userId)
    .single();

  const gamesPlayed = currentStats?.games_played || 0;
  if (gamesPlayed > 0 && gamesPlayed % 5 === 0) {
    const result = awardPowerUp(currentInventory);
    if (result.awarded) {
      currentInventory = result.updated;
      awardedPowerUps.push(result.awarded);
    }
  }

  if (score === total && total > 0) {
    const result = awardPowerUp(currentInventory);
    if (result.awarded) {
      currentInventory = result.updated;
      awardedPowerUps.push(result.awarded);
    }
  }

  if (awardedPowerUps.length > 0) {
    await supabase
      .from("profiles")
      .update({ powerups: currentInventory })
      .eq("id", userId);
  }

  return NextResponse.json({
    xp: xpResult,
    xpChange,
    penalized,
    demoted,
    newConfirmedLevel,
    newTotalXp: newXp,
    awardedPowerUps,
  });
}
