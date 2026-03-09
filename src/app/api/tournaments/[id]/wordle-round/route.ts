import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import { calculateWordleScore, calculateXp } from "@/lib/scoring";
import { checkRoundLimit } from "@/lib/tournament-round-check";

interface WordleRoundPayload {
  solved: boolean;
  guessesUsed: number;
  hintUsed: boolean;
  wordLength: number;
  wordId: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = (await req.json()) as WordleRoundPayload;
    const { solved, guessesUsed, hintUsed, wordLength, wordId } = body;

    const supabase = createServiceClient();

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

    const roundCheck = await checkRoundLimit(supabase, id, userId, tournament.type);
    if (!roundCheck.allowed) {
      return NextResponse.json({ error: roundCheck.error }, { status: 400 });
    }

    const config = TOURNAMENT_TYPES[tournament.type];
    if (!config?.isWordle) {
      return NextResponse.json({ error: "Not a wordle tournament" }, { status: 400 });
    }

    const baseScore = calculateWordleScore(solved, guessesUsed, hintUsed, wordLength);
    const score = solved ? 1 : 0;

    const { data: result, error } = await supabase.rpc("submit_tournament_round", {
      p_tournament_id: id,
      p_user_id: userId,
      p_score: score,
      p_total: 1,
      p_time_bonus: Math.max(0, baseScore - 50),
      p_berserk: false,
    });

    if (error) {
      const isRoundLimit = error.message?.includes("Round limit");
      return NextResponse.json({ error: error.message }, { status: isRoundLimit ? 400 : 500 });
    }

    const pointsEarned = result?.base_points || 0;
    const xpResult = calculateXp(pointsEarned, "arena", score, 1, 0);

    await supabase.rpc("increment_xp", {
      p_user_id: userId,
      p_amount: xpResult.totalXp,
    });

    return NextResponse.json({
      ...result,
      solved,
      guessesUsed,
      baseScore,
      xp: xpResult,
    });
  } catch (error) {
    console.error("POST /api/tournaments/[id]/wordle-round error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
