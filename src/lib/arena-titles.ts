export interface ArenaTitle {
  id: string;
  title: string;
  icon: string;
  description: string;
  color: string;
}

export const ARENA_TITLES: ArenaTitle[] = [
  {
    id: "arena_master",
    title: "Arena Master",
    icon: "👑",
    description: "Win 3 tournaments",
    color: "var(--bauhaus-yellow)",
  },
  {
    id: "berserk_king",
    title: "Berserk King",
    icon: "💀",
    description: "Play 10 berserk rounds",
    color: "var(--bauhaus-red)",
  },
  {
    id: "fire_lord",
    title: "Fire Lord",
    icon: "🔥",
    description: "Reach a fire streak of 4",
    color: "var(--bauhaus-red)",
  },
  {
    id: "speed_demon",
    title: "Speed Demon",
    icon: "⚡",
    description: "Win a Blitz tournament",
    color: "var(--bauhaus-red)",
  },
  {
    id: "endurance",
    title: "Iron Will",
    icon: "🏅",
    description: "Win a Marathon tournament",
    color: "var(--bauhaus-yellow)",
  },
  {
    id: "grinder",
    title: "Grinder",
    icon: "⚙️",
    description: "Play 50 tournament rounds",
    color: "var(--bauhaus-blue)",
  },
  {
    id: "podium_regular",
    title: "Podium Regular",
    icon: "🏆",
    description: "Finish top 3 in 5 tournaments",
    color: "var(--bauhaus-blue)",
  },
];

export interface TournamentCareerStats {
  wins: number;
  blitzWins: number;
  marathonWins: number;
  podiums: number;
  totalBerserkRounds: number;
  maxFireStreak: number;
  totalRoundsPlayed: number;
}

/** Given career stats, return all earned titles. */
export function getEarnedTitles(stats: TournamentCareerStats): ArenaTitle[] {
  const earned: ArenaTitle[] = [];

  if (stats.wins >= 3) earned.push(ARENA_TITLES.find((t) => t.id === "arena_master")!);
  if (stats.totalBerserkRounds >= 10) earned.push(ARENA_TITLES.find((t) => t.id === "berserk_king")!);
  if (stats.maxFireStreak >= 4) earned.push(ARENA_TITLES.find((t) => t.id === "fire_lord")!);
  if (stats.blitzWins >= 1) earned.push(ARENA_TITLES.find((t) => t.id === "speed_demon")!);
  if (stats.marathonWins >= 1) earned.push(ARENA_TITLES.find((t) => t.id === "endurance")!);
  if (stats.totalRoundsPlayed >= 50) earned.push(ARENA_TITLES.find((t) => t.id === "grinder")!);
  if (stats.podiums >= 5) earned.push(ARENA_TITLES.find((t) => t.id === "podium_regular")!);

  return earned;
}

/** Get the most prestigious title to display (first earned, priority order). */
export function getPrimaryTitle(stats: TournamentCareerStats): ArenaTitle | null {
  const earned = getEarnedTitles(stats);
  return earned.length > 0 ? earned[0] : null;
}
