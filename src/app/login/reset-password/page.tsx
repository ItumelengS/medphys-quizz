"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to reset password.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-bauhaus-red text-sm">
          Invalid reset link. Please request a new one.
        </p>
        <Link
          href="/login/forgot-password"
          className="inline-block text-bauhaus-blue text-sm hover:underline"
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <p className="text-text-secondary text-sm font-light">
          Your password has been reset successfully.
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-3 rounded-none font-bold text-sm bg-bauhaus-blue text-white hover:opacity-90 transition-opacity text-center"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label
          htmlFor="password"
          className="block text-text-secondary text-xs mb-1 uppercase tracking-widest"
        >
          New Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-none bg-surface border-2 border-surface-border text-text-primary text-sm font-light focus:outline-none focus:border-bauhaus-blue"
          placeholder="At least 6 characters"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-text-secondary text-xs mb-1 uppercase tracking-widest"
        >
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-none bg-surface border-2 border-surface-border text-text-primary text-sm font-light focus:outline-none focus:border-bauhaus-blue"
          placeholder="Repeat password"
        />
      </div>

      {error && (
        <p className="text-bauhaus-red text-xs text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-none font-bold text-sm bg-bauhaus-blue text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up text-center">
        <h1 className="text-3xl font-black mb-2">
          <span className="text-bauhaus-blue">MedPhys</span>{" "}
          <span className="text-text-primary">Speed Quiz</span>
        </h1>
        <p className="text-text-secondary text-sm font-light mb-4">
          Choose a new password
        </p>

        {/* Bauhaus decorative shapes */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="bauhaus-circle" />
          <div className="bauhaus-square" />
          <div className="bauhaus-triangle" />
        </div>

        <Suspense
          fallback={
            <div className="text-text-secondary text-sm">Loading...</div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </div>
    </main>
  );
}
