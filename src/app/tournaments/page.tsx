"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import type { DbTournament, FinishedTournamentWithWinner } from "@/lib/types";

interface TournamentWithCount extends DbTournament {
  participant_count: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Countdown({ target, onReached }: { target: string; onReached?: () => void }) {
  const [text, setText] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let fired = false;
    function update() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setText("");
        setExpired(true);
        if (!fired && onReached) { fired = true; onReached(); }
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
  }, [target, onReached]);

  if (expired) return null;
  return <span className="font-mono text-[11px]">{text}</span>;
}

function BigCountdown({ target, onReached }: { target: string; onReached?: () => void }) {
  const [text, setText] = useState("");

  useEffect(() => {
    let fired = false;
    function update() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setText("Starting...");
        if (!fired && onReached) { fired = true; onReached(); }
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`);
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [target, onReached]);

  return <span className="font-mono text-2xl font-bold">{text}</span>;
}

function TimeRemaining({ target }: { target: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setText("Ending..."); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(`${m}:${String(s).padStart(2, "0")}`);
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [target]);

  return <span className="font-mono text-[11px]">{text}</span>;
}

export default function TournamentLobby() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [finished, setFinished] = useState<FinishedTournamentWithWinner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTournaments = useCallback(() => {
    fetch("/api/tournaments")
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.tournaments)) {
          setTournaments(data.tournaments);
          setFinished(data.finished || []);
        } else if (Array.isArray(data)) {
          // Backwards compat
          setTournaments(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTournaments();
    const iv = setInterval(fetchTournaments, 30000);
    return () => clearInterval(iv);
  }, [fetchTournaments]);

  if (!session) return null;

  const active = tournaments.filter((t) => t.status === "active");
  const upcoming = tournaments.filter((t) => t.status === "upcoming");

  function getTypeConfig(type: string) {
    return TOURNAMENT_TYPES[type] || TOURNAMENT_TYPES.blitz;
  }

  function getBorderColor(type: string) {
    if (type === "blitz") return "border-l-bauhaus-red";
    if (type === "rapid") return "border-l-bauhaus-blue";
    if (type === "crossword-blitz") return "border-l-blue-500";
    if (type === "crossword-rapid") return "border-l-indigo-500";
    if (type === "crossword-marathon") return "border-l-violet-500";
    if (type.startsWith("sudden-death-")) return "border-l-red-900";
    if (type.startsWith("sprint-")) return "border-l-yellow-600";
    return "border-l-bauhaus-yellow";
  }

  function getTextColor(type: string) {
    if (type === "blitz") return "text-bauhaus-red";
    if (type === "rapid") return "text-bauhaus-blue";
    if (type === "crossword-blitz") return "text-blue-500";
    if (type === "crossword-rapid") return "text-indigo-500";
    if (type === "crossword-marathon") return "text-violet-500";
    if (type.startsWith("sudden-death-")) return "text-red-900";
    if (type.startsWith("sprint-")) return "text-yellow-600";
    return "text-bauhaus-yellow";
  }

  function getBgTint(type: string) {
    if (type === "blitz") return "rgba(220, 38, 38, 0.06)";
    if (type === "rapid") return "rgba(37, 99, 235, 0.06)";
    if (type === "crossword-blitz") return "rgba(59, 130, 246, 0.06)";
    if (type === "crossword-rapid") return "rgba(99, 102, 241, 0.06)";
    if (type === "crossword-marathon") return "rgba(139, 92, 246, 0.06)";
    if (type.startsWith("sudden-death-")) return "rgba(127, 29, 29, 0.06)";
    if (type.startsWith("sprint-")) return "rgba(202, 138, 4, 0.06)";
    return "rgba(234, 179, 8, 0.06)";
  }

  function getDescription(type: string, config: ReturnType<typeof getTypeConfig>) {
    if (type.startsWith("crossword-")) {
      return `${Math.floor(config.timerSeconds / 60)}min · ${config.wordsTarget || 20} words`;
    }
    if (type.startsWith("sudden-death-")) {
      return `1 life · ${config.timerSeconds}s · survive 25`;
    }
    if (type.startsWith("sprint-")) {
      return `${config.timerSeconds}s · -3s penalty`;
    }
    return `${config.timerSeconds}s · ${config.questionsPerRound}Q`;
  }

  // "Next Up" hero: first upcoming when nothing is live
  const nextUp = active.length === 0 && upcoming.length > 0 ? upcoming[0] : null;

  return (
    <main className="min-h-dvh pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="animate-fade-up mb-5">
        <Link href="/" className="text-text-dim text-xs uppercase tracking-widest mb-2 block">
          ← Home
        </Link>
        <h1 className="text-3xl font-black">
          <span className="text-bauhaus-red">Arena</span>{" "}
          <span className="text-text-primary">Tournaments</span>
        </h1>
        <div className="w-12 h-1 bg-bauhaus-red mt-2" />
        <Link href="/tournaments/history" className="inline-block mt-2 text-xs text-text-dim hover:text-bauhaus-blue uppercase tracking-widest transition-colors">
          View History
        </Link>
      </div>

      {loading && (
        <div className="text-text-secondary text-center py-12 text-sm">Loading...</div>
      )}

      {/* NEXT UP hero card — only when nothing is live */}
      {!loading && nextUp && (
        <div className="animate-fade-up mb-5">
          <button
            onClick={() => router.push(`/tournaments/${nextUp.id}`)}
            className={`w-full text-center py-6 px-4 border-2 border-l-4 ${getBorderColor(nextUp.type)} transition-all hover:scale-[1.01]`}
            style={{ background: getBgTint(nextUp.type) }}
          >
            <div className="text-text-dim text-[10px] uppercase tracking-[0.2em] mb-2">Next Up</div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-lg">{getTypeConfig(nextUp.type).icon}</span>
              <span className={`font-black text-sm uppercase tracking-wider ${getTextColor(nextUp.type)}`}>
                {getTypeConfig(nextUp.type).label}
              </span>
            </div>
            <BigCountdown target={nextUp.starts_at} onReached={fetchTournaments} />
            <div className="text-text-dim text-[11px] mt-2">
              {getDescription(nextUp.type, getTypeConfig(nextUp.type))} · {getTypeConfig(nextUp.type).durationMinutes}min
            </div>
          </button>
        </div>
      )}

      {/* LIVE section */}
      {active.length > 0 && (
        <div className="animate-fade-up mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-bauhaus-red animate-pulse" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-bauhaus-red">Live</h2>
          </div>
          <div className="space-y-1">
            {active.map((t) => {
              const config = getTypeConfig(t.type);
              return (
                <button
                  key={t.id}
                  onClick={() => router.push(`/tournaments/${t.id}`)}
                  className={`w-full text-left py-2 px-3 border-l-4 ${getBorderColor(t.type)} transition-all hover:brightness-110`}
                  style={{ background: getBgTint(t.type) }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{config.icon}</span>
                      <span className={`font-black text-xs uppercase tracking-wider ${getTextColor(t.type)} truncate`}>
                        {config.label}
                      </span>
                    </div>
                    <TimeRemaining target={t.ends_at} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-dim mt-0.5">
                    <span>{getDescription(t.type, config)}</span>
                    <span>{t.participant_count} playing</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* UPCOMING section */}
      {upcoming.length > 0 && (
        <div className="animate-fade-up mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1.5">
            Upcoming
          </h2>
          <div className="space-y-1">
            {upcoming.map((t) => {
              const config = getTypeConfig(t.type);
              return (
                <button
                  key={t.id}
                  onClick={() => router.push(`/tournaments/${t.id}`)}
                  className="w-full text-left py-2 px-3 border-l-4 border-l-surface-border transition-all hover:border-l-text-dim"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{config.icon}</span>
                      <span className={`font-bold text-xs uppercase tracking-wider ${getTextColor(t.type)} truncate`}>
                        {config.label}
                      </span>
                    </div>
                    <Countdown target={t.starts_at} onReached={fetchTournaments} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-dim mt-0.5">
                    <span>{getDescription(t.type, config)} · {config.durationMinutes}min</span>
                    <span>{t.participant_count} joined</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* RECENTLY FINISHED section */}
      {finished.length > 0 && (
        <div className="animate-fade-up mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-dim mb-1.5">
            Recently Finished
          </h2>
          <div className="space-y-1">
            {finished.map((t) => {
              const config = getTypeConfig(t.type);
              return (
                <button
                  key={t.id}
                  onClick={() => router.push(`/tournaments/${t.id}`)}
                  className="w-full text-left py-2 px-3 border-l-4 border-l-surface-border opacity-60 hover:opacity-100 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{config.icon}</span>
                      <span className={`font-bold text-xs uppercase tracking-wider ${getTextColor(t.type)} truncate`}>
                        {config.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-dim font-mono">{timeAgo(t.ends_at)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-dim mt-0.5">
                    <span>{t.participant_count} players</span>
                    {t.winner_name ? (
                      <span className="text-bauhaus-yellow font-semibold truncate ml-2">
                        🏆 {t.winner_name}
                      </span>
                    ) : (
                      <span>No players</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state when nothing at all */}
      {!loading && active.length === 0 && upcoming.length === 0 && finished.length === 0 && (
        <div className="text-center py-12 text-text-dim text-sm">
          No tournaments scheduled right now. Check back soon!
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
