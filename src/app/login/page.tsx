"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up text-center">
        <h1 className="text-3xl font-black mb-2">
          <span className="text-bauhaus-blue">MedPhys</span>{" "}
          <span className="text-text-primary">Speed Quiz</span>
        </h1>
        <p className="text-text-secondary text-sm font-light mb-4">
          Sign in to track your progress
        </p>

        {/* Bauhaus decorative shapes */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="bauhaus-circle" />
          <div className="bauhaus-square" />
          <div className="bauhaus-triangle" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
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
              placeholder="Your password"
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-text-secondary text-sm mt-6 font-light">
          Don&apos;t have an account?{" "}
          <Link href="/login/register" className="text-bauhaus-blue hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center text-text-secondary">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
