import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getCareerLevel, CAREER_LEVELS } from "@/lib/scoring";
import { parseInventory } from "@/lib/powerups";
import type { PowerUpInventory } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const supabase = createServiceClient();
  const body = await req.json();

  const { passed, powerupsUsed } = body as {
    passed: boolean;
    powerupsUsed: PowerUpInventory;
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, powerups, confirmed_level")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const currentInventory = parseInventory(profile.powerups);

  // Deduct used power-ups
  const newInventory: PowerUpInventory = { ...currentInventory };
  if (powerupsUsed.fifty_fifty > 0) {
    newInventory.fifty_fifty = Math.max(0, newInventory.fifty_fifty - powerupsUsed.fifty_fifty);
  }
  if (powerupsUsed.time_freeze > 0) {
    newInventory.time_freeze = Math.max(0, newInventory.time_freeze - powerupsUsed.time_freeze);
  }

  if (!passed) {
    await supabase
      .from("profiles")
      .update({ powerups: newInventory })
      .eq("id", userId);
    return NextResponse.json({ success: false, message: "Exam failed. Try again!" });
  }

  // Check eligibility
  const xpLevel = getCareerLevel(profile.xp);
  const confirmedLevel = profile.confirmed_level || 1;

  if (xpLevel.level <= confirmedLevel) {
    return NextResponse.json({ error: "Not eligible for level up" }, { status: 400 });
  }

  // Promote one level at a time
  const newConfirmedLevel = confirmedLevel + 1;
  const levelInfo = CAREER_LEVELS.find((l) => l.level === newConfirmedLevel) || CAREER_LEVELS[0];

  await supabase
    .from("profiles")
    .update({
      confirmed_level: newConfirmedLevel,
      powerups: newInventory,
    })
    .eq("id", userId);

  return NextResponse.json({
    success: true,
    newLevel: levelInfo,
    message: `Congratulations! You are now ${levelInfo.title}!`,
  });
}
