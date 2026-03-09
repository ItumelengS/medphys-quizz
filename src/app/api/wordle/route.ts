import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const minLen = parseInt(searchParams.get("minLen") || "5") || 5;
    const maxLen = parseInt(searchParams.get("maxLen") || "7") || 7;

    const supabase = createServiceClient();

    // Fetch all crossword clue answers within the length range
    const { data, error } = await supabase
      .from("crossword_clues")
      .select("id, answer, clue, category");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to words that are pure alpha and within length range
    const candidates = (data || []).filter((c) => {
      const clean = c.answer.replace(/[^A-Za-z]/g, "");
      return clean.length >= minLen && clean.length <= maxLen && clean.length === c.answer.length;
    });

    if (candidates.length === 0) {
      return NextResponse.json({ error: "No words found for this length" }, { status: 404 });
    }

    // Pick a random word
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    return NextResponse.json({
      id: pick.id,
      answer: pick.answer.toUpperCase(),
      clue: pick.clue,
      category: pick.category,
      length: pick.answer.replace(/[^A-Za-z]/g, "").length,
    });
  } catch (error) {
    console.error("GET /api/wordle error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
