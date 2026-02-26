import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // "speed" | "daily" | null (all)

  let query = supabase
    .from("leaderboard_entries")
    .select("*")
    .order("points", { ascending: false })
    .limit(50);

  if (mode && mode !== "all") {
    query = query.eq("mode", mode);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
