"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { storage } from "@/lib/storage";
import type { LeaderboardEntry } from "@/lib/types";

type Tab = "all" | "daily" | "speed";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setEntries(storage.getState().leaderboard);
  }, []);
  const [tab, setTab] = useState<Tab>("all");

  const filtered = entries.filter((e) => {
    if (tab === "all") return true;
    if (tab === "daily") return e.mode === "daily";
    return e.mode === "speed";
  });

  const bestScore = filtered.length > 0 ? Math.max(...filtered.map((e) => e.points)) : 0;

  function getMedal(index: number): string {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  }

  return (
    <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-text-primary">Leaderboard</h1>
        <Link href="/" className="text-text-secondary text-sm hover:text-text-primary transition-colors">
          ← Back
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "speed", "daily"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-text-secondary border border-surface-border hover:text-text-primary"
            }`}
          >
            {t === "all" ? "All Time" : t === "daily" ? "Daily" : "Speed"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🏅</div>
          <p className="text-text-secondary text-sm">No scores yet. Play a quiz to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry, i) => (
            <div
              key={entry.id}
              className={`animate-fade-up flex items-center gap-3 p-3 rounded-xl border ${
                entry.points === bestScore
                  ? "border-gold/30 bg-gold-dim"
                  : "border-surface-border bg-surface"
              }`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className="w-8 text-center font-mono text-sm font-bold text-text-dim">
                {getMedal(i)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-text-primary truncate">
                  {entry.sectionName}
                </div>
                <div className="text-text-dim text-xs">
                  {new Date(entry.date).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-text-primary">
                  {entry.score}/{entry.total}
                </div>
                <div className="font-mono text-xs text-accent">{entry.points} pts</div>
              </div>
              {entry.points === bestScore && (
                <span className="text-sm">⭐</span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
