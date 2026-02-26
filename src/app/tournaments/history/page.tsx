"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import { getEarnedTitles, ARENA_TITLES, type TournamentCareerStats } from "@/lib/arena-titles";
import ArenaBadges from "@/components/ArenaBadges";

interface HistoryEntry {
  id: string;
  type: "blitz" | "rapid" | "marathon";
  starts_at: string;
  ends_at: string;
  status: string;
  total_points: number;
  rounds_played: number;
  best_round_score: number;
  fire_streak: number;
  berserk_rounds: number;
  rank: number;
  total_participants: number;
}

export default function TournamentHistoryPage() {
  const { data: session } = useSession();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [careerStats, setCareerStats] = useState<TournamentCareerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tournaments/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.history) {
          setHistory(data.history);
          setCareerStats(data.careerStats);
        } else if (Array.isArray(data)) {
          setHistory(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!session) return null;

  // Stats summary
  const totalPlayed = history.length;
  const wins = history.filter((h) => h.rank === 1 && h.status === "finished").length;
  const podiums = history.filter((h) => h.rank <= 3 && h.status === "finished").length;
  const totalPoints = history.reduce((sum, h) => sum + h.total_points, 0);

  function getColorClass(type: string) {
    if (type === "blitz") return "text-bauhaus-red";
    if (type === "rapid") return "text-bauhaus-blue";
    return "text-bauhaus-yellow";
  }

  function getBorderColor(type: string) {
    if (type === "blitz") return "border-l-bauhaus-red";
    if (type === "rapid") return "border-l-bauhaus-blue";
    return "border-l-bauhaus-yellow";
  }

  function getRankDisplay(rank: number) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <main className="min-h-dvh pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="animate-fade-up mb-6">
        <Link href="/tournaments" className="text-text-dim text-xs uppercase tracking-widest mb-2 block">
          ← Arena
        </Link>
        <h1 className="text-3xl font-black">
          <span className="text-text-primary">Tournament</span>{" "}
          <span className="text-bauhaus-blue">History</span>
        </h1>
        <div className="w-12 h-1 bg-bauhaus-blue mt-2" />
      </div>

      {/* Career stats */}
      <div className="animate-fade-up stagger-1 mb-6 grid grid-cols-4 gap-2">
        {[
          { label: "Played", value: totalPlayed, color: "text-text-primary" },
          { label: "Wins", value: wins, color: "text-bauhaus-yellow" },
          { label: "Podiums", value: podiums, color: "text-bauhaus-blue" },
          { label: "Total Pts", value: totalPoints.toLocaleString(), color: "text-bauhaus-red" },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-none border-2 border-surface-border text-center">
            <div className={`font-mono text-lg font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-text-dim text-[10px] uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Arena titles */}
      {careerStats && (() => {
        const earned = getEarnedTitles(careerStats);
        const progress = ARENA_TITLES.filter((t) => !earned.find((e) => e.id === t.id));
        return (
          <div className="animate-fade-up stagger-2 mb-6">
            {earned.length > 0 && (
              <div className="mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-text-dim mb-2">Earned Titles</h2>
                <ArenaBadges titles={earned} />
              </div>
            )}
            {progress.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-text-dim mb-2">
                  {earned.length > 0 ? "Next Titles" : "Titles to Earn"}
                </h2>
                <div className="space-y-1">
                  {progress.slice(0, 3).map((title) => (
                    <div key={title.id} className="flex items-center gap-2 text-xs text-text-dim">
                      <span className="opacity-40">{title.icon}</span>
                      <span className="opacity-40 font-bold">{title.title}</span>
                      <span className="text-text-dim/50">— {title.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* History list */}
      {loading ? (
        <div className="text-text-secondary text-center py-12">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-text-dim text-sm mb-3">No tournaments played yet</div>
          <Link href="/tournaments" className="text-bauhaus-blue text-sm font-bold uppercase tracking-wider">
            Join your first arena →
          </Link>
        </div>
      ) : (
        <div className="animate-fade-up stagger-2 space-y-2">
          {history.map((entry) => {
            const config = TOURNAMENT_TYPES[entry.type] || TOURNAMENT_TYPES.blitz;
            const isWin = entry.rank === 1 && entry.status === "finished";

            return (
              <Link key={entry.id} href={`/tournaments/${entry.id}`}>
                <div
                  className={`p-3 rounded-none border-2 border-l-4 ${getBorderColor(entry.type)} transition-all hover:scale-[1.01] ${
                    isWin ? "bg-surface" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span className={`text-sm font-bold uppercase tracking-wider ${getColorClass(entry.type)}`}>
                        {config.label}
                      </span>
                      {entry.status !== "finished" && (
                        <span className="text-[10px] font-mono text-text-dim uppercase bg-surface px-1.5 py-0.5 border border-surface-border">
                          {entry.status}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-dim font-mono">
                      {formatDate(entry.starts_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span className="font-mono font-bold text-text-primary">
                        {getRankDisplay(entry.rank)}
                      </span>
                      <span>of {entry.total_participants}</span>
                      <span>·</span>
                      <span>{entry.rounds_played}r</span>
                      {entry.fire_streak > 0 && <span>· 🔥{entry.fire_streak}</span>}
                      {entry.berserk_rounds > 0 && <span>· 💀{entry.berserk_rounds}</span>}
                    </div>
                    <span className="font-mono font-bold text-sm text-text-primary">
                      {entry.total_points} pts
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-bauhaus-blue bg-bg">
        <div className="max-w-lg mx-auto flex justify-around py-3 px-4">
          <Link href="/" className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors">
            <span className="text-lg">🏠</span>
            <span className="text-xs uppercase tracking-wider">Home</span>
          </Link>
          <Link href="/tournaments" className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors">
            <span className="text-lg">⚔️</span>
            <span className="text-xs uppercase tracking-wider">Arena</span>
          </Link>
          <Link href="/tournaments/history" className="flex flex-col items-center gap-1 text-bauhaus-blue transition-colors">
            <span className="text-lg">📜</span>
            <span className="text-xs uppercase tracking-wider font-bold">History</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
