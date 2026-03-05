"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSubmitted(true);
    setLoading(false);
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up text-center">
        <h1 className="text-3xl font-black mb-2">
          <span className="text-bauhaus-blue">MedPhys</span>{" "}
          <span className="text-text-primary">Speed Quiz</span>
        </h1>
        <p className="text-text-secondary text-sm font-light mb-4">
          Reset your password
        </p>

        {/* Bauhaus decorative shapes */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="bauhaus-circle" />
          <div className="bauhaus-square" />
          <div className="bauhaus-triangle" />
        </div>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-text-secondary text-sm font-light">
              If an account exists with that email, we&apos;ve sent a password
              reset link. Please check your inbox.
            </p>
            <Link
              href="/login"
              className="inline-block text-bauhaus-blue text-sm hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label
                  htmlFor="email"
                  className="block text-text-secondary text-xs mb-1 uppercase tracking-widest"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-none bg-surface border-2 border-surface-border text-text-primary text-sm font-light focus:outline-none focus:border-bauhaus-blue"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-none font-bold text-sm bg-bauhaus-blue text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <p className="text-text-secondary text-sm mt-6 font-light">
              Remember your password?{" "}
              <Link
                href="/login"
                className="text-bauhaus-blue hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
