"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
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

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed.");
      setLoading(false);
      return;
    }

    // Auto sign-in after successful registration
    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInRes?.error) {
      setError("Account created but sign-in failed. Please sign in manually.");
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up text-center">
        <h1 className="text-3xl font-black mb-2">
          <span className="text-bauhaus-blue">MedPhys</span>{" "}
          <span className="text-text-primary">Speed Quiz</span>
        </h1>
        <p className="text-text-secondary text-sm font-light mb-4">
          Create your account
        </p>

        {/* Bauhaus decorative shapes */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="bauhaus-circle" />
          <div className="bauhaus-square" />
          <div className="bauhaus-triangle" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label htmlFor="displayName" className="block text-text-secondary text-xs mb-1 uppercase tracking-widest">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-none bg-surface border-2 border-surface-border text-text-primary text-sm font-light focus:outline-none focus:border-bauhaus-blue"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-text-secondary text-xs mb-1 uppercase tracking-widest">
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
          <div>
            <label htmlFor="password" className="block text-text-secondary text-xs mb-1 uppercase tracking-widest">
              Password
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
            <label htmlFor="confirmPassword" className="block text-text-secondary text-xs mb-1 uppercase tracking-widest">
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
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-text-secondary text-sm mt-6 font-light">
          Already have an account?{" "}
          <Link href="/login" className="text-bauhaus-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
