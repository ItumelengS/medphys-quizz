import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import { calculateConnectionsScore, calculateXp } from "@/lib/scoring";
import { checkRoundLimit } from "@/lib/tournament-round-check";
import { updateTournamentRating } from "@/lib/rating-update";

interface ConnectionsRoundPayload {
  groupsFound: number;
  mistakes: number;
  won: boolean;
  puzzleId: string;
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
    const body = (await req.json()) as ConnectionsRoundPayload;
    const { groupsFound, mistakes, won, puzzleId } = body;

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
    if (!config?.isConnections) {
      return NextResponse.json({ error: "Not a connections tournament" }, { status: 400 });
    }

    const maxMistakes = 4;
    const mistakesLeft = maxMistakes - mistakes;
    const perfect = mistakes === 0 && won;
    const baseScore = calculateConnectionsScore(
      won ? groupsFound : 0,
      won ? mistakesLeft : 0,
      perfect
    );

    const score = won ? 4 : 0;

    const { data: result, error } = await supabase.rpc("submit_tournament_round", {
      p_tournament_id: id,
      p_user_id: userId,
      p_score: score,
      p_total: 4,
      p_time_bonus: Math.max(0, baseScore - 200),
      p_berserk: false,
    });

    if (error) {
      const isRoundLimit = error.message?.includes("Round limit");
      return NextResponse.json({ error: error.message }, { status: isRoundLimit ? 400 : 500 });
    }

    const pointsEarned = result?.base_points || 0;
    const xpResult = calculateXp(pointsEarned, "arena", score, 4, 0);
    const arenaAccuracy = score / 4;
    const arenaXp = arenaAccuracy < 0.7 ? Math.floor(xpResult.totalXp / 10) : xpResult.totalXp;

    await supabase.rpc("increment_xp", {
      p_user_id: userId,
      p_amount: arenaXp,
    });

    // Update variant rating (Glicko-2)
    let ratingUpdate = null;
    try {
      ratingUpdate = await updateTournamentRating(supabase, userId, tournament.type, id, score, 4, pointsEarned);
    } catch (e) {
      console.error("Rating update failed (non-fatal):", e);
    }

    return NextResponse.json({
      ...result,
      groupsFound,
      mistakes,
      won,
      baseScore,
      xp: xpResult,
      ratingUpdate,
    });
  } catch (error) {
    console.error("POST /api/tournaments/[id]/connections-round error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
