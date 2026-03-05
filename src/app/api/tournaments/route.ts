import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getTournamentSlots, TOURNAMENT_TYPES } from "@/lib/tournaments";

export async function GET() {
  try {
  const supabase = createServiceClient();
  const now = new Date();
  const slots = getTournamentSlots(now);

  // Lazy-create tournaments that should exist (single batch upsert)
  const rows = slots.map((slot) => {
    const config = TOURNAMENT_TYPES[slot.type];
    return {
      type: slot.type,
      starts_at: slot.startsAt.toISOString(),
      ends_at: slot.endsAt.toISOString(),
      status: slot.status,
      config: {
        timerSeconds: config.timerSeconds,
        questionsPerRound: config.questionsPerRound,
        durationMinutes: config.durationMinutes,
        ...(config.isCrossword ? { isCrossword: true, wordsTarget: config.wordsTarget } : {}),
        ...(config.isSuddenDeath ? { isSuddenDeath: true } : {}),
        ...(config.isSprint ? { isSprint: true } : {}),
        ...(config.isMatch ? { isMatch: true, pairsCount: config.pairsCount } : {}),
        ...(config.isHotSeat ? { isHotSeat: true } : {}),
      },
    };
  });
  await supabase.from("tournaments").upsert(rows, { onConflict: "type,starts_at", ignoreDuplicates: true });

  // Run all status transitions in parallel
  await Promise.all([
    // Clean up renamed tournament types (millionaire → hot-seat)
    supabase
      .from("tournaments")
      .update({ status: "finished" })
      .in("status", ["active", "upcoming"])
      .like("type", "millionaire-%"),
    // Transition active tournaments that have ended
    supabase
      .from("tournaments")
      .update({ status: "finished" })
      .eq("status", "active")
      .lt("ends_at", now.toISOString()),
    // Transition upcoming tournaments whose window has fully passed
    supabase
      .from("tournaments")
      .update({ status: "finished" })
      .eq("status", "upcoming")
      .lt("ends_at", now.toISOString()),
    // Transition upcoming tournaments that have started
    supabase
      .from("tournaments")
      .update({ status: "active" })
      .eq("status", "upcoming")
      .lte("starts_at", now.toISOString())
      .gt("ends_at", now.toISOString()),
  ]);

  // Fetch active + upcoming tournaments
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*")
    .in("status", ["active", "upcoming"])
    .order("starts_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach participant counts for active/upcoming
  const ids = (tournaments || []).map((t) => t.id);
  const counts: Record<string, number> = {};

  if (ids.length > 0) {
    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .in("tournament_id", ids);

    for (const p of participants || []) {
      counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1;
    }
  }

  const result = (tournaments || []).map((t) => ({
    ...t,
    participant_count: counts[t.id] || 0,
  }));

  // Fetch last 5 finished tournaments with winner info
  const { data: finishedRaw } = await supabase
    .from("tournaments")
    .select("*")
    .eq("status", "finished")
    .order("ends_at", { ascending: false })
    .limit(5);

  const finishedIds = (finishedRaw || []).map((t) => t.id);
  const finishedCounts: Record<string, number> = {};
  const finishedWinners: Record<string, { display_name: string; total_points: number }> = {};

  if (finishedIds.length > 0) {
    // Batch: get all participants for finished tournaments in one query
    const { data: fParticipants } = await supabase
      .from("tournament_participants")
      .select("tournament_id, display_name, total_points")
      .in("tournament_id", finishedIds);

    for (const p of fParticipants || []) {
      finishedCounts[p.tournament_id] = (finishedCounts[p.tournament_id] || 0) + 1;
      const current = finishedWinners[p.tournament_id];
      if (!current || p.total_points > current.total_points) {
        finishedWinners[p.tournament_id] = { display_name: p.display_name, total_points: p.total_points };
      }
    }
  }

  const finished = (finishedRaw || []).map((t) => {
    const winner = finishedWinners[t.id] || null;
    return {
      ...t,
      participant_count: finishedCounts[t.id] || 0,
      winner_name: winner?.display_name || null,
      winner_points: winner?.total_points || null,
    };
  });

  return NextResponse.json({ tournaments: result, finished });
  } catch (error) {
    console.error("GET /api/tournaments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
