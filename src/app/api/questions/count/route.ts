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
  const { count } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error("GET /api/questions/count error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
