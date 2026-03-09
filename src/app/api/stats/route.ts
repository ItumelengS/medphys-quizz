import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const userId = session.user.id;

  const [profileRes, statsRes, historyRes, sectionsRes, ratingsRes, ratingHistoryRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("user_stats").select("*").eq("user_id", userId).single(),
    supabase.from("question_history").select("question_id, times_shown, times_correct, last_shown").eq("user_id", userId),
    supabase.from("sections").select("*").order("sort_order"),
    supabase.from("variant_ratings").select("variant, rating, rd, peak_rating, games_count, last_played").eq("user_id", userId),
    supabase.from("rating_history").select("variant, rating, played_at").eq("user_id", userId).order("played_at", { ascending: true }).limit(300),
  ]);

  const history = historyRes.data || [];
  const sectionMastery: Record<string, { shown: number; correct: number; percent: number }> = {};

  // Only fetch section_id for questions the user has interacted with (not ALL questions)
  const userQuestionIds = history.map((h) => h.question_id);
  const questionSectionMap: Record<string, string> = {};

  if (userQuestionIds.length > 0) {
    const { data: qSections } = await supabase
      .from("questions")
      .select("id, section_id")
      .in("id", userQuestionIds);

    for (const q of qSections || []) {
      questionSectionMap[q.id] = q.section_id;
    }
  }

  // Aggregate per section in a single pass
  const sectionAgg: Record<string, { shown: number; correct: number }> = {};
  for (const h of history) {
    const sectionId = questionSectionMap[h.question_id];
    if (!sectionId) continue;
    if (!sectionAgg[sectionId]) sectionAgg[sectionId] = { shown: 0, correct: 0 };
    sectionAgg[sectionId].shown += h.times_shown;
    sectionAgg[sectionId].correct += h.times_correct;
  }

  for (const section of sectionsRes.data || []) {
    const agg = sectionAgg[section.id] || { shown: 0, correct: 0 };
    sectionMastery[section.id] = {
      shown: agg.shown,
      correct: agg.correct,
      percent: agg.shown > 0 ? Math.round((agg.correct / agg.shown) * 100) : 0,
    };
  }

  // Activity calendar from question history
  const activityMap: Record<string, number> = {};
  for (const record of history) {
    if (record.last_shown) {
      const day = record.last_shown.split("T")[0];
      activityMap[day] = (activityMap[day] || 0) + 1;
    }
  }

  // Game results aggregates: time played, per-variant stats, win rate
  const { data: gameAgg } = await supabase
    .from("game_results")
    .select("variant, score, total, duration_seconds, played_at")
    .eq("user_id", userId)
    .order("played_at", { ascending: false });

  const games = gameAgg || [];
  let totalTimePlayed = 0;
  let totalWins = 0;
  const variantStats: Record<string, { played: number; wins: number; totalTime: number }> = {};

  for (const g of games) {
    const dur = g.duration_seconds || 0;
    totalTimePlayed += dur;
    const won = g.score === g.total && g.total > 0;
    if (won) totalWins++;

    if (!variantStats[g.variant]) variantStats[g.variant] = { played: 0, wins: 0, totalTime: 0 };
    variantStats[g.variant].played++;
    variantStats[g.variant].totalTime += dur;
    if (won) variantStats[g.variant].wins++;
  }

  return NextResponse.json({
    profile: {
      ...profileRes.data,
      confirmed_level: profileRes.data?.confirmed_level || 1,
    },
    stats: statsRes.data,
    sections: sectionsRes.data,
    sectionMastery,
    activityMap,
    variantRatings: ratingsRes.data || [],
    ratingHistory: ratingHistoryRes.data || [],
    totalTimePlayed,
    totalWins,
    totalGames: games.length,
    variantStats,
    firstGame: games.length > 0 ? games[games.length - 1].played_at : null,
  });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
