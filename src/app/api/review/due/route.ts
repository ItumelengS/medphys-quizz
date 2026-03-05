import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_REVIEW = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const userId = session.user.id;
  const now = new Date().toISOString();

  // Get question IDs and user history in parallel (only fetch needed columns)
  const [questionsRes, historyRes] = await Promise.all([
    supabase.from("questions").select("id").order("id"),
    supabase.from("question_history").select("question_id, next_due, streak, times_shown").eq("user_id", userId),
  ]);

  const allQuestionIds = questionsRes.data || [];
  if (!allQuestionIds.length) {
    return NextResponse.json([]);
  }

  const historyMap = new Map(
    (historyRes.data || []).map((h) => [h.question_id, h])
  );

  // Determine due question IDs with priority
  const due: { questionId: string; priority: number; date: string }[] = [];

  for (const q of allQuestionIds) {
    const record = historyMap.get(q.id);
    if (!record) {
      due.push({ questionId: q.id, priority: 1, date: "1970-01-01" });
    } else if (new Date(record.next_due) <= new Date(now)) {
      const priority = record.streak === 0 && record.times_shown > 0 ? 0 : 2;
      due.push({ questionId: q.id, priority, date: record.next_due });
    }
  }

  const sorted = due
    .sort((a, b) => a.priority - b.priority || a.date.localeCompare(b.date))
    .slice(0, MAX_REVIEW);

  if (sorted.length === 0) {
    return NextResponse.json([]);
  }

  // Only fetch full question data for the final selection
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .in("id", sorted.map((d) => d.questionId));

  // Restore sort order
  const questionMap = new Map((questions || []).map((q) => [q.id, q]));
  const result = sorted.map((d) => questionMap.get(d.questionId)).filter(Boolean);

  return NextResponse.json(result);
}
