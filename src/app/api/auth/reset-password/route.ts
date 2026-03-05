import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { token, password } = body as { token?: string; password?: string };

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password are required." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const supabase = createServiceClient();

  const { data: success, error } = await supabase.rpc(
    "use_password_reset_token",
    {
      p_token: token,
      p_new_hash: passwordHash,
    }
  );

  if (error || !success) {
    return NextResponse.json(
      { error: "Invalid or expired reset link. Please request a new one." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
