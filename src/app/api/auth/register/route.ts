import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
  const body = await request.json();
  const { email, password, displayName, discipline: rawDiscipline } = body as {
    email?: string;
    password?: string;
    displayName?: string;
    discipline?: string;
  };
  const VALID_DISCIPLINES = ["physicist", "therapist", "oncologist", "engineer"];
  const discipline = rawDiscipline && VALID_DISCIPLINES.includes(rawDiscipline) ? rawDiscipline : "physicist";

  if (!email || !password || !displayName) {
    return NextResponse.json(
      { error: "Email, password, and display name are required." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: exists } = await supabase.rpc("email_exists", {
    p_email: email,
  });

  if (exists) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data: newId, error } = await supabase.rpc("register_user", {
    p_name: displayName,
    p_email: email,
    p_password_hash: passwordHash,
  });

  if (error || !newId) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }

  // Set the discipline on the newly created profile
  if (discipline !== "physicist") {
    await supabase
      .from("profiles")
      .update({ discipline })
      .eq("id", newId);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
