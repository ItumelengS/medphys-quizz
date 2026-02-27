import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import { calculateCrosswordScore, calculateXp } from "@/lib/scoring";

interface CrosswordRoundPayload {
  berserk: boolean;
  wordsCompleted: number;
  wordsRevealed: number;
  totalWords: number;
  allComplete: boolean;
  clueIds: string[];
  durationSeconds: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = (await req.json()) as CrosswordRoundPayload;
  const { berserk, wordsCompleted, wordsRevealed, totalWords, allComplete, clueIds, durationSeconds } = body;

  const supabase = createServiceClient();

  // Verify tournament is active and is a crossword type
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, type, status, ends_at")
    .eq("id", id)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.status === "finished" || new Date(tournament.ends_at) < new Date()) {
    return NextResponse.json({ error: "Tournament has ended" }, { status: 400 });
  }

  const config = TOURNAMENT_TYPES[tournament.type];
  if (!config?.isCrossword) {
    return NextResponse.json({ error: "Not a crossword tournament" }, { status: 400 });
  }

  // Validate clue IDs exist in crossword_clues
  if (clueIds.length > 0) {
    const { data: validClues } = await supabase
      .from("crossword_clues")
      .select("id")
      .in("id", clueIds);

    if (!validClues || validClues.length === 0) {
      return NextResponse.json({ error: "Invalid clue IDs" }, { status: 400 });
    }
  }

  // Calculate score using crossword scoring
  const wordsWithoutReveal = Math.max(0, wordsCompleted - wordsRevealed);
  const maxTimer = berserk ? Math.ceil(config.timerSeconds / 2) : config.timerSeconds;
  const remainingSeconds = Math.max(0, maxTimer - durationSeconds);

  const baseScore = calculateCrosswordScore(
    wordsWithoutReveal,
    wordsRevealed,
    allComplete && wordsRevealed === 0,
    true,
    remainingSeconds
  );

  // Time bonus: remaining seconds / 10 * 5
  const timeBonus = Math.floor(remainingSeconds / 10) * 5;

  // For the RPC: score = wordsWithoutReveal (used for accuracy calc), total = totalWords
  // The RPC uses accuracy = score/total * 100 for fire multiplier
  const accuracy = totalWords > 0 ? (wordsWithoutReveal / totalWords) * 100 : 0;

  // Submit round via RPC — we pass baseScore as time_bonus and wordsWithoutReveal as score
  // so the RPC's (score * 100 + time_bonus) gives us the right base points
  const { data: result, error } = await supabase.rpc("submit_tournament_round", {
    p_tournament_id: id,
    p_user_id: userId,
    p_score: wordsWithoutReveal,
    p_total: totalWords,
    p_time_bonus: timeBonus + (wordsRevealed * 5) + (allComplete && wordsRevealed === 0 ? 75 : 0),
    p_berserk: berserk,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Award XP
  const pointsEarned = result?.points_earned || 0;
  const xpResult = calculateXp(pointsEarned, "crossword", wordsCompleted, totalWords, 0);

  await supabase.rpc("increment_xp", {
    p_user_id: userId,
    p_amount: xpResult.totalXp,
  });

  return NextResponse.json({
    ...result,
    wordsCompleted,
    wordsRevealed,
    wordsWithoutReveal,
    totalWords,
    baseScore,
    timeBonus,
    remainingSeconds,
    accuracy: Math.round(accuracy * 10) / 10,
    xp: xpResult,
  });
}
