import type { QuestionRecord } from "./types";

export function createQuestionRecord(questionId: string): QuestionRecord {
  return {
    questionId,
    timesShown: 0,
    timesCorrect: 0,
    lastShown: new Date().toISOString(),
    nextDue: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 0,
    streak: 0,
  };
}

export function updateQuestionRecord(
  record: QuestionRecord,
  correct: boolean
): QuestionRecord {
  const now = new Date();
  const updated = { ...record };

  updated.timesShown++;
  updated.lastShown = now.toISOString();

  if (correct) {
    updated.timesCorrect++;
    updated.streak++;
    updated.easeFactor = Math.min(3.0, updated.easeFactor + 0.1);

    if (updated.interval === 0) {
      updated.interval = 1;
    } else if (updated.interval === 1) {
      updated.interval = 3;
    } else {
      updated.interval = Math.round(updated.interval * updated.easeFactor);
    }
  } else {
    updated.streak = 0;
    updated.easeFactor = Math.max(1.3, updated.easeFactor - 0.2);
    updated.interval = 1;
  }

  const nextDue = new Date(now);
  nextDue.setDate(nextDue.getDate() + updated.interval);
  updated.nextDue = nextDue.toISOString();

  return updated;
}

export function isDue(record: QuestionRecord): boolean {
  return new Date(record.nextDue) <= new Date();
}

export function getDueQuestions(
  history: Record<string, QuestionRecord>,
  allQuestionIds: string[]
): string[] {
  const due: { id: string; priority: number; date: string }[] = [];

  for (const id of allQuestionIds) {
    const record = history[id];
    if (!record) {
      // Never seen — priority 1 (medium)
      due.push({ id, priority: 1, date: "1970-01-01" });
    } else if (isDue(record)) {
      // Wrong recently = priority 0 (highest)
      // Due for review = priority 2
      const priority = record.streak === 0 && record.timesShown > 0 ? 0 : 2;
      due.push({ id, priority, date: record.nextDue });
    }
  }

  return due
    .sort((a, b) => a.priority - b.priority || a.date.localeCompare(b.date))
    .map((d) => d.id);
}
