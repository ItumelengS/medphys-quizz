import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import { generateCrossword } from "@/lib/crossword-generator";

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
  if (!config?.isCrossword) {
    return NextResponse.json({ error: "Not a crossword tournament" }, { status: 400 });
  }

  // Fetch clues from crossword_clues table
  const { data: clues, error } = await supabase
    .from("crossword_clues")
    .select("*");

  if (error || !clues) {
    return NextResponse.json({ error: "Failed to fetch clues" }, { status: 500 });
  }

  // Shuffle clues
  for (let i = clues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clues[i], clues[j]] = [clues[j], clues[i]];
  }

  const entries = clues.slice(0, 50).map((c) => ({
    answer: c.answer,
    clue: c.clue,
    questionId: c.id,
  }));

  const puzzle = generateCrossword(entries);

  if (!puzzle || puzzle.words.length < 6) {
    return NextResponse.json({ error: "Failed to generate crossword puzzle" }, { status: 500 });
  }

  return NextResponse.json({
    puzzle,
    timerSeconds: config.timerSeconds,
  });
}
