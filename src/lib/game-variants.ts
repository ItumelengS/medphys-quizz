import type { GameVariant } from "./types";

export interface VariantConfig {
  id: GameVariant;
  name: string;
  icon: string;
  description: string;
  color: string;
  xpMultiplier: number;
  rules: string[];
}

export const VARIANT_CONFIGS: Record<GameVariant, VariantConfig> = {
  "sudden-death": {
    id: "sudden-death",
    name: "Sudden Death",
    icon: "💀",
    description: "One wrong answer = instant death. The game actively tries to stop you.",
    color: "#dc2626",
    xpMultiplier: 2.0,
    rules: [
      "1 life — one wrong answer or timeout kills you",
      "8s timer that shrinks with consecutive correct answers",
      "Questions get progressively harder",
      "Survive 25 questions to win",
      "2x XP multiplier",
    ],
  },
  sprint: {
    id: "sprint",
    name: "Sprint",
    icon: "🏃",
    description: "Race a 60-second clock. Wrong answers cost you 3 seconds.",
    color: "#eab308",
    xpMultiplier: 1.5,
    rules: [
      "60 seconds total — no per-question timer",
      "Wrong answer = -3s penalty",
      "Questions advance instantly",
      "No explanations shown",
      "Bonus points for remaining time",
    ],
  },
  crossword: {
    id: "crossword",
    name: "Crossword",
    icon: "🧩",
    description: "NYT-style crossword with medical physics terms. Pick your own pace.",
    color: "#2563eb",
    xpMultiplier: 1.8,
    rules: [
      "Fill a crossword grid with medical physics terms",
      "Clues are quiz questions — answers fill the grid",
      "Check button validates your entries",
      "Reveal costs points but helps you progress",
      "Optional timer: None / 5min / 10min / 15min",
    ],
  },
  match: {
    id: "match",
    name: "Match",
    icon: "🃏",
    description: "Flip cards and match questions to their answers. Test your memory.",
    color: "#8b5cf6",
    xpMultiplier: 1.6,
    rules: [
      "Cards are face-down — flip 2 at a time",
      "Match a question card with its correct answer",
      "Matched pairs stay revealed",
      "Fewer moves = higher score",
      "Time bonus for finishing quickly",
    ],
  },
};

export const VARIANT_LIST = Object.values(VARIANT_CONFIGS);

export function getVariantDisplayName(mode: string): string {
  switch (mode) {
    case "sudden-death": return "Sudden Death";
    case "sprint": return "Sprint";
    case "crossword": return "Crossword";
    case "match": return "Match";
    case "speed": return "Speed Round";
    case "daily": return "Daily Challenge";
    case "review": return "Review";
    default: return mode;
  }
}
