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

  // For each tournament, get user's rank and total participant count
  const results = await Promise.all(
    tournaments.map(async (t) => {
      const participation = participations.find((p) => p.tournament_id === t.id);

      const { count: totalParticipants } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", t.id);

      const { count: above } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", t.id)
        .gt("total_points", participation?.total_points || 0);

      return {
        ...t,
        ...participation,
        rank: (above || 0) + 1,
        total_participants: totalParticipants || 0,
      };
    })
  );

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
