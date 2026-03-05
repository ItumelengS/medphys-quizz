import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const { id } = await params;
  const session = await auth();
  const supabase = createServiceClient();

  // Transition status if needed (parallel)
  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("tournaments").update({ status: "finished" }).eq("id", id).eq("status", "active").lt("ends_at", now),
    supabase.from("tournaments").update({ status: "finished" }).eq("id", id).eq("status", "upcoming").lt("ends_at", now),
    supabase.from("tournaments").update({ status: "active" }).eq("id", id).eq("status", "upcoming").lte("starts_at", now).gt("ends_at", now),
  ]);

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Fetch leaderboard, participant count, and user record in parallel
  const isFinished = tournament.status === "finished";
  let leaderboardQuery = supabase
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", id)
    .order("total_points", { ascending: false });

  if (!isFinished) {
    leaderboardQuery = leaderboardQuery.limit(50);
  }

  const [{ data: leaderboard }, { count }, userRecordRes] = await Promise.all([
    leaderboardQuery,
    supabase.from("tournament_participants").select("*", { count: "exact", head: true }).eq("tournament_id", id),
    session?.user?.id
      ? supabase.from("tournament_participants").select("*").eq("tournament_id", id).eq("user_id", session.user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userRecord: any = null;
  let userRank = null;
  let tiebreakerEligible = false;

  if (userRecordRes.data) {
    userRecord = userRecordRes.data;
    // Compute rank from leaderboard data instead of extra query
    const above = (leaderboard || []).filter((p: { total_points: number }) => p.total_points > userRecord.total_points).length;
    userRank = above + 1;

    // Check tiebreaker eligibility: player has 2 rounds and is tied for a podium spot
    if (userRecord.rounds_played >= 2 && userRecord.rounds_played < 3) {
      const distinctPoints = [...new Set((leaderboard || []).map((p: { total_points: number }) => p.total_points))].sort((a: number, b: number) => b - a);
      const podiumCutoff = distinctPoints[Math.min(2, distinctPoints.length - 1)] ?? 0;
      tiebreakerEligible = userRecord.total_points >= podiumCutoff;
    }
  }

  return NextResponse.json({
    tournament,
    leaderboard: leaderboard || [],
    participant_count: count || 0,
    userRecord,
    userRank,
    tiebreakerEligible,
  });
  } catch (error) {
    console.error("GET /api/tournaments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
