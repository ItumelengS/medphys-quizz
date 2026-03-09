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
  "hot-seat": {
    id: "hot-seat",
    name: "Hot Seat",
    icon: "💰",
    description: "15 escalating questions, 3 lifelines, and the chance to walk away. How far can you go?",
    color: "#d97706",
    xpMultiplier: 2.5,
    rules: [
      "15 questions with escalating prize values",
      "3 lifelines: 50:50, Phone a Friend, Ask the Audience",
      "Safe havens at Q5 ($1,000) and Q10 ($32,000)",
      "Walk away any time to keep your current prize",
      "2.5x XP multiplier",
    ],
  },
  blitz: {
    id: "blitz",
    name: "Blitz",
    icon: "⚡",
    description: "Rapid-fire true/false under a 3-second clock. Streak scoring rewards consistency.",
    color: "#06b6d4",
    xpMultiplier: 1.8,
    rules: [
      "30 true/false questions — is the claim correct?",
      "3 seconds per question — timeout = wrong",
      "Streak multipliers: 3→2x, 7→3x, 10→5x",
      "No explanations during play",
      "1.8x XP multiplier",
    ],
  },
  connections: {
    id: "connections",
    name: "Connections",
    icon: "🔗",
    description: "Group 16 medical physics terms into 4 hidden categories. Fewer mistakes = more points.",
    color: "#a855f7",
    xpMultiplier: 1.6,
    rules: [
      "16 words — find 4 groups of 4",
      "Select 4 words and submit a guess",
      "Correct group revealed with color",
      "4 mistakes allowed before game over",
      "Difficulty: yellow → green → blue → purple",
    ],
  },
  cryptic: {
    id: "cryptic",
    name: "Cryptic",
    icon: "🔮",
    description: "Solve cryptic crossword-style clues for medical physics terms. Wordplay meets science.",
    color: "#be185d",
    xpMultiplier: 1.8,
    rules: [
      "Cryptic clues with hidden wordplay",
      "Type the answer — spelling must be exact",
      "90 seconds per clue, solve as many as you can",
      "Skip costs no points, wrong answer costs time",
      "Explanation revealed after each clue",
    ],
  },
  wordle: {
    id: "wordle",
    name: "Wordle",
    icon: "🔤",
    description: "Guess the medical physics term in 6 tries. Green, yellow, gray — you know the rules.",
    color: "#16a34a",
    xpMultiplier: 1.5,
    rules: [
      "6 attempts to guess the hidden term",
      "Green = correct letter & position",
      "Yellow = correct letter, wrong position",
      "Gray = letter not in the word",
      "Use a hint to reveal the clue (costs points)",
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
    case "hot-seat": return "Hot Seat";
    case "blitz": return "Blitz";
    case "cryptic": return "Cryptic";
    case "wordle": return "Wordle";
    case "connections": return "Connections";
    case "speed": return "Speed Round";
    case "daily": return "Daily Challenge";
    case "review": return "Review";
    default: return mode;
  }
}
