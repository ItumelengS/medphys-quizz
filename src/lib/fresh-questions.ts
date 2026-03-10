import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prioritize questions the user hasn't seen (or hasn't seen recently).
 *
 * Buckets (highest priority first):
 *   1. Never seen — no question_history row
 *   2. Stale — last_shown > COOLDOWN_DAYS ago
 *   3. Recent — last_shown within COOLDOWN_DAYS
 *
 * Within each bucket, questions are randomly shuffled.
 * Falls back to recent questions when the fresh pool is too small.
 */

const COOLDOWN_DAYS = 7;

export async function prioritizeFreshQuestions<T extends { id: string }>(
  supabase: SupabaseClient,
  userId: string,
  questions: T[],
  limit: number
): Promise<T[]> {
  if (questions.length === 0) return [];
  if (questions.length <= limit) return shuffle(questions);

  // Fetch history for these question IDs
  const questionIds = questions.map((q) => q.id);
  const { data: history } = await supabase
    .from("question_history")
    .select("question_id, last_shown")
    .eq("user_id", userId)
    .in("question_id", questionIds);

  const historyMap = new Map<string, string>();
  if (history) {
    for (const h of history) {
      historyMap.set(h.question_id, h.last_shown);
    }
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - COOLDOWN_DAYS);

  const unseen: T[] = [];
  const stale: T[] = [];
  const recent: T[] = [];

  for (const q of questions) {
    const lastShown = historyMap.get(q.id);
    if (!lastShown) {
      unseen.push(q);
    } else if (new Date(lastShown) < cutoff) {
      stale.push(q);
    } else {
      recent.push(q);
    }
  }

  // Shuffle within each bucket, then concatenate in priority order
  const prioritized = [...shuffle(unseen), ...shuffle(stale), ...shuffle(recent)];
  return prioritized.slice(0, limit);
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
