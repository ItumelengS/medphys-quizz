import type { CareerLevel, GameMode } from "./types";

export const CAREER_LEVELS: CareerLevel[] = [
  { level: 1, title: "Intern", xpRequired: 0, icon: "🔬" },
  { level: 2, title: "Registrar", xpRequired: 1000, icon: "📖" },
  { level: 3, title: "Medical Physicist", xpRequired: 4000, icon: "⚛️" },
  { level: 4, title: "Senior Physicist", xpRequired: 10000, icon: "🎯" },
  { level: 5, title: "Chief Physicist", xpRequired: 25000, icon: "👨‍🔬" },
  { level: 6, title: "Consultant", xpRequired: 50000, icon: "🏅" },
  { level: 7, title: "Professor", xpRequired: 100000, icon: "🎓" },
];

export function getCareerLevel(xp: number): CareerLevel {
  for (let i = CAREER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= CAREER_LEVELS[i].xpRequired) return CAREER_LEVELS[i];
  }
  return CAREER_LEVELS[0];
}

export function getNextLevel(xp: number): CareerLevel | null {
  const current = getCareerLevel(xp);
  const next = CAREER_LEVELS.find((l) => l.level === current.level + 1);
  return next || null;
}

export function getXpProgress(xp: number): {
  current: CareerLevel;
  next: CareerLevel | null;
  progressPercent: number;
  xpToNext: number;
} {
  const current = getCareerLevel(xp);
  const next = getNextLevel(xp);
  if (!next) {
    return { current, next: null, progressPercent: 100, xpToNext: 0 };
  }
  const range = next.xpRequired - current.xpRequired;
  const progress = xp - current.xpRequired;
  return {
    current,
    next,
    progressPercent: Math.min(100, (progress / range) * 100),
    xpToNext: next.xpRequired - xp,
  };
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 5;
  if (streak >= 7) return 3;
  if (streak >= 3) return 2;
  return 1;
}

export function calculatePoints(
  correct: boolean,
  timeRemaining: number,
  streak: number
): number {
  if (!correct) return 0;
  const base = 10;
  const timeBonus = Math.floor(timeRemaining / 3);
  const multiplier = getStreakMultiplier(streak);
  return (base + timeBonus) * multiplier;
}

export function calculateXp(
  points: number,
  mode: GameMode,
  correct: number,
  total: number,
  dailyStreak: number
): {
  baseXp: number;
  bonusXp: number;
  dailyBonusXp: number;
  perfectBonusXp: number;
  totalXp: number;
} {
  let baseXp = 0;
  let bonusXp = 0;
  const dailyBonusXp = mode === "daily" ? dailyStreak * 15 : 0;
  const perfectBonusXp = correct === total && total > 0 && mode !== "arena" ? 50 : 0;

  if (mode === "arena") {
    baseXp = Math.floor(points * 0.40);
  } else if (mode === "review") {
    baseXp = correct * 8 + (total - correct) * 2;
  } else if (mode === "daily") {
    baseXp = Math.floor(points * 0.40);
  } else if (mode === "sudden-death") {
    baseXp = Math.floor(points * 0.30);
  } else if (mode === "sprint") {
    baseXp = Math.floor(points * 0.25);
  } else if (mode === "crossword") {
    baseXp = Math.floor(points * 0.25);
  } else if (mode === "match") {
    baseXp = Math.floor(points * 0.25);
  } else if (mode === "hot-seat") {
    // Hot-seat prizes are on a different scale (100 — 1,000,000)
    baseXp = Math.floor(points * 0.005);
  } else if (mode === "blitz") {
    baseXp = Math.floor(points * 0.30);
  } else if (mode === "wordle") {
    baseXp = Math.floor(points * 0.25);
  } else if (mode === "connections") {
    baseXp = Math.floor(points * 0.25);
  } else if (mode === "cryptic") {
    baseXp = Math.floor(points * 0.30);
  } else if (mode === "reaction-rounds") {
    baseXp = Math.floor(points * 0.30);
  } else {
    // speed / marathon
    baseXp = Math.floor(points * 0.25);
  }

  bonusXp = perfectBonusXp + dailyBonusXp;

  return {
    baseXp,
    bonusXp,
    dailyBonusXp,
    perfectBonusXp,
    totalXp: baseXp + bonusXp,
  };
}

