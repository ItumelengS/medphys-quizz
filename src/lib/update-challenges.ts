import { SupabaseClient } from "@supabase/supabase-js";
import {
  generateWeeklyChallenges,
  getWeekStart,
  evaluateChallengeProgress,
} from "@/lib/challenges";
import { applyXpChange } from "@/lib/apply-xp";
import { CAREER_LEVELS } from "@/lib/scoring";

/**
 * Scale challenge bonus XP based on how close the player is to their next exam.
 * Far from exam → full reward. Close to exam → reduced reward (min 25%).
 */
function scaleChallengeXp(baseXp: number, userXp: number, confirmedLevel: number): number {
  const currentFloor = CAREER_LEVELS.find((l) => l.level === confirmedLevel)?.xpRequired || 0;
  const nextLevel = CAREER_LEVELS.find((l) => l.level === confirmedLevel + 1);
  if (!nextLevel) return baseXp; // max level, full reward

  const levelGap = nextLevel.xpRequired - currentFloor;
  if (levelGap <= 0) return baseXp;

  const progress = (userXp - currentFloor) / levelGap; // 0.0 → 1.0
  // Scale: 100% reward at 0% progress → 25% reward at 100% progress
  const scale = Math.max(0.25, 1 - progress * 0.75);
  return Math.max(1, Math.floor(baseXp * scale));
}

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

  // Fetch user profile for XP scaling
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, confirmed_level")
    .eq("id", userId)
    .single();
  const userXp = profile?.xp || 0;
  const confirmedLevel = profile?.confirmed_level || 1;

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

    // Award bonus XP if newly completed (scaled by proximity to exam)
    if (nowCompleted && !alreadyCompleted) {
      const scaledXp = scaleChallengeXp(challenge.bonus_xp, userXp, confirmedLevel);
      await applyXpChange(userId, scaledXp);
      bonusXp += scaledXp;
      completedChallengeIds.push(challenge.id);
    }
  }

  return { bonusXp, completedChallengeIds };
}
