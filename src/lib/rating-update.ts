import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RATING_DEFAULTS,
  updateRating,
  applyRdDecay,
  getSoloOpponentRating,
  getTournamentOutcome,
  tournamentTypeToVariant,
} from "./glicko2";

export interface VariantRatingResult {
  variant: string;
  newRating: number;
  ratingDelta: number;
  newRd: number;
  peakRating: number;
  gamesCount: number;
  provisional: boolean;
}

/**
 * Update a player's variant rating after a solo game.
 */
export async function updateSoloRating(
  supabase: SupabaseClient,
  userId: string,
  variant: string,
  score: number,
  total: number,
  points: number,
): Promise<VariantRatingResult> {
  const opponent = getSoloOpponentRating(variant, score, total, points);
  const outcome = total > 0 ? score / total : 0.3;

  return applyRatingUpdate(supabase, userId, variant, opponent.rating, opponent.rd, outcome);
}

/**
 * Update a player's variant rating after a tournament round.
 */
export async function updateTournamentRating(
  supabase: SupabaseClient,
  userId: string,
  tournamentType: string,
  tournamentId: string,
  score: number,
  total: number,
  points: number,
): Promise<VariantRatingResult> {
  const variant = tournamentTypeToVariant(tournamentType);

  // Get field average rating for this variant from tournament participants
  const { data: participants } = await supabase
    .from("tournament_participants")
    .select("user_id")
    .eq("tournament_id", tournamentId);

  const participantIds = (participants || [])
    .map((p) => p.user_id)
    .filter((id) => id !== userId);

  let opponentRating = 1500;
  let opponentRd = 250;

  if (participantIds.length > 0) {
    const { data: ratings } = await supabase
      .from("variant_ratings")
      .select("rating, rd")
      .eq("variant", variant)
      .in("user_id", participantIds);

    if (ratings && ratings.length > 0) {
      opponentRating = Math.round(
        ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      );
      opponentRd = Math.round(
        ratings.reduce((sum, r) => sum + r.rd, 0) / ratings.length
      );
    }
  }

  const outcome = getTournamentOutcome(score, total, points, variant);

  return applyRatingUpdate(supabase, userId, variant, opponentRating, opponentRd, outcome);
}

/**
 * Core rating update logic: fetch current rating, apply Glicko-2, persist.
 */
async function applyRatingUpdate(
  supabase: SupabaseClient,
  userId: string,
  variant: string,
  opponentRating: number,
  opponentRd: number,
  outcome: number,
): Promise<VariantRatingResult> {
  // 1. Fetch current rating (or use defaults)
  const { data: existing } = await supabase
    .from("variant_ratings")
    .select("rating, rd, volatility, peak_rating, games_count, last_played")
    .eq("user_id", userId)
    .eq("variant", variant)
    .single();

  const current = existing
    ? {
        rating: existing.rating,
        rd: existing.rd,
        volatility: existing.volatility,
      }
    : { ...RATING_DEFAULTS };

  const gamesCount = (existing?.games_count || 0) + 1;
  const peakSoFar = existing?.peak_rating || RATING_DEFAULTS.rating;

  // 2. Apply RD decay if inactive
  if (existing?.last_played) {
    current.rd = applyRdDecay(
      current.rd,
      current.volatility,
      new Date(existing.last_played)
    );
  }

  // 3. Run Glicko-2 update
  const update = updateRating(current, opponentRating, opponentRd, outcome);

  // 4. Track peak
  const newPeak = Math.max(peakSoFar, update.newRating);

  // 5. Upsert variant_ratings
  await supabase.from("variant_ratings").upsert({
    user_id: userId,
    variant,
    rating: update.newRating,
    rd: update.newRd,
    volatility: update.newVolatility,
    peak_rating: newPeak,
    games_count: gamesCount,
    last_played: new Date().toISOString(),
  });

  // 6. Insert history point
  await supabase.from("rating_history").insert({
    user_id: userId,
    variant,
    rating: update.newRating,
    rd: update.newRd,
  });

  return {
    variant,
    newRating: update.newRating,
    ratingDelta: update.ratingDelta,
    newRd: update.newRd,
    peakRating: newPeak,
    gamesCount,
    provisional: gamesCount < 10,
  };
}
