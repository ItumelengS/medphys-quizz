import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
) {
  await getResend().emails.send({
    from: "MedPhys Speed Quiz <onboarding@resend.dev>",
    to,
    subject: "Reset your password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">
          <span style="color: #2563eb;">MedPhys</span> Speed Quiz
        </h1>
        <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Password Reset</p>
        <hr style="border: none; border-top: 2px solid #eee; margin-bottom: 24px;" />
        <p style="font-size: 14px; color: #333;">Hi ${name},</p>
        <p style="font-size: 14px; color: #333;">
          We received a request to reset your password. Click the button below to choose a new one.
          This link expires in 1 hour.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 32px; background: #2563eb; color: white; text-decoration: none; font-weight: bold; font-size: 14px;">
          Reset Password
        </a>
        <p style="font-size: 12px; color: #999;">If you didn&rsquo;t request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
