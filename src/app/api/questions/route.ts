import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");
  const shuffle = searchParams.get("shuffle") === "true";
  const limit = parseInt(searchParams.get("limit") || "0") || undefined;

  let query = supabase.from("questions").select("*");

  if (section && section !== "all") {
    query = query.eq("section_id", section);
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
