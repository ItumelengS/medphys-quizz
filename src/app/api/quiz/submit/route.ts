import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { calculateXp, calculateXpWithPenalty } from "@/lib/scoring";
import { applyXpChange } from "@/lib/apply-xp";
import { updateQuestionRecord, createQuestionRecord } from "@/lib/spaced-repetition";
import { parseInventory, awardPowerUp } from "@/lib/powerups";

interface AnswerPayload {
  questionId: string;
  correct: boolean;
  timeRemaining: number;
  pointsEarned: number;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const {
    answers,
    score,
    total,
    points,
    bestStreak,
    section,
    sectionName,
    mode,
  } = body as {
    answers: AnswerPayload[];
    score: number;
    total: number;
    points: number;
    bestStreak: number;
    section: string;
    sectionName: string;
    mode: "speed" | "daily" | "review";
  };

  const supabase = createServiceClient();

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

  // 2. Get current stats for daily streak calculation
  const { data: stats } = await supabase
    .from("user_stats")
    .select("daily_streak, last_daily_date")
    .eq("user_id", userId)
    .single();

  let dailyStreak = stats?.daily_streak || 0;
  const isDailyMode = mode === "daily";

  if (isDailyMode) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const wasYesterday = stats?.last_daily_date === yesterdayStr;
    dailyStreak = wasYesterday ? dailyStreak + 1 : 1;

    // Update daily_challenges
    await supabase.from("daily_challenges").upsert({
      user_id: userId,
      last_completed_date: new Date().toISOString().split("T")[0],
      last_score: score,
    });
  }

  // 3. Calculate XP (with 70% penalty rule)
  const xpResult = calculateXp(points, mode, score, total, dailyStreak);
  const { xpChange, penalized } = calculateXpWithPenalty(score, total, xpResult.totalXp);

  // 4. Apply XP change (handles penalty + level demotion)
  const { newXp, demoted, newConfirmedLevel } = await applyXpChange(userId, xpChange);

  // 5. Update user stats
  await supabase.rpc("update_user_stats_after_quiz", {
    p_user_id: userId,
    p_answered: total,
    p_correct: score,
    p_best_streak: bestStreak,
    p_best_score: mode === "speed" ? score : null,
    p_is_daily: isDailyMode,
    p_daily_streak: isDailyMode ? dailyStreak : null,
  });

  // 6. Add leaderboard entry
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

  // 7. Award power-ups
  const awardedPowerUps: string[] = [];
  let currentInventory = parseInventory(profile?.powerups);

  // Get current games_played count to check "every 5 quizzes"
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

  // Perfect score bonus power-up
  if (score === total && total > 0) {
    const result = awardPowerUp(currentInventory);
    if (result.awarded) {
      currentInventory = result.updated;
      awardedPowerUps.push(result.awarded);
    }
  }

  // Daily streak milestones (3, 7, 14)
  if (isDailyMode && [3, 7, 14].includes(dailyStreak)) {
    const result = awardPowerUp(currentInventory);
    if (result.awarded) {
      currentInventory = result.updated;
      awardedPowerUps.push(result.awarded);
    }
  }

  // Update powerups in profile if any were awarded
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
    dailyStreak,
    awardedPowerUps,
  });
}
