import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getTournamentSlots, TOURNAMENT_TYPES } from "@/lib/tournaments";

export async function GET() {
  const supabase = createServiceClient();
  const now = new Date();
  const slots = getTournamentSlots(now);

  // Lazy-create tournaments that should exist
  for (const slot of slots) {
    const config = TOURNAMENT_TYPES[slot.type];
    await supabase.from("tournaments").upsert(
      {
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
        },
      },
      { onConflict: "type,starts_at", ignoreDuplicates: true }
    );
  }

  // Transition active tournaments that have ended
  await supabase
    .from("tournaments")
    .update({ status: "finished" })
    .eq("status", "active")
    .lt("ends_at", now.toISOString());

  // Transition upcoming tournaments whose window has fully passed (never went active)
  await supabase
    .from("tournaments")
    .update({ status: "finished" })
    .eq("status", "upcoming")
    .lt("ends_at", now.toISOString());

  // Transition upcoming tournaments that have started (and are still within their window)
  await supabase
    .from("tournaments")
    .update({ status: "active" })
    .eq("status", "upcoming")
    .lte("starts_at", now.toISOString())
    .gt("ends_at", now.toISOString());

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

  const finished = await Promise.all(
    (finishedRaw || []).map(async (t) => {
      // Get participant count
      const { count } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", t.id);

      // Get top scorer
      const { data: top } = await supabase
        .from("tournament_participants")
        .select("display_name, total_points")
        .eq("tournament_id", t.id)
        .order("total_points", { ascending: false })
        .limit(1);

      const winner = top && top.length > 0 ? top[0] : null;

      return {
        ...t,
        participant_count: count || 0,
        winner_name: winner?.display_name || null,
        winner_points: winner?.total_points || null,
      };
    })
  );

  return NextResponse.json({ tournaments: result, finished });
}