// ── XP penalty system (HPCSA 70% rule + ELO-style weighting) ──

export const XP_PASS_THRESHOLD = 0.7; // 70% accuracy required

/**
 * Get the expected difficulty midpoint for a player's confirmed level.
 * Used to weight penalties: wrong on easy questions = bigger loss.
 */
export function getExpectedDifficulty(confirmedLevel: number): number {
  const range = getExamDifficultyRange(confirmedLevel);
  return (range.min + range.max) / 2;
}

/**
 * Below 70% accuracy: lose XP. Penalty is ELO-weighted by question difficulty.
 * - Wrong on easy questions (below your level) → bigger penalty
 * - Wrong on hard questions (above your level) → smaller penalty
 * Above 70%: gain XP normally.
 *
 * wrongDifficulties: difficulty values of each incorrectly answered question.
 * If empty/undefined, falls back to flat penalty.
 */
export function calculateXpWithPenalty(
  score: number,
  total: number,
  normalXp: number,
  confirmedLevel: number = 1,
  wrongDifficulties: number[] = []
): { xpChange: number; penalized: boolean } {
  if (total === 0) return { xpChange: 0, penalized: false };

  const accuracy = score / total;
  if (accuracy >= XP_PASS_THRESHOLD) {
    return { xpChange: normalXp, penalized: false };
  }

  // ELO-style: weight each wrong answer by how far below your level it is
  // Base penalty scales with level — higher rank = more to lose
  const expected = getExpectedDifficulty(confirmedLevel);
  const basePenalty = 5 + confirmedLevel * 3;

  let penalty = 0;
  if (wrongDifficulties.length > 0) {
    for (const diff of wrongDifficulties) {
      // Easy question wrong → multiplier > 1 (lose more)
      // Hard question wrong → multiplier < 1 (lose less)
      // Clamp between 0.5x and 2.5x
      const multiplier = Math.max(0.5, Math.min(2.5, 1 + (expected - diff) * 0.3));
      penalty += basePenalty * multiplier;
    }
  } else {
    // Fallback: flat penalty if no difficulty data
    const deficit = XP_PASS_THRESHOLD - accuracy;
    penalty = deficit * total * basePenalty;
  }

  return { xpChange: -Math.ceil(penalty), penalized: true };
}

/**
 * After applying XP change, check if confirmed_level should drop.
 * Returns the correct confirmed_level for the given XP.
 */
export function getCorrectConfirmedLevel(xp: number, currentConfirmedLevel: number): number {
  const xpLevel = getCareerLevel(xp).level;
  return Math.min(currentConfirmedLevel, xpLevel);
}

// ── Hot Seat prize ladder & scoring ────────────────────────

export const HOT_SEAT_PRIZE_LADDER = [
  100, 200, 300, 500, 1000,
  2000, 4000, 8000, 16000, 32000,
  64000, 125000, 250000, 500000, 1000000,
];

/** Safe haven indices: Q5 ($1,000) and Q10 ($32,000) */
export const HOT_SEAT_SAFE_HAVENS = [4, 9];

/**
 * Calculate the prize for a hot seat round.
 * - walkedAway: player took their current prize before answering
 * - wrongAnswerIndex: the 0-based index of the question they got wrong (or timed out on)
 * - If neither, they answered all 15 correctly → $1,000,000
 */
