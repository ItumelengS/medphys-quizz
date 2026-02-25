import type { AppState, LeaderboardEntry } from "./types";

const STORAGE_KEY = "medphys-quiz-data";
const CURRENT_VERSION = 1;

function defaultState(): AppState {
  return {
    version: CURRENT_VERSION,
    player: {
      name: "",
      xp: 0,
      createdAt: new Date().toISOString(),
    },
    stats: {
      totalAnswered: 0,
      totalCorrect: 0,
      gamesPlayed: 0,
      bestScore: null,
      bestStreak: 0,
      dailyStreak: 0,
      lastDailyDate: null,
    },
    leaderboard: [],
    questionHistory: {},
    dailyChallenge: {
      lastCompletedDate: null,
      score: null,
    },
  };
}

export const storage = {
  getState(): AppState {
    if (typeof window === "undefined") return defaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version !== CURRENT_VERSION) {
        return { ...defaultState(), ...parsed, version: CURRENT_VERSION };
      }
      return parsed;
    } catch {
      return defaultState();
    }
  },

  saveState(state: AppState): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable
    }
  },

  updateState(updater: (state: AppState) => AppState): AppState {
    const state = this.getState();
    const updated = updater(state);
    this.saveState(updated);
    return updated;
  },

  addLeaderboardEntry(entry: LeaderboardEntry): void {
    this.updateState((state) => {
      const lb = [...state.leaderboard, entry]
        .sort((a, b) => b.score !== a.score ? b.score - a.score : b.points - a.points)
        .slice(0, 50);
      return { ...state, leaderboard: lb };
    });
  },

  resetState(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};
