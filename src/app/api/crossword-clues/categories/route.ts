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

  const { data, error } = await supabase
    .from("crossword_clues")
    .select("category");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unique = [...new Set((data || []).map((r: { category: string }) => r.category))];
  return NextResponse.json(unique);
  } catch (error) {
    console.error("GET /api/crossword-clues/categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
