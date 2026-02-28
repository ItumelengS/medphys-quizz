import { createServiceClient } from "@/lib/supabase/server";
import { getCorrectConfirmedLevel } from "@/lib/scoring";

/**
 * Apply an XP change (positive or negative) to a user's profile.
 * Handles:
 *  - Ensuring XP never goes below 0
 *  - Demoting confirmed_level if XP drops below threshold
 *
 * Returns the new XP total and whether a demotion occurred.
 */
export async function applyXpChange(
  userId: string,
  xpChange: number
): Promise<{ newXp: number; demoted: boolean; newConfirmedLevel: number }> {
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, confirmed_level")
    .eq("id", userId)
    .single();

  const currentXp = profile?.xp ?? 0;
  const currentConfirmedLevel = profile?.confirmed_level ?? 1;

  const newXp = Math.max(0, currentXp + xpChange);
  const newConfirmedLevel = getCorrectConfirmedLevel(newXp, currentConfirmedLevel);
  const demoted = newConfirmedLevel < currentConfirmedLevel;

  const updates: Record<string, number> = { xp: newXp };
  if (demoted) {
    updates.confirmed_level = newConfirmedLevel;
  }

  await supabase.from("profiles").update(updates).eq("id", userId);

  return { newXp, demoted, newConfirmedLevel };
}
