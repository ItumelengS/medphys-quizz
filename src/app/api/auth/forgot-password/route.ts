import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
  const body = await request.json();
  const { email } = body as { email?: string };

  if (!email) {
    return NextResponse.json(
      { error: "Email is required." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("create_password_reset_token", {
    p_email: email,
  });

  if (!error && data && data.length > 0) {
    const { token, user_name } = data[0];
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const resetUrl = `${protocol}://${host}/login/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(email, user_name, resetUrl);
    } catch (err) {
      console.error("Failed to send reset email:", err);
    }
  }

  // Always return success to avoid leaking whether the email exists
  return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
