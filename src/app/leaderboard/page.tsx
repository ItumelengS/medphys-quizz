"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { DbLeaderboardEntry } from "@/lib/types";

type Tab = "all" | "daily" | "speed";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<DbLeaderboardEntry[]>([]);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    const mode = tab === "all" ? "" : `?mode=${tab}`;
    fetch(`/api/leaderboard${mode}`)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []));
  }, [tab]);

  const bestScore = entries.length > 0 ? Math.max(...entries.map((e) => e.points)) : 0;

  function getMedal(index: number): string {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  }

  return (
    <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-text-primary uppercase tracking-wider">Leaderboard</h1>
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
            className={`px-4 py-2 rounded-none text-sm font-bold transition-all uppercase tracking-wider ${
              tab === t
                ? "bg-bauhaus-blue text-white"
                : "text-text-secondary border-2 border-surface-border hover:text-text-primary"
            }`}
          >
            {t === "all" ? "All Time" : t === "daily" ? "Daily" : "Speed"}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🏅</div>
          <p className="text-text-secondary text-sm font-light">No scores yet. Play a quiz to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`animate-fade-up flex items-center gap-3 p-3 rounded-none border-2 ${
                entry.points === bestScore
                  ? "border-bauhaus-yellow/30 bg-gold-dim border-l-4 border-l-bauhaus-yellow"
                  : "border-surface-border bg-surface hover:border-l-4 hover:border-l-bauhaus-blue"
              } transition-all`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className="w-8 text-center font-mono text-sm font-bold text-text-dim">
                {getMedal(i)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-text-primary truncate">
                  {entry.player_name}
                </div>
                <div className="text-text-dim text-xs font-light">
                  {entry.section_name} · {new Date(entry.played_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-text-primary">
                  {entry.score}/{entry.total}
                </div>
                <div className="font-mono text-xs text-bauhaus-blue">{entry.points} pts</div>
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