export function calculateHotSeatScore(
  lastCorrectIndex: number,
  walkedAway: boolean,
  wrongAnswerIndex: number | null
): number {
  // Walked away: prize is the value of the last question they correctly answered
  if (walkedAway) {
    return lastCorrectIndex >= 0 ? HOT_SEAT_PRIZE_LADDER[lastCorrectIndex] : 0;
  }

  // Wrong answer: drop to safe haven
  if (wrongAnswerIndex !== null) {
    if (wrongAnswerIndex <= 4) return 0; // Q1-Q5: no safe haven yet
    if (wrongAnswerIndex <= 9) return HOT_SEAT_PRIZE_LADDER[4]; // Q6-Q10: drop to $1,000
    return HOT_SEAT_PRIZE_LADDER[9]; // Q11-Q15: drop to $32,000
  }

  // All correct
  if (lastCorrectIndex >= 14) return HOT_SEAT_PRIZE_LADDER[14];

  // Partial (shouldn't happen without walk-away or wrong answer, but handle gracefully)
  return lastCorrectIndex >= 0 ? HOT_SEAT_PRIZE_LADDER[lastCorrectIndex] : 0;
}

// ── Variant-specific point calculators ─────────────────────

export function calculateSuddenDeathPoints(
  correct: boolean,
  streak: number
): number {
  if (!correct) return 0;
  const base = 15;
  const multiplier = getStreakMultiplier(streak);
  return base * multiplier;
}

export function calculateSprintScore(
  correct: number,
  wrong: number,
  timeRemaining: number
): number {
  return correct * 10 - wrong * 2 + Math.floor(timeRemaining) * 2;
}

export function calculateCrosswordScore(
  wordsWithoutHint: number,
  wordsWithHint: number,
  allWords: boolean,
  timerSelected: boolean,
  remainingSeconds: number,
  hintsUsed: number = 0
): number {
  let score = wordsWithoutHint * 20 + wordsWithHint * 10;
  score -= hintsUsed * 5;
  if (allWords && hintsUsed === 0) score += 75;
  if (timerSelected && remainingSeconds > 0) {
    score += Math.floor(remainingSeconds / 10) * 5;
  }
  return Math.max(0, score);
}

export function calculateMatchScore(
  pairs: number,
  moves: number,
  timeSeconds: number
): number {
  const base = pairs * 20;
  const extraMoves = Math.max(0, moves - pairs);
  const movePenalty = extraMoves * 3;
  const timeBonus = Math.max(0, 300 - timeSeconds);
  return Math.max(0, base - movePenalty + timeBonus);
}

export function calculateCrypticScore(
  correct: number,
  total: number,
  avgTimePerClue: number
): number {
  // Base: 25 points per correct answer
  let score = correct * 25;
  // Speed bonus: faster average = more points (max 15 bonus per clue)
  const speedBonus = Math.max(0, Math.floor((90 - avgTimePerClue) / 6));
  score += correct * Math.min(15, speedBonus);
  // Perfect bonus
  if (correct === total && total > 0) score += 50;
  return Math.max(0, score);
}

export function calculateConnectionsScore(
  groupsFound: number,
  mistakesLeft: number,
  perfect: boolean
): number {
  // Base: 50 points per group found
  let score = groupsFound * 50;
  // Bonus for remaining mistakes (max 4)
  score += mistakesLeft * 15;
  // Perfect bonus (no mistakes)
  if (perfect) score += 75;
  return Math.max(0, score);
}

export function calculateWordleScore(
  solved: boolean,
  guessesUsed: number,
  hintUsed: boolean,
  wordLength: number
): number {
  if (!solved) return 0;
  // Base: 100 points for solving
  // Fewer guesses = more bonus (max 6 guesses)
  const guessBonus = (7 - guessesUsed) * 20; // 20-120 bonus
  const lengthBonus = (wordLength - 4) * 10; // longer words = more points
  const hintPenalty = hintUsed ? 40 : 0;
  return Math.max(0, 100 + guessBonus + lengthBonus - hintPenalty);
}

export function calculateBlitzScore(
  correct: number,
  wrong: number,
  bestStreak: number
): number {
  return correct * 15 + bestStreak * 5 - wrong * 3;
}

export function getGradeEmoji(accuracy: number): string {
  if (accuracy >= 90) return "🏆";
  if (accuracy >= 75) return "🌟";
  if (accuracy >= 60) return "👏";
  if (accuracy >= 40) return "💪";
  return "📚";
}

