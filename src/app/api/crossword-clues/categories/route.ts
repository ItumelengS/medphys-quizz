import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("crossword_clues")
    .select("category");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unique = [...new Set((data || []).map((r: { category: string }) => r.category))];
  return NextResponse.json(unique);
}
