import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import { calculateXp } from "@/lib/scoring";
import { checkRoundLimit } from "@/lib/tournament-round-check";
import { updateTournamentRating } from "@/lib/rating-update";

interface ReactionRoundsPayload {
  roundsSurvived: number;
  points: number;
  avgReactionMs: number;
  bestReactionMs: number;
  role: string;
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
    const body = (await req.json()) as ReactionRoundsPayload;
    const { roundsSurvived, points, avgReactionMs, bestReactionMs, role } = body;

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
    if (!config?.isReactionRounds) {
      return NextResponse.json({ error: "Not a reaction rounds tournament" }, { status: 400 });
    }

    // Score = rounds survived, total = rounds survived + 1 (the fatal round)
    const score = roundsSurvived;
    const total = roundsSurvived + 1;
    // Time bonus based on points earned from speed
    const timeBonus = Math.max(0, points - score * 20);

    const { data: result, error } = await supabase.rpc("submit_tournament_round", {
      p_tournament_id: id,
      p_user_id: userId,
      p_score: score,
      p_total: total,
      p_time_bonus: timeBonus,
      p_berserk: false,
    });

    if (error) {
      const isRoundLimit = error.message?.includes("Round limit");
      return NextResponse.json({ error: error.message }, { status: isRoundLimit ? 400 : 500 });
    }

    // Award XP
    const pointsEarned = result?.base_points || 0;
    const xpResult = calculateXp(pointsEarned, "reaction-rounds", score, total, 0);

    await supabase.rpc("increment_xp", {
      p_user_id: userId,
      p_amount: xpResult.totalXp,
    });

    // Update variant rating (Glicko-2)
    let ratingUpdate = null;
    try {
      ratingUpdate = await updateTournamentRating(supabase, userId, tournament.type, id, score, total, pointsEarned);
    } catch (e) {
      console.error("Rating update failed (non-fatal):", e);
    }

    return NextResponse.json({
      ...result,
      roundsSurvived,
      points,
      avgReactionMs,
      bestReactionMs,
      role,
      xp: xpResult,
      ratingUpdate,
    });
  } catch (error) {
    console.error("POST /api/tournaments/[id]/reaction-rounds-round error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
