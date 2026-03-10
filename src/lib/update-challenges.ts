import { SupabaseClient } from "@supabase/supabase-js";
import {
  generateWeeklyChallenges,
  getWeekStart,
  evaluateChallengeProgress,
} from "@/lib/challenges";
import { applyXpChange } from "@/lib/apply-xp";

/**
 * After a game completes, check and update all weekly challenge progress.
 * Awards bonus XP if any challenge is newly completed.
 * Returns total bonus XP awarded (0 if none).
 */
export async function updateWeeklyChallengeProgress(
  supabase: SupabaseClient,
  userId: string,
  gameResult: {
    variant?: string;
    score: number;
    total: number;
    points: number;
    bestStreak: number;
    section: string;
  }
): Promise<{ bonusXp: number; completedChallengeIds: string[] }> {
  const weekStart = getWeekStart();
  const challenges = generateWeeklyChallenges(weekStart);

  let bonusXp = 0;
  const completedChallengeIds: string[] = [];

  for (const challenge of challenges) {
    // Fetch or init progress row
    const { data: existing } = await supabase
      .from("weekly_challenge_progress")
      .select("current_value, completed, xp_awarded")
      .eq("user_id", userId)
      .eq("challenge_id", challenge.id)
      .eq("week_start", weekStart)
      .single();

    const currentValue = existing?.current_value ?? 0;
    const alreadyCompleted = existing?.completed ?? false;
    const alreadyAwarded = existing?.xp_awarded ?? false;

    // Skip if already completed and awarded
    if (alreadyCompleted && alreadyAwarded) continue;

    // Evaluate new progress
    const newValue = evaluateChallengeProgress(
      challenge,
      currentValue,
      gameResult
    );

    const nowCompleted = newValue >= challenge.target_value;

    // Upsert progress
    await supabase.from("weekly_challenge_progress").upsert({
      user_id: userId,
      challenge_id: challenge.id,
      week_start: weekStart,
      current_value: newValue,
      completed: nowCompleted,
      xp_awarded: nowCompleted ? true : alreadyAwarded,
    });

    // Award bonus XP if newly completed
    if (nowCompleted && !alreadyCompleted) {
      await applyXpChange(userId, challenge.bonus_xp);
      bonusXp += challenge.bonus_xp;
      completedChallengeIds.push(challenge.id);
    }
  }

  return { bonusXp, completedChallengeIds };
}
