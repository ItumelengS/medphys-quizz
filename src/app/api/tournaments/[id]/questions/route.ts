import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";

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

  // Fetch a larger pool to randomize from — ensures different order every round
  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, section_id, question, answer, choices, explanation")
    .limit(limit * 3);

  if (error || !questions) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }

  // Cryptographically-ish shuffle — never the same order twice
  const shuffled = questions
    .map((q) => ({ q, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ q }) => q)
    .slice(0, limit);

  // Shuffle each question's choices too
  const result = shuffled.map((q) => ({
    ...q,
    choices: [...q.choices]
      .map((c) => ({ c, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ c }) => c),
  }));

  return NextResponse.json(result);
}
