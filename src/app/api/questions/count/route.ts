import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({ count: count || 0 });
}
