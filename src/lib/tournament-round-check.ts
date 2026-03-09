import { SupabaseClient } from "@supabase/supabase-js";
import { TOURNAMENT_TYPES } from "./tournaments";

interface RoundCheckResult {
  allowed: boolean;
  error?: string;
  tiebreakerRound?: boolean;
}

/**
 * Pre-check whether a player can play another round.
 * Called early in API routes before expensive question fetching.
 * The RPC remains the authoritative enforcer.
 *
 * Respects per-type maxRounds config (default 2).
 * Single-round modes (wordle, connections) have maxRounds=1 with no tiebreaker.
 */
export async function checkRoundLimit(
  supabase: SupabaseClient,
  tournamentId: string,
  userId: string,
  tournamentType?: string
): Promise<RoundCheckResult> {
  const config = tournamentType ? TOURNAMENT_TYPES[tournamentType] : null;
  const maxRounds = config?.maxRounds ?? 2;

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

  // Hard cap (maxRounds + 1 for tiebreaker possibility)
  if (rounds_played >= maxRounds + 1) {
    return { allowed: false, error: `Round limit reached: maximum ${maxRounds} rounds played` };
  }

  // Under normal limit
  if (rounds_played < maxRounds) {
    return { allowed: true };
  }

  // Single-round modes: no tiebreaker
  if (maxRounds === 1) {
    return { allowed: false, error: "This tournament allows only 1 round per player" };
  }

  // At maxRounds — check tiebreaker eligibility (top 3 distinct point values)
  const { data: participants } = await supabase
    .from("tournament_participants")
    .select("total_points")
    .eq("tournament_id", tournamentId)
    .order("total_points", { ascending: false });

  if (!participants || participants.length === 0) {
    return { allowed: false, error: `Round limit reached: you have played ${maxRounds} rounds` };
  }

  const distinctPoints = [...new Set(participants.map((p: { total_points: number }) => p.total_points))].sort((a, b) => b - a);
  const podiumCutoff = distinctPoints[Math.min(2, distinctPoints.length - 1)];

  if (total_points >= podiumCutoff) {
    return { allowed: true, tiebreakerRound: true };
  }

  return { allowed: false, error: `Round limit reached: you have played ${maxRounds} rounds` };
}
