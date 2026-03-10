import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { applyDisciplineFilter } from "@/lib/discipline-filter";
import { applyDifficultyFilter } from "@/lib/difficulty-filter";
import { prioritizeFreshQuestions } from "@/lib/fresh-questions";

export async function GET(req: NextRequest) {
  try {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");
  const shuffle = searchParams.get("shuffle") === "true";
  const limit = parseInt(searchParams.get("limit") || "0") || undefined;
  const difficulty = searchParams.get("difficulty");
  const minDifficulty = searchParams.get("minDifficulty");
  const maxDifficulty = searchParams.get("maxDifficulty");

  const discipline = session.user.discipline || "physicist";
  let query = applyDisciplineFilter(supabase.from("questions").select("*"), discipline);

  if (section && section !== "all") {
    query = query.eq("section_id", section);
  }

  if (difficulty) {
    query = query.eq("difficulty", parseInt(difficulty));
  } else if (minDifficulty || maxDifficulty) {
    if (minDifficulty) {
      query = query.gte("difficulty", parseInt(minDifficulty));
    }
    if (maxDifficulty) {
      query = query.lte("difficulty", parseInt(maxDifficulty));
    }
  } else {
    // No explicit difficulty params — apply user-level defaults
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", session.user.id)
      .single();
    query = applyDifficultyFilter(query, profile?.xp ?? 0);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let questions = data || [];

  if (shuffle) {
    // Prioritize unseen/stale questions when shuffling
    const effectiveLimit = limit || questions.length;
    questions = await prioritizeFreshQuestions(supabase, session.user.id, questions, effectiveLimit);
  } else if (limit) {
    questions = questions.slice(0, limit);
  }

  return NextResponse.json(questions);
  } catch (error) {
    console.error("GET /api/questions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
