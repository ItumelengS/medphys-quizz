"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import type { DbTournament } from "@/lib/types";

interface TournamentWithCount extends DbTournament {
  participant_count: number;
}

function Countdown({ target }: { target: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setText("Starting...");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [target]);

  return <span className="font-mono">{text}</span>;
}

function TournamentTimeRemaining({ target }: { target: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setText("Ended");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(`${m}m ${s}s left`);
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [target]);

  return <span className="font-mono text-xs">{text}</span>;
}

export default function TournamentLobby() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tournaments")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTournaments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Refresh every 30s
    const iv = setInterval(() => {
      fetch("/api/tournaments")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setTournaments(data);
        });
    }, 30000);

    return () => clearInterval(iv);
  }, []);

  if (!session) return null;

  const active = tournaments.filter((t) => t.status === "active");
  const upcoming = tournaments.filter((t) => t.status === "upcoming");

  function getTypeConfig(type: string) {
    return TOURNAMENT_TYPES[type] || TOURNAMENT_TYPES.blitz;
  }

  function getColorClass(type: string) {
    if (type === "blitz") return "border-l-bauhaus-red";
    if (type === "rapid") return "border-l-bauhaus-blue";
    if (type === "crossword-blitz") return "border-l-blue-500";
    if (type === "crossword-rapid") return "border-l-indigo-500";
    if (type === "crossword-marathon") return "border-l-violet-500";
    if (type.startsWith("sudden-death-")) return "border-l-red-900";
    if (type.startsWith("sprint-")) return "border-l-yellow-600";
    return "border-l-bauhaus-yellow";
  }

  function getTextColorClass(type: string) {
    if (type === "blitz") return "text-bauhaus-red";
    if (type === "rapid") return "text-bauhaus-blue";
    if (type === "crossword-blitz") return "text-blue-500";
    if (type === "crossword-rapid") return "text-indigo-500";
    if (type === "crossword-marathon") return "text-violet-500";
    if (type.startsWith("sudden-death-")) return "text-red-900";
    if (type.startsWith("sprint-")) return "text-yellow-600";
    return "text-bauhaus-yellow";
  }

  function getBgStyle(type: string) {
    if (type === "blitz") return { background: "rgba(220, 38, 38, 0.05)" };
    if (type === "rapid") return { background: "rgba(37, 99, 235, 0.05)" };
    if (type === "crossword-blitz") return { background: "rgba(59, 130, 246, 0.05)" };
    if (type === "crossword-rapid") return { background: "rgba(99, 102, 241, 0.05)" };
    if (type === "crossword-marathon") return { background: "rgba(139, 92, 246, 0.05)" };
    if (type.startsWith("sudden-death-")) return { background: "rgba(127, 29, 29, 0.05)" };
    if (type.startsWith("sprint-")) return { background: "rgba(202, 138, 4, 0.05)" };
    return { background: "rgba(234, 179, 8, 0.05)" };
  }

  function isCrosswordType(type: string) {
    return type.startsWith("crossword-");
  }

  function isSuddenDeathType(type: string) {
    return type.startsWith("sudden-death-");
  }

  function isSprintType(type: string) {
    return type.startsWith("sprint-");
  }

  function getTypeDescription(type: string, config: ReturnType<typeof getTypeConfig>) {
    if (isCrosswordType(type)) {
      return `${Math.floor(config.timerSeconds / 60)}min timer · ${config.wordsTarget || 20} words`;
    }
    if (isSuddenDeathType(type)) {
      return `1 life · ${config.timerSeconds}s adaptive · survive 25`;
    }
    if (isSprintType(type)) {
      return `${config.timerSeconds}s clock · -3s wrong penalty`;
    }
    return `${config.timerSeconds}s timer · ${config.questionsPerRound} questions`;
  }

  return (
    <main className="min-h-dvh pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="animate-fade-up mb-6">
        <Link href="/" className="text-text-dim text-xs uppercase tracking-widest mb-2 block">
          ← Home
        </Link>
        <h1 className="text-3xl font-black">
          <span className="text-bauhaus-red">Arena</span>{" "}
          <span className="text-text-primary">Tournaments</span>
        </h1>
        <div className="w-12 h-1 bg-bauhaus-red mt-2" />
        <Link href="/tournaments/history" className="inline-block mt-3 text-xs text-text-dim hover:text-bauhaus-blue uppercase tracking-widest transition-colors">
          📜 View History
        </Link>
      </div>

      {loading && (
        <div className="text-text-secondary text-center py-12">Loading tournaments...</div>
      )}

      {/* ACTIVE NOW */}
      {active.length > 0 && (
        <div className="animate-fade-up stagger-1 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-bauhaus-red animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-bauhaus-red">
              Active Now
            </h2>
          </div>
          <div className="space-y-3">
            {active.map((t) => {
              const config = getTypeConfig(t.type);
              return (
                <button
                  key={t.id}
                  onClick={() => router.push(`/tournaments/${t.id}`)}
                  className={`w-full text-left p-4 rounded-none border-2 border-l-4 ${getColorClass(t.type)} transition-all hover:scale-[1.01]`}
                  style={getBgStyle(t.type)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{config.icon}</span>
                      <span className={`font-black text-sm uppercase tracking-wider ${getTextColorClass(t.type)}`}>
                        {config.label}
                      </span>
                    </div>
                    <TournamentTimeRemaining target={t.ends_at} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>{getTypeDescription(t.type, config)}</span>
                    <span>{t.participant_count} players</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <div className="animate-fade-up stagger-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-3">
            Upcoming
          </h2>
          <div className="space-y-3">
            {upcoming.map((t) => {
              const config = getTypeConfig(t.type);
              return (
                <button
                  key={t.id}
                  onClick={() => router.push(`/tournaments/${t.id}`)}
                  className="w-full text-left p-4 rounded-none border-2 border-surface-border transition-all hover:border-l-4 hover:border-l-text-dim"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{config.icon}</span>
                      <span className={`font-bold text-sm uppercase tracking-wider ${getTextColorClass(t.type)}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="text-text-secondary text-xs">
                      Starts in <Countdown target={t.starts_at} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-dim">
                    <span>{getTypeDescription(t.type, config)} · {config.durationMinutes}min</span>
                    <span>{t.participant_count} joined</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-bauhaus-blue bg-bg">
        <div className="max-w-lg mx-auto flex justify-around py-3 px-4">
          <Link href="/" className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors">
            <span className="text-lg">🏠</span>
            <span className="text-xs uppercase tracking-wider">Home</span>
          </Link>
          <Link href="/tournaments" className="flex flex-col items-center gap-1 text-bauhaus-red transition-colors">
            <span className="text-lg">⚔️</span>
            <span className="text-xs uppercase tracking-wider font-bold">Arena</span>
          </Link>
          <Link href="/leaderboard" className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors">
            <span className="text-lg">🏅</span>
            <span className="text-xs uppercase tracking-wider">Leaderboard</span>
          </Link>
          <Link href="/stats" className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors">
            <span className="text-lg">📊</span>
            <span className="text-xs uppercase tracking-wider">Stats</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
