import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");
  const shuffle = searchParams.get("shuffle") === "true";
  const limit = parseInt(searchParams.get("limit") || "0") || undefined;
  const difficulty = searchParams.get("difficulty");
  const minDifficulty = searchParams.get("minDifficulty");
  const maxDifficulty = searchParams.get("maxDifficulty");

  let query = supabase.from("questions").select("*");

  if (section && section !== "all") {
    query = query.eq("section_id", section);
  }

  if (difficulty) {
    query = query.eq("difficulty", parseInt(difficulty));
  } else {
    if (minDifficulty) {
      query = query.gte("difficulty", parseInt(minDifficulty));
    }
    if (maxDifficulty) {
      query = query.lte("difficulty", parseInt(maxDifficulty));
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let questions = data || [];

  if (shuffle) {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  }

  if (limit) {
    questions = questions.slice(0, limit);
  }

  return NextResponse.json(questions);
}
