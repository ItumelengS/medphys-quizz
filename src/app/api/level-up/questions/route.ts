import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getExamDifficultyRange } from "@/lib/scoring";

const EXAM_QUESTION_COUNT = 10;
const SELECT_COLS = "id, section_id, question, answer, choices, explanation, difficulty";

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const userId = session.user.id;

  // Get user profile to determine difficulty range
  const { data: profile } = await supabase
    .from("profiles")
    .select("powerups, xp, confirmed_level")
    .eq("id", userId)
    .single();

  const confirmedLevel = profile?.confirmed_level || 1;
  const { min, max } = getExamDifficultyRange(confirmedLevel);

  // Get user's question history to find weak-spot questions
  const { data: history } = await supabase
    .from("question_history")
    .select("question_id, times_shown, times_correct")
    .eq("user_id", userId);

  const hardQuestionIds: string[] = [];
  const seenQuestionIds = new Set<string>();

  for (const h of history || []) {
    seenQuestionIds.add(h.question_id);
    const ratio = h.times_shown > 0 ? h.times_correct / h.times_shown : 0;
    if (ratio < 0.6) {
      hardQuestionIds.push(h.question_id);
    }
  }

  // Fetch weak-spot questions, filtered to the level's difficulty range
  let hardQuestions: Array<{ id: string; section_id: string; question: string; answer: string; choices: string[]; explanation: string; difficulty: number }> = [];
  if (hardQuestionIds.length > 0) {
    const { data } = await supabase
      .from("questions")
      .select(SELECT_COLS)
      .in("id", hardQuestionIds.slice(0, 50))
      .gte("difficulty", min)
      .lte("difficulty", max);
    hardQuestions = data || [];
  }

  const selected = shuffle(hardQuestions).slice(0, EXAM_QUESTION_COUNT);

  // Fill remaining slots with level-appropriate questions
  if (selected.length < EXAM_QUESTION_COUNT) {
    const remaining = EXAM_QUESTION_COUNT - selected.length;
    const selectedIds = new Set(selected.map((q) => q.id));

    const { data: poolQuestions } = await supabase
      .from("questions")
      .select(SELECT_COLS)
      .gte("difficulty", min)
      .lte("difficulty", max)
      .limit(500);

    const unseen = (poolQuestions || []).filter(
      (q) => !seenQuestionIds.has(q.id) && !selectedIds.has(q.id)
    );
    const seen = (poolQuestions || []).filter(
      (q) => seenQuestionIds.has(q.id) && !selectedIds.has(q.id) && !hardQuestionIds.includes(q.id)
    );

    const filler = [...shuffle(unseen), ...shuffle(seen)].slice(0, remaining);
    selected.push(...filler);
  }

  shuffle(selected);

  return NextResponse.json({
    questions: selected,
    powerups: profile?.powerups || {},
    xp: profile?.xp || 0,
  });
}
