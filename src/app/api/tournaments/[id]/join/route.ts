import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Verify tournament exists and isn't finished
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.status === "finished") {
    return NextResponse.json({ error: "Tournament has ended" }, { status: 400 });
  }

  // Get display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", session.user.id)
    .single();

  const displayName = profile?.display_name || session.user.name || "Player";

  // Upsert participant
  const { error } = await supabase.from("tournament_participants").upsert(
    {
      tournament_id: id,
      user_id: session.user.id,
      display_name: displayName,
    },
    { onConflict: "tournament_id,user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ joined: true });
}
