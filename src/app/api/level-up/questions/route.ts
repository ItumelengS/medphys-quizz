import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const EXAM_QUESTION_COUNT = 10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const userId = session.user.id;

  // Get user's question history to find "hard" questions
  const { data: history } = await supabase
    .from("question_history")
    .select("question_id, times_shown, times_correct")
    .eq("user_id", userId);

  // Build a set of question IDs the user has struggled with (low accuracy)
  const hardQuestionIds: string[] = [];
  const seenQuestionIds = new Set<string>();

  for (const h of history || []) {
    seenQuestionIds.add(h.question_id);
    const ratio = h.times_shown > 0 ? h.times_correct / h.times_shown : 0;
    if (ratio < 0.6) {
      hardQuestionIds.push(h.question_id);
    }
  }

  // Fetch hard questions the user got wrong before
  let hardQuestions: Array<{ id: string; section_id: string; question: string; answer: string; choices: string[]; explanation: string }> = [];
  if (hardQuestionIds.length > 0) {
    const { data } = await supabase
      .from("questions")
      .select("id, section_id, question, answer, choices, explanation")
      .in("id", hardQuestionIds.slice(0, 50));
    hardQuestions = data || [];
  }

  // Shuffle hard questions
  for (let i = hardQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hardQuestions[i], hardQuestions[j]] = [hardQuestions[j], hardQuestions[i]];
  }

  const selected = hardQuestions.slice(0, EXAM_QUESTION_COUNT);

  // If we need more questions, fill with unseen questions from varied sections
  if (selected.length < EXAM_QUESTION_COUNT) {
    const remaining = EXAM_QUESTION_COUNT - selected.length;
    const selectedIds = new Set(selected.map((q) => q.id));

    // Get all sections for breadth
    const { data: allQuestions } = await supabase
      .from("questions")
      .select("id, section_id, question, answer, choices, explanation")
      .limit(500);

    // Prefer unseen, then mix
    const unseen = (allQuestions || []).filter(
      (q) => !seenQuestionIds.has(q.id) && !selectedIds.has(q.id)
    );
    const seen = (allQuestions || []).filter(
      (q) => seenQuestionIds.has(q.id) && !selectedIds.has(q.id) && !hardQuestionIds.includes(q.id)
    );

    // Shuffle both pools
    for (let i = unseen.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unseen[i], unseen[j]] = [unseen[j], unseen[i]];
    }
    for (let i = seen.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seen[i], seen[j]] = [seen[j], seen[i]];
    }

    const filler = [...unseen, ...seen].slice(0, remaining);
    selected.push(...filler);
  }

  // Final shuffle
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  // Get user powerups
  const { data: profile } = await supabase
    .from("profiles")
    .select("powerups, xp")
    .eq("id", userId)
    .single();

  return NextResponse.json({
    questions: selected,
    powerups: profile?.powerups || {},
    xp: profile?.xp || 0,
  });
}
