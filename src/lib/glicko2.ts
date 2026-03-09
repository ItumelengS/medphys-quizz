/**
 * Glicko-2 rating system adapted for single-player quiz performance.
 * Reference: http://www.glicko.net/glicko/glicko2.pdf
 *
 * Since games are not head-to-head, we use synthetic opponent ratings
 * derived from quiz performance (score/total, points, etc.).
 */

const TAU = 0.5; // System constant (controls volatility change speed)
const GLICKO2_SCALE = 173.7178; // Conversion factor between Glicko and Glicko-2 scales
const CONVERGENCE_TOLERANCE = 0.000001;
const DEFAULT_RATING = 1500;
const DEFAULT_RD = 350;
const DEFAULT_VOLATILITY = 0.06;
const MIN_RD = 30;
const MAX_RD = 350;

export interface GlickoRating {
  rating: number;
  rd: number;
  volatility: number;
}

export interface RatingUpdate {
  newRating: number;
  newRd: number;
  newVolatility: number;
  ratingDelta: number;
}

export const RATING_DEFAULTS: GlickoRating = {
  rating: DEFAULT_RATING,
  rd: DEFAULT_RD,
  volatility: DEFAULT_VOLATILITY,
};

/** Convert from Glicko scale to Glicko-2 internal scale */
function toGlicko2(rating: number, rd: number): { mu: number; phi: number } {
  return {
    mu: (rating - DEFAULT_RATING) / GLICKO2_SCALE,
    phi: rd / GLICKO2_SCALE,
  };
}

/** Convert from Glicko-2 internal scale back to Glicko scale */
function fromGlicko2(mu: number, phi: number): { rating: number; rd: number } {
  return {
    rating: mu * GLICKO2_SCALE + DEFAULT_RATING,
    rd: phi * GLICKO2_SCALE,
  };
}

/** Glicko-2 g(phi) function */
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

/** Glicko-2 E (expected score) function */
function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * Update a player's rating after a game.
 *
 * @param player Current player rating
 * @param opponentRating Opponent (or synthetic opponent) rating
 * @param opponentRd Opponent rating deviation
 * @param outcome Match outcome: 0.0 = loss, 0.5 = draw, 1.0 = win
 */
