export interface Question {
  id: string;
  q: string;
  a: string;
  c: string[];
  e: string;
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
    totalQuestions: number;
    lastUpdated: string;
    author: string;
    notes: string;
  };
  sections: Section[];
  questions: Record<string, Question[]>;
}

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
  mode: "speed" | "daily" | "review";
}

export interface AppState {
  version: number;
  player: {
    name: string;
    xp: number;
    createdAt: string;
  };
  stats: {
    totalAnswered: number;
    totalCorrect: number;
    gamesPlayed: number;
    bestScore: number | null;
    bestStreak: number;
    dailyStreak: number;
    lastDailyDate: string | null;
  };
  leaderboard: LeaderboardEntry[];
  questionHistory: Record<string, QuestionRecord>;
  dailyChallenge: {
    lastCompletedDate: string | null;
    score: number | null;
  };
}

export interface CareerLevel {
  level: number;
  title: string;
  xpRequired: number;
  icon: string;
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  score: number;
  points: number;
  streak: number;
  bestStreak: number;
  answers: AnswerRecord[];
  mode: "speed" | "daily" | "review";
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
