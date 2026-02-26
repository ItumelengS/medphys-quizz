export interface TournamentTypeConfig {
  type: "blitz" | "rapid" | "marathon";
  label: string;
  frequencyHours: number;
  durationMinutes: number;
  timerSeconds: number;
  questionsPerRound: number;
  color: string;
  icon: string;
  /** For marathon: fixed UTC hour. Others: repeating every N hours from midnight UTC. */
  fixedHourUTC?: number;
}

export const TOURNAMENT_TYPES: Record<string, TournamentTypeConfig> = {
  blitz: {
    type: "blitz",
    label: "Blitz",
    frequencyHours: 2,
    durationMinutes: 15,
    timerSeconds: 8,
    questionsPerRound: 10,
    color: "var(--bauhaus-red)",
    icon: "⚡",
  },
  rapid: {
    type: "rapid",
    label: "Rapid",
    frequencyHours: 4,
    durationMinutes: 30,
    timerSeconds: 15,
    questionsPerRound: 10,
    color: "var(--bauhaus-blue)",
    icon: "🏎️",
  },
  marathon: {
    type: "marathon",
    label: "Marathon",
    frequencyHours: 24,
    durationMinutes: 60,
    timerSeconds: 20,
    questionsPerRound: 15,
    color: "var(--bauhaus-yellow)",
    icon: "🏅",
    fixedHourUTC: 18,
  },
};

/** Get the most recent start time at or before `now` for a repeating tournament type. */
function getLastScheduledStart(config: TournamentTypeConfig, now: Date): Date {
  const d = new Date(now);
  if (config.fixedHourUTC !== undefined) {
    // Marathon: daily at fixed hour
    d.setUTCMinutes(0, 0, 0);
    d.setUTCHours(config.fixedHourUTC);
    if (d > now) d.setUTCDate(d.getUTCDate() - 1);
    return d;
  }
  // Repeating every N hours from midnight UTC
  d.setUTCMinutes(0, 0, 0);
  const hoursSinceMidnight = now.getUTCHours();
  const slot = Math.floor(hoursSinceMidnight / config.frequencyHours) * config.frequencyHours;
  d.setUTCHours(slot);
  return d;
}

/** Get the next scheduled start time after `now`. */
export function getNextScheduledStart(type: string, now = new Date()): Date {
  const config = TOURNAMENT_TYPES[type];
  if (!config) throw new Error(`Unknown tournament type: ${type}`);
  const last = getLastScheduledStart(config, now);
  if (config.fixedHourUTC !== undefined) {
    return new Date(last.getTime() + 24 * 60 * 60 * 1000);
  }
  return new Date(last.getTime() + config.frequencyHours * 60 * 60 * 1000);
}

/** Get the start of the currently active window (or null if none active). */
export function getCurrentActiveStart(type: string, now = new Date()): Date | null {
  const config = TOURNAMENT_TYPES[type];
  if (!config) return null;
  const last = getLastScheduledStart(config, now);
  const endsAt = new Date(last.getTime() + config.durationMinutes * 60 * 1000);
  if (now >= last && now < endsAt) return last;
  return null;
}

export interface TournamentSlot {
  type: string;
  startsAt: Date;
  endsAt: Date;
  status: "active" | "upcoming";
  config: TournamentTypeConfig;
}

/** Get all tournament slots that should exist now: active ones + next upcoming per type. */
export function getTournamentSlots(now = new Date()): TournamentSlot[] {
  const slots: TournamentSlot[] = [];

  for (const [key, config] of Object.entries(TOURNAMENT_TYPES)) {
    // Check for active
    const activeStart = getCurrentActiveStart(key, now);
    if (activeStart) {
      slots.push({
        type: key,
        startsAt: activeStart,
        endsAt: new Date(activeStart.getTime() + config.durationMinutes * 60 * 1000),
        status: "active",
        config,
      });
    }

    // Always include next upcoming
    const nextStart = getNextScheduledStart(key, now);
    slots.push({
      type: key,
      startsAt: nextStart,
      endsAt: new Date(nextStart.getTime() + config.durationMinutes * 60 * 1000),
      status: "upcoming",
      config,
    });
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Calculate points for a tournament round. */
export function calculateTournamentRoundPoints(correct: number, timeBonus: number): number {
  return correct * 100 + timeBonus;
}