export function getStreakEmoji(streak: number): string {
  if (streak >= 10) return "☄️";
  if (streak >= 7) return "🔥🔥";
  if (streak >= 5) return "🔥";
  if (streak >= 3) return "✨";
  return "";
}

const CALC_KEYWORDS = /\b(calculate|compute|determine the value|find the|what is the dose|how many|formula|equation|solve|derive|evaluate|half.?life|decay constant|activity|exposure rate|inverse square|attenuation)\b/i;

export function isCalculationQuestion(questionText: string): boolean {
  return CALC_KEYWORDS.test(questionText);
}

export const TIMER_SHRINK = 1.5;
export const TIMER_SHRINK_MIN = 5;
export const TIMER_WRONG_RECOVERY = 2;

export function getAdaptiveTimer(
  baseTime: number,
  correctCount: number,
  isCalc: boolean
): number {
  if (isCalc) return baseTime;
  return Math.max(TIMER_SHRINK_MIN, baseTime - correctCount * TIMER_SHRINK);
}

/**
 * Calculate extra reading time for a question based on word count.
 *
 * Medical physics professionals read technical text at ~200 words per minute
 * (3.33 words/second). Short questions (≤20 words) get no bonus. Longer
 * scenario-based questions get extra time proportional to extra words.
 * Choices are included since the user must read those too.
 *
 * The bonus is capped at 30s to prevent extremely long timers.
 */
const READING_WPM = 200;
const READING_WPS = READING_WPM / 60; // ~3.33 words per second
const SHORT_QUESTION_WORDS = 20; // baseline — no bonus below this
const MAX_READING_BONUS = 30; // cap in seconds

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getReadingTimeBonus(questionText: string, choices?: string[]): number {
  let totalWords = countWords(questionText);
  if (choices) {
    for (const c of choices) {
      totalWords += countWords(c);
    }
  }
  const extraWords = totalWords - SHORT_QUESTION_WORDS;
  if (extraWords <= 0) return 0;
  return Math.min(MAX_READING_BONUS, Math.round(extraWords / READING_WPS));
}

// Difficulty range for each level-up exam (confirmed_level → next level)
export function getExamDifficultyRange(confirmedLevel: number): { min: number; max: number } {
  switch (confirmedLevel) {
    case 1: return { min: 1, max: 3 };   // Intern → Registrar
    case 2: return { min: 2, max: 5 };   // Registrar → Medical Physicist
    case 3: return { min: 4, max: 7 };   // Medical Physicist → Senior
    case 4: return { min: 5, max: 8 };   // Senior → Chief
    case 5: return { min: 7, max: 9 };   // Chief → Consultant
    case 6: return { min: 8, max: 10 };  // Consultant → Professor
    default: return { min: 1, max: 10 };
  }
}

export function isExamReady(xp: number, confirmedLevel: number): boolean {
  const xpLevel = getCareerLevel(xp);
  return xpLevel.level > confirmedLevel;
}

export function getConfirmedCareerLevel(confirmedLevel: number): CareerLevel {
  return CAREER_LEVELS.find((l) => l.level === confirmedLevel) || CAREER_LEVELS[0];
}

// ── Reaction Rounds ─────────────────────────────────────────
export function getReactionRoundsTimer(round: number): number {
  // 5s → shrinks to 2s floor
  return Math.max(2, 5 - round * 0.15);
}

export function calculateReactionRoundsPoints(
  round: number,
  reactionTimeMs: number,
  timerMs: number
): number {
  const base = 20;
  // Speed bonus: up to 30 points for fast taps
  const speedRatio = Math.max(0, (timerMs - reactionTimeMs) / timerMs);
  const speedBonus = Math.floor(speedRatio * 30);
  // Round bonus: later rounds worth more
  const roundBonus = Math.floor(round / 5) * 5;
  return base + speedBonus + roundBonus;
}

export function getSectionMasteryColor(percent: number): string {
  if (percent >= 90) return "#16a34a";
  if (percent >= 75) return "#2563eb";
  if (percent >= 50) return "#eab308";
  return "#dc2626";
}
