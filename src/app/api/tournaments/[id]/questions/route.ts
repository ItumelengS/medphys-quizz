import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import { applyDisciplineFilter } from "@/lib/discipline-filter";
import { applyDifficultyFilter } from "@/lib/difficulty-filter";
import { prioritizeFreshQuestions } from "@/lib/fresh-questions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("type, status")
    .eq("id", id)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.status !== "active") {
    return NextResponse.json({ error: "Tournament is not active" }, { status: 400 });
  }

  const config = TOURNAMENT_TYPES[tournament.type];
  const limit = config?.questionsPerRound || 10;

  // Get user profile for difficulty scaling
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, discipline")
    .eq("id", session.user.id)
    .single();

  const xp = profile?.xp ?? 0;
  const discipline = profile?.discipline ?? "physicist";

  // Fetch a larger pool filtered by discipline + difficulty, then randomize
  let poolQuery = applyDisciplineFilter(
    supabase
      .from("questions")
      .select("id, section_id, question, answer, choices, explanation"),
    discipline
  );
  poolQuery = applyDifficultyFilter(poolQuery, xp);
  const { data: questions, error } = await poolQuery.limit(limit * 3);

  if (error || !questions) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }

  // Prioritize unseen/stale questions, then pick the needed amount
  const selected = await prioritizeFreshQuestions(supabase, session.user.id, questions, limit);

  // Shuffle each question's choices too
  const result = selected.map((q) => ({
    ...q,
    choices: [...q.choices]
      .map((c) => ({ c, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ c }) => c),
  }));

  return NextResponse.json(result);
}