export function updateRating(
  player: GlickoRating,
  opponentRating: number,
  opponentRd: number,
  outcome: number
): RatingUpdate {
  // Clamp outcome to [0, 1]
  outcome = Math.max(0, Math.min(1, outcome));

  // Step 1: Convert to Glicko-2 scale
  const { mu, phi } = toGlicko2(player.rating, player.rd);
  const opponent = toGlicko2(opponentRating, opponentRd);
  const sigma = player.volatility;

  // Step 2: Compute variance (v)
  const gPhiJ = g(opponent.phi);
  const eVal = E(mu, opponent.mu, opponent.phi);
  const v = 1 / (gPhiJ * gPhiJ * eVal * (1 - eVal));

  // Step 3: Compute delta (estimated improvement)
  const delta = v * gPhiJ * (outcome - eVal);

  // Step 4: Determine new volatility (sigma')
  const a = Math.log(sigma * sigma);
  const phiSq = phi * phi;

  function f(x: number): number {
    const ex = Math.exp(x);
    const num1 = ex * (delta * delta - phiSq - v - ex);
    const den1 = 2 * (phiSq + v + ex) * (phiSq + v + ex);
    return num1 / den1 - (x - a) / (TAU * TAU);
  }

  // Illinois algorithm to find sigma'
  let A = a;
  let B: number;
  if (delta * delta > phiSq + v) {
    B = Math.log(delta * delta - phiSq - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  let iterations = 0;

  while (Math.abs(B - A) > CONVERGENCE_TOLERANCE && iterations < 100) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
    iterations++;
  }

  const newSigma = Math.exp(A / 2);

  // Step 5: Update rating deviation
  const phiStar = Math.sqrt(phiSq + newSigma * newSigma);

  // Step 6: Compute new phi and mu
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * gPhiJ * (outcome - eVal);

  // Convert back to Glicko scale
  const result = fromGlicko2(newMu, newPhi);

  return {
    newRating: Math.round(result.rating),
    newRd: Math.max(MIN_RD, Math.min(MAX_RD, Math.round(result.rd * 10) / 10)),
    newVolatility: Math.round(newSigma * 1000000) / 1000000,
    ratingDelta: Math.round(result.rating) - Math.round(player.rating),
  };
}

/**
 * Apply RD decay for inactive periods.
 * RD increases over time to reflect growing uncertainty.
 */
export function applyRdDecay(
  currentRd: number,
  volatility: number,
  lastPlayed: Date,
  now: Date = new Date()
): number {
  const daysSince = Math.max(0, (now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince < 1) return currentRd;

  // Each inactive day increases RD slightly
  const phi = currentRd / GLICKO2_SCALE;
  const sigma = volatility;
  const newPhi = Math.sqrt(phi * phi + daysSince * sigma * sigma);
  const newRd = newPhi * GLICKO2_SCALE;

  return Math.min(MAX_RD, Math.round(newRd * 10) / 10);
}

/**
 * Calculate synthetic opponent rating for solo (non-tournament) games.
 * Performance maps to opponent difficulty — scoring well = beating a tough opponent.
 */
export function getSoloOpponentRating(
  variant: string,
  score: number,
  total: number,
  points: number,
): { rating: number; rd: number } {
  let performance: number;

  switch (variant) {
    case "sudden-death":
      // Surviving longer = better performance (expected ~10-15 correct)
      performance = Math.min(1, score / 20);
      break;
    case "sprint":
      // Sprint: getting 30+ correct in time is good
      performance = Math.min(1, score / 40);
      break;
    case "wordle":
      // Solved = good, fewer guesses = better (score is 0 or 1)
      performance = score > 0 ? 0.7 : 0.2;
      break;
    case "connections":
      // 4 groups found = win
      performance = score / 4;
      break;
    case "hot-seat":
      // Points range from 0 to 1,000,000
      performance = Math.min(1, points / 500000);
      break;
    default:
      // Standard quiz variants: blitz, rapid, crossword, match, cryptic
      performance = total > 0 ? score / total : 0.5;
      break;
  }

  // Map performance [0, 1] to opponent rating [1100, 1900]
  // Good performance → you beat a strong opponent
  // Poor performance → you lost to a weak opponent
  const opponentRating = 1100 + performance * 800;

  return {
    rating: Math.round(opponentRating),
    rd: 250, // High uncertainty for synthetic opponents
  };
}

/**
 * Calculate performance outcome for tournament rounds.
 * Compares player's round performance against the field.
 */
export function getTournamentOutcome(
  score: number,
  total: number,
  points: number,
  variant: string,
): number {
  // Similar logic to solo but returns outcome [0, 1] for Glicko-2
  switch (variant) {
    case "wordle":
      return score > 0 ? 0.8 : 0.15;
    case "connections":
      return score >= 4 ? 0.85 : score / 4 * 0.6;
    case "sudden-death":
      return Math.min(1, score / 20);
    case "sprint":
      return Math.min(1, score / 40);
    case "hot-seat":
      return Math.min(1, points / 500000);
    default:
      return total > 0 ? score / total : 0.3;
  }
}

/**
 * Map tournament type to base game variant for rating purposes.
 */
export function tournamentTypeToVariant(type: string): string {
  if (type.startsWith("crossword-")) return "crossword";
  if (type.startsWith("sudden-death-")) return "sudden-death";
  if (type.startsWith("sprint-")) return "sprint";
  if (type.startsWith("match-")) return "match";
  if (type.startsWith("hot-seat-")) return "hot-seat";
  if (type.startsWith("wordle-")) return "wordle";
  if (type.startsWith("connections-")) return "connections";
  if (type.startsWith("cryptic-")) return "cryptic";
  // blitz, rapid, marathon → all standard quiz
  return "blitz";
}

/** Whether a rating is provisional (< 10 games) */
export function isProvisional(gamesCount: number): boolean {
  return gamesCount < 10;
}
