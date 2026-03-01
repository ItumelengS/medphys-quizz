import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const supabase = createServiceClient();

  // Transition status if needed
  const now = new Date().toISOString();
  await supabase
    .from("tournaments")
    .update({ status: "finished" })
    .eq("id", id)
    .eq("status", "active")
    .lt("ends_at", now);

  // Upcoming tournament whose window fully passed without going active
  await supabase
    .from("tournaments")
    .update({ status: "finished" })
    .eq("id", id)
    .eq("status", "upcoming")
    .lt("ends_at", now);

  await supabase
    .from("tournaments")
    .update({ status: "active" })
    .eq("id", id)
    .eq("status", "upcoming")
    .lte("starts_at", now)
    .gt("ends_at", now);

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Leaderboard — top 50 for active/upcoming, full for finished
  const isFinished = tournament.status === "finished";
  let leaderboardQuery = supabase
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", id)
    .order("total_points", { ascending: false });

  if (!isFinished) {
    leaderboardQuery = leaderboardQuery.limit(50);
  }

  const { data: leaderboard } = await leaderboardQuery;

  // Participant count
  const { count } = await supabase
    .from("tournament_participants")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  // Current user's record & rank
  let userRecord = null;
  let userRank = null;

  if (session?.user?.id) {
    const { data: record } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", id)
      .eq("user_id", session.user.id)
      .single();

    if (record) {
      userRecord = record;
      // Get rank
      const { count: above } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", id)
        .gt("total_points", record.total_points);

      userRank = (above || 0) + 1;
    }
  }

  return NextResponse.json({
    tournament,
    leaderboard: leaderboard || [],
    participant_count: count || 0,
    userRecord,
    userRank,
  });
}
