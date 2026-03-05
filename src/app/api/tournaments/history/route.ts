import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all tournaments the user participated in
  const { data: participations } = await supabase
    .from("tournament_participants")
    .select("tournament_id, total_points, rounds_played, best_round_score, fire_streak, berserk_rounds")
    .eq("user_id", session.user.id);

  if (!participations || participations.length === 0) {
    return NextResponse.json([]);
  }

  const tournamentIds = participations.map((p) => p.tournament_id);

  // Fetch tournament details
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, type, starts_at, ends_at, status")
    .in("id", tournamentIds)
    .order("starts_at", { ascending: false });

  if (!tournaments) {
    return NextResponse.json([]);
  }

  // Batch: get all participants for these tournaments in one query
  const { data: allParticipants } = await supabase
    .from("tournament_participants")
    .select("tournament_id, total_points")
    .in("tournament_id", tournamentIds);

  // Build counts and rank data from the single query
  const participantCounts: Record<string, number> = {};
  const pointsList: Record<string, number[]> = {};
  for (const p of allParticipants || []) {
    participantCounts[p.tournament_id] = (participantCounts[p.tournament_id] || 0) + 1;
    if (!pointsList[p.tournament_id]) pointsList[p.tournament_id] = [];
    pointsList[p.tournament_id].push(p.total_points);
  }

  const results = tournaments.map((t) => {
    const participation = participations.find((p) => p.tournament_id === t.id);
    const userPoints = participation?.total_points || 0;
    const above = (pointsList[t.id] || []).filter((pts) => pts > userPoints).length;

    return {
      ...t,
      ...participation,
      rank: above + 1,
      total_participants: participantCounts[t.id] || 0,
    };
  });

  // Compute career stats for arena titles
  const finishedResults = results.filter((r) => r.status === "finished");
  const careerStats = {
    wins: finishedResults.filter((r) => r.rank === 1).length,
    blitzWins: finishedResults.filter((r) => r.rank === 1 && r.type === "blitz").length,
    marathonWins: finishedResults.filter((r) => r.rank === 1 && r.type === "marathon").length,
    podiums: finishedResults.filter((r) => r.rank <= 3).length,
    totalBerserkRounds: participations.reduce((sum, p) => sum + (p.berserk_rounds || 0), 0),
    maxFireStreak: Math.max(0, ...participations.map((p) => p.fire_streak || 0)),
    totalRoundsPlayed: participations.reduce((sum, p) => sum + (p.rounds_played || 0), 0),
  };

  return NextResponse.json({ history: results, careerStats });
}
