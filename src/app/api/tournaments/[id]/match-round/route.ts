import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import { calculateMatchScore, calculateXp } from "@/lib/scoring";

interface MatchRoundPayload {
  berserk: boolean;
  pairs: number;
  moves: number;
  timeSeconds: number;
  questionIds: string[];
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
  const body = (await req.json()) as MatchRoundPayload;
  const { berserk, pairs, moves, timeSeconds, questionIds } = body;

  const supabase = createServiceClient();

  // Verify tournament is active and is a match type
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
  if (!config?.isMatch) {
    return NextResponse.json({ error: "Not a match tournament" }, { status: 400 });
  }

  // Validate question IDs exist
  if (questionIds.length > 0) {
    const { data: validQs } = await supabase
      .from("questions")
      .select("id")
      .in("id", questionIds);

    if (!validQs || validQs.length === 0) {
      return NextResponse.json({ error: "Invalid question IDs" }, { status: 400 });
    }
  }

  // Calculate score
  const baseScore = calculateMatchScore(pairs, moves, timeSeconds);

  // For the RPC: score = pairs (all matched), total = pairs
  // time_bonus carries the extra score beyond base
  const timeBonus = Math.max(0, baseScore - pairs * 20);

  // Submit round via RPC
  const { data: result, error } = await supabase.rpc("submit_tournament_round", {
    p_tournament_id: id,
    p_user_id: userId,
    p_score: pairs,
    p_total: pairs,
    p_time_bonus: timeBonus,
    p_berserk: berserk,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Award XP
  const pointsEarned = result?.points_earned || 0;
  const xpResult = calculateXp(pointsEarned, "match", pairs, pairs, 0);

  await supabase.rpc("increment_xp", {
    p_user_id: userId,
    p_amount: xpResult.totalXp,
  });

  return NextResponse.json({
    ...result,
    pairs,
    moves,
    timeSeconds,
    baseScore,
    xp: xpResult,
  });
}
