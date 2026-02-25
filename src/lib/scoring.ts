import type { CareerLevel } from "./types";

export const CAREER_LEVELS: CareerLevel[] = [
  { level: 1, title: "Intern", xpRequired: 0, icon: "🔬" },
  { level: 2, title: "Registrar", xpRequired: 500, icon: "📖" },
  { level: 3, title: "Medical Physicist", xpRequired: 1500, icon: "⚛️" },
  { level: 4, title: "Senior Physicist", xpRequired: 3500, icon: "🎯" },
  { level: 5, title: "Chief Physicist", xpRequired: 7000, icon: "👨‍🔬" },
  { level: 6, title: "Consultant", xpRequired: 12000, icon: "🏅" },
  { level: 7, title: "Professor", xpRequired: 20000, icon: "🎓" },
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
  mode: "speed" | "daily" | "review",
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
  const dailyBonusXp = mode === "daily" ? dailyStreak * 10 : 0;
  const perfectBonusXp = correct === total && total > 0 ? 100 : 0;

  if (mode === "review") {
    baseXp = correct * 5 + (total - correct) * 2;
  } else if (mode === "daily") {
    baseXp = Math.floor(points * 1.5);
  } else {
    baseXp = points;
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

export function getSectionMasteryColor(percent: number): string {
  if (percent >= 90) return "#00e5a0";
  if (percent >= 75) return "#60a5fa";
  if (percent >= 50) return "#f97316";
  return "#ef4444";
}
