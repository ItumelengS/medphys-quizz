// Weekly challenge types and evaluation logic

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: 'section_accuracy' | 'streak' | 'games_played' | 'perfect_round' | 'variant_score';
  target_value: number;
  target_section?: string;
  target_variant?: string;
  bonus_xp: number;
  week_start: string;
}

export interface ChallengeProgress {
  challenge_id: string;
  current_value: number;
  completed: boolean;
  xp_awarded: boolean;
}

const SECTIONS = [
  'srt', 'qa', 'equip', 'eclipse', 'dosimetry', 'nucmed',
  'diag', 'radiobio', 'radprot', 'brachy', 'igrt', 'imrt',
  'electron', 'ct', 'mri', 'clinical',
];

const SECTION_NAMES: Record<string, string> = {
  srt: 'SRT', qa: 'QA', equip: 'Equipment', eclipse: 'Eclipse',
  dosimetry: 'Dosimetry', nucmed: 'Nuclear Medicine', diag: 'Diagnostic',
  radiobio: 'Radiobiology', radprot: 'Radiation Protection',
  brachy: 'Brachytherapy', igrt: 'IGRT', imrt: 'IMRT',
  electron: 'Electron Therapy', ct: 'CT', mri: 'MRI', clinical: 'Clinical',
};

const VARIANTS = ['sudden-death', 'sprint', 'crossword', 'match', 'hot-seat', 'blitz', 'wordle', 'connections', 'cryptic'];

const VARIANT_NAMES: Record<string, string> = {
  'sudden-death': 'Sudden Death', sprint: 'Sprint', crossword: 'Crossword',
  match: 'Match', 'hot-seat': 'Hot Seat', blitz: 'Blitz',
  wordle: 'Wordle', connections: 'Connections', cryptic: 'Cryptic',
};

/** Simple deterministic hash from a string to a number */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Deterministically generate 3 weekly challenges for a given week.
 * Uses the week start date as a seed so every user sees the same challenges.
 */
export function generateWeeklyChallenges(weekStart: string): WeeklyChallenge[] {
  const seed = hashCode(weekStart);
  const challenges: WeeklyChallenge[] = [];

  // Challenge 1: Section accuracy challenge
  const sectionIdx = seed % SECTIONS.length;
  const section = SECTIONS[sectionIdx];
  const accuracyTarget = 70 + ((seed >> 4) % 3) * 10; // 70, 80, or 90%
  challenges.push({
    id: `${weekStart}-section-accuracy`,
    title: `${SECTION_NAMES[section]} Expert`,
    description: `Score ${accuracyTarget}%+ accuracy in ${SECTION_NAMES[section]}`,
    challenge_type: 'section_accuracy',
    target_value: accuracyTarget,
    target_section: section,
    bonus_xp: accuracyTarget >= 90 ? 150 : accuracyTarget >= 80 ? 100 : 75,
    week_start: weekStart,
  });

  // Challenge 2: Streak or perfect round challenge (alternates by week)
  const useStreak = (seed >> 8) % 2 === 0;
  if (useStreak) {
    const streakTarget = 3 + ((seed >> 12) % 4); // 3-6
    challenges.push({
      id: `${weekStart}-streak`,
      title: `Hot Streak`,
      description: `Get a ${streakTarget}-answer streak in a single game`,
      challenge_type: 'streak',
      target_value: streakTarget,
      bonus_xp: streakTarget * 25,
      week_start: weekStart,
    });
  } else {
    const perfectTarget = 1 + ((seed >> 12) % 2); // 1-2
    challenges.push({
      id: `${weekStart}-perfect`,
      title: `Flawless Victory`,
      description: `Get ${perfectTarget} perfect round${perfectTarget > 1 ? 's' : ''} (100% accuracy)`,
      challenge_type: 'perfect_round',
      target_value: perfectTarget,
      bonus_xp: perfectTarget * 100,
      week_start: weekStart,
    });
  }

  // Challenge 3: Games played or variant score challenge (alternates)
  const useGames = (seed >> 16) % 2 === 0;
  if (useGames) {
    const gamesTarget = 5 + ((seed >> 20) % 6); // 5-10
    challenges.push({
      id: `${weekStart}-games-played`,
      title: `Weekly Warrior`,
      description: `Complete ${gamesTarget} games this week`,
      challenge_type: 'games_played',
      target_value: gamesTarget,
      bonus_xp: gamesTarget * 15,
      week_start: weekStart,
    });
  } else {
    const variantIdx = (seed >> 20) % VARIANTS.length;
    const variant = VARIANTS[variantIdx];
    const scoreTarget = 3 + ((seed >> 24) % 5); // 3-7
    challenges.push({
      id: `${weekStart}-variant-score`,
      title: `${VARIANT_NAMES[variant]} Master`,
      description: `Score ${scoreTarget}+ in a ${VARIANT_NAMES[variant]} game`,
      challenge_type: 'variant_score',
      target_value: scoreTarget,
      bonus_xp: scoreTarget * 20,
      week_start: weekStart,
    });
  }

  return challenges;
}

/** Get the Monday (start of week) for a given date */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Evaluate a challenge against a game result and return the updated progress value.
 * Returns the new current_value (not a delta).
 */
export function evaluateChallengeProgress(
  challenge: WeeklyChallenge,
  currentValue: number,
  gameResult: {
    variant?: string;
    score: number;
    total: number;
    points: number;
    bestStreak: number;
    section: string;
  }
): number {
  switch (challenge.challenge_type) {
    case 'section_accuracy': {
      // Check if the game was in the target section
      if (gameResult.section !== challenge.target_section) return currentValue;
      const accuracy = gameResult.total > 0
        ? Math.round((gameResult.score / gameResult.total) * 100)
        : 0;
      // Track the best accuracy achieved (not cumulative)
      return Math.max(currentValue, accuracy);
    }

    case 'streak': {
      // Track the best streak seen (not cumulative)
      return Math.max(currentValue, gameResult.bestStreak);
    }

    case 'games_played': {
      // Increment by 1 for each game
      return currentValue + 1;
    }

    case 'perfect_round': {
      // Increment if score === total and total > 0
      if (gameResult.score === gameResult.total && gameResult.total > 0) {
        return currentValue + 1;
      }
      return currentValue;
    }

    case 'variant_score': {
      if (gameResult.variant !== challenge.target_variant) return currentValue;
      // Track best score in that variant
      return Math.max(currentValue, gameResult.score);
    }

    default:
      return currentValue;
  }
}
