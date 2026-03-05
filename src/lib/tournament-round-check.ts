import { SupabaseClient } from "@supabase/supabase-js";

interface RoundCheckResult {
  allowed: boolean;
  error?: string;
  tiebreakerRound?: boolean;
}

/**
 * Pre-check whether a player can play another round.
 * Called early in API routes before expensive question fetching.
 * The RPC remains the authoritative enforcer.
 */
export async function checkRoundLimit(
  supabase: SupabaseClient,
  tournamentId: string,
  userId: string
): Promise<RoundCheckResult> {
  const { data: participant } = await supabase
    .from("tournament_participants")
    .select("rounds_played, total_points")
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId)
    .single();

  // No participant record yet — first round, always allowed
  if (!participant) {
    return { allowed: true };
  }

  const { rounds_played, total_points } = participant;

  // Hard cap
  if (rounds_played >= 3) {
    return { allowed: false, error: "Round limit reached: maximum 3 rounds played" };
  }

  // Under normal limit
  if (rounds_played < 2) {
    return { allowed: true };
  }

  // At 2 rounds — check tiebreaker eligibility (top 3 distinct point values)
  const { data: participants } = await supabase
    .from("tournament_participants")
    .select("total_points")
    .eq("tournament_id", tournamentId)
    .order("total_points", { ascending: false });

  if (!participants || participants.length === 0) {
    return { allowed: false, error: "Round limit reached: you have played 2 rounds" };
  }

  const distinctPoints = [...new Set(participants.map((p: { total_points: number }) => p.total_points))].sort((a, b) => b - a);
  const podiumCutoff = distinctPoints[Math.min(2, distinctPoints.length - 1)];

  if (total_points >= podiumCutoff) {
    return { allowed: true, tiebreakerRound: true };
  }

  return { allowed: false, error: "Round limit reached: you have played 2 rounds" };
}
