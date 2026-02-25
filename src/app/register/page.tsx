"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const state = storage.getState();
    if (state.player.name) {
      router.replace("/");
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError("Name must be at least 3 characters");
      return;
    }
    if (trimmed.length > 20) {
      setError("Name must be 20 characters or less");
      return;
    }

    storage.updateState((s) => ({
      ...s,
      player: {
        ...s.player,
        name: trimmed,
        createdAt: new Date().toISOString(),
      },
    }));

    router.replace("/");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <h1 className="text-3xl font-black mb-2 text-center">
          <span className="bg-gradient-to-r from-accent to-[#60a5fa] bg-clip-text text-transparent">
            MedPhys
          </span>{" "}
          <span className="text-text-primary">Speed Quiz</span>
        </h1>
        <p className="text-text-secondary text-sm text-center mb-8">
          Enter your name to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Your name"
              maxLength={20}
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-text-primary outline-none focus:border-accent transition-colors placeholder:text-text-dim"
            />
            {error && (
              <p className="text-error text-xs mt-2">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-sm bg-accent text-bg hover:opacity-90 transition-opacity"
          >
            Start Playing
          </button>
        </form>

        <p className="text-text-dim text-xs text-center mt-6">
          3–20 characters
        </p>
      </div>
    </main>
  );
}
