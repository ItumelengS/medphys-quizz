import "next-auth";

// ── JSON file types (used by seed script) ──────────────────
export interface Question {
  id: string;
  q: string;
  a: string;
  c: string[];
  e: string;
  d: number;
}

export interface Section {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface QuestionBank {
  meta: {
    version: string;
    totalQuestions?: number;
    lastUpdated: string;
    author: string;
    notes: string;
  };
  sections: Section[];
  questions: Record<string, Question[]>;
}

// ── DB-aligned types ───────────────────────────────────────
export interface DbSection {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  sort_order: number;
}

export interface DbQuestion {
  id: string;
  section_id: string;
  question: string;
  answer: string;
  choices: string[];
  explanation: string;
  difficulty: number;
}

export interface DbProfile {
  id: string;
  display_name: string;
  xp: number;
  role: "player" | "admin";
}

export interface DbUserStats {
  user_id: string;
  total_answered: number;
  total_correct: number;
  games_played: number;
  best_score: number | null;
  best_streak: number;
  daily_streak: number;
  last_daily_date: string | null;
}

export interface DbQuestionHistory {
  user_id: string;
  question_id: string;
  times_shown: number;
  times_correct: number;
  ease_factor: number;
  interval: number;
  next_due: string;
  streak: number;
  last_shown: string;
}

export interface DbLeaderboardEntry {
  id: string;
  user_id: string;
  player_name: string;
  score: number;
  total: number;
  points: number;
  best_streak: number;
  section: string;
  section_name: string;
  mode: GameMode;
  played_at: string;
}

export interface DbDailyChallenge {
  user_id: string;
  last_completed_date: string | null;
  last_score: number | null;
}

// ── Tournament types ─────────────────────────────────────────
export interface DbTournament {
  id: string;
  type: "blitz" | "rapid" | "marathon" | "crossword-blitz" | "crossword-rapid" | "crossword-marathon" | "sudden-death-blitz" | "sudden-death-rapid" | "sprint-blitz" | "sprint-rapid" | "match-blitz" | "match-rapid";
  starts_at: string;
  ends_at: string;
  status: "upcoming" | "active" | "finished";
  config: Record<string, unknown>;
}

export interface FinishedTournamentWithWinner extends DbTournament {
  participant_count: number;
  winner_name: string | null;
  winner_points: number | null;
}

export interface DbTournamentParticipant {
  tournament_id: string;
  user_id: string;
  display_name: string;
  total_points: number;
  rounds_played: number;
  best_round_score: number;
  fire_streak: number;
  current_fire_streak: number;
  berserk_rounds: number;
}

export interface DbTournamentRound {
  id: string;
  tournament_id: string;
  user_id: string;
  score: number;
  total: number;
  points_earned: number;
  berserk: boolean;
  time_bonus: number;
  fire_multiplier: number;
  played_at: string;
}

// ── Crossword clues (standalone table) ───────────────────
export interface DbCrosswordClue {
  id: string;
  clue: string;
  answer: string;
  category: string;
  difficulty: string;
}

// ── Spaced repetition (client-side computation) ────────────
export interface QuestionRecord {
  questionId: string;
  timesShown: number;
  timesCorrect: number;
  lastShown: string;
  nextDue: string;
  easeFactor: number;
  interval: number;
  streak: number;
}

// ── Game variants ──────────────────────────────────────────
export type GameVariant = "sudden-death" | "sprint" | "crossword" | "match";
export type GameMode = "speed" | "daily" | "review" | "sudden-death" | "sprint" | "crossword" | "match";

export interface CrosswordCell {
  letter: string;
  wordIndices: number[];
  x: number;
  y: number;
}

export interface CrosswordWord {
  index: number;
  clue: string;
  answer: string;
  questionId: string;
  direction: "across" | "down";
  startX: number;
  startY: number;
  cells: { x: number; y: number }[];
}

export interface CrosswordPuzzle {
  width: number;
  height: number;
  grid: (CrosswordCell | null)[][];
  words: CrosswordWord[];
}

// ── Leaderboard (client-facing) ────────────────────────────
export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  total: number;
  points: number;
  bestStreak: number;
  section: string;
  sectionName: string;
  date: string;
  mode: GameMode;
}

// ── Power-ups ──────────────────────────────────────────────
export type PowerUpType = "fifty_fifty" | "time_freeze";

export interface PowerUpInventory {
  fifty_fifty: number;
  time_freeze: number;
}

export const POWERUP_INFO: Record<PowerUpType, { name: string; icon: string; description: string }> = {
  fifty_fifty: { name: "50/50", icon: "✂️", description: "Eliminates 2 wrong answers" },
  time_freeze: { name: "Time Freeze", icon: "⏸️", description: "Pauses timer for 5 seconds" },
};

export const MAX_POWERUP_STOCK = 3;

// ── Career levels ──────────────────────────────────────────
export interface CareerLevel {
  level: number;
  title: string;
  xpRequired: number;
  icon: string;
}

// ── Quiz state (client) ────────────────────────────────────
export interface QuizState {
  questions: Question[];
  currentIndex: number;
  score: number;
  points: number;
  streak: number;
  bestStreak: number;
  answers: AnswerRecord[];
  mode: GameMode;
  section: string;
  sectionName: string;
  timerSeconds: number;
}

export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string | null;
  correct: boolean;
  timeRemaining: number;
  pointsEarned: number;
}

// ── NextAuth type extensions ───────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      displayName: string;
      xp: number;
    };
  }

  interface User {
    role?: string;
    displayName?: string;
    xp?: number;
  }
}

