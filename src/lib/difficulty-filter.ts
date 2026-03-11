import { getCareerLevel } from "./scoring";

/**
 * Get the gameplay difficulty range for a user based on their XP/career level.
 * These are wider than exam ranges — meant to challenge without overwhelming.
 *
 * Intern (level 1):           1-5
 * Registrar (level 2):        2-6
 * Medical Physicist (level 3): 3-7
 * Senior Physicist (level 4):  4-8
 * Chief Physicist (level 5):   5-9
 * Consultant (level 6):        6-10
 * Professor (level 7):         7-10
 * Distinguished Prof (level 8): 7-10
 */
export function getGameplayDifficultyRange(xp: number): { min: number; max: number } {
  const level = getCareerLevel(xp).level;
  const min = Math.min(level, 7);
  const max = Math.min(level + 4, 10);
  return { min, max };
}

/**
 * Apply difficulty-based filtering to a Supabase query using the user's XP.
 * Only applies if no explicit difficulty params were provided.
 */
export function applyDifficultyFilter<T>(query: T, xp: number): T {
  const { min, max } = getGameplayDifficultyRange(xp);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (query as any).gte("difficulty", min).lte("difficulty", max);
}
