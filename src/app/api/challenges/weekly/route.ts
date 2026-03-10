import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { generateWeeklyChallenges, getWeekStart } from "@/lib/challenges";
import type { ChallengeProgress } from "@/lib/challenges";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const weekStart = getWeekStart();
    const challenges = generateWeeklyChallenges(weekStart);
    const supabase = createServiceClient();

    // Fetch existing progress rows for this week
    const { data: existingProgress } = await supabase
      .from("weekly_challenge_progress")
      .select("challenge_id, current_value, completed, xp_awarded")
      .eq("user_id", userId)
      .eq("week_start", weekStart);

    const progressMap = new Map<string, ChallengeProgress>();
    for (const row of existingProgress || []) {
      progressMap.set(row.challenge_id, {
        challenge_id: row.challenge_id,
        current_value: row.current_value,
        completed: row.completed,
        xp_awarded: row.xp_awarded,
      });
    }

    // Create missing progress rows
    const missing = challenges.filter((c) => !progressMap.has(c.id));
    if (missing.length > 0) {
      const rows = missing.map((c) => ({
        user_id: userId,
        challenge_id: c.id,
        week_start: weekStart,
        current_value: 0,
        completed: false,
        xp_awarded: false,
      }));

      await supabase.from("weekly_challenge_progress").upsert(rows);

      for (const c of missing) {
        progressMap.set(c.id, {
          challenge_id: c.id,
          current_value: 0,
          completed: false,
          xp_awarded: false,
        });
      }
    }

    // Combine challenges with progress
    const result = challenges.map((challenge) => {
      const progress = progressMap.get(challenge.id) || {
        challenge_id: challenge.id,
        current_value: 0,
        completed: false,
        xp_awarded: false,
      };
      return { ...challenge, progress };
    });

    return NextResponse.json({ challenges: result, weekStart });
  } catch (error) {
    console.error("GET /api/challenges/weekly error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
