"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { DISCIPLINES } from "@/lib/types";
import { getXpProgress } from "@/lib/scoring";
import ProgressBar from "@/components/ProgressBar";

const VARIANT_DISPLAY: Record<string, { label: string; icon: string; color: string }> = {
  blitz:          { label: "Blitz",         icon: "⚡", color: "#ef4444" },
  "sudden-death": { label: "Sudden Death",  icon: "💀", color: "#991b1b" },
  sprint:         { label: "Sprint",        icon: "🏃", color: "#ca8a04" },
  crossword:      { label: "Crossword",     icon: "🧩", color: "#6366f1" },
  match:          { label: "Match",         icon: "🃏", color: "#8b5cf6" },
  "hot-seat":     { label: "Hot Seat",      icon: "💰", color: "#d97706" },
  wordle:         { label: "Wordle",        icon: "🔤", color: "#16a34a" },
  connections:    { label: "Connections",    icon: "🔗", color: "#a855f7" },
  cryptic:        { label: "Cryptic",       icon: "🔮", color: "#be185d" },
  "reaction-rounds": { label: "Reaction Rounds", icon: "⚡", color: "#f97316" },
};

interface VariantRating {
  variant: string;
  rating: number;
  rd: number;
  peak_rating: number;
  games_count: number;
}

interface ProfileData {
  profile: { xp: number; display_name: string; created_at?: string } | null;
  variantRatings: VariantRating[];
  ratingHistory: { variant: string; rating: number }[];
  stats: {
    total_answered: number;
    total_correct: number;
    games_played: number;
    best_streak: number;
    daily_streak: number;
  } | null;
  totalTimePlayed: number;
  totalWins: number;
  totalGames: number;
  variantStats: Record<string, { played: number; wins: number; totalTime: number }>;
  firstGame: string | null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs < 24) return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remainHrs = hrs % 24;
  return remainHrs > 0 ? `${days}d ${remainHrs}h` : `${days}d`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [discipline, setDiscipline] = useState(session?.user?.discipline || "physicist");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setData(d));
  }, [session]);

  async function handleDisciplineChange(newDiscipline: string) {
    setDiscipline(newDiscipline);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discipline: newDiscipline }),
      });
      if (res.ok) {
        setSaved(true);
        await updateSession();
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  const xp = session.user.xp || 0;
  const xpInfo = getXpProgress(xp);
  const variantRatings = (data?.variantRatings || []).sort((a, b) => b.rating - a.rating);
  const stats = data?.stats;
  const totalAnswered = stats?.total_answered || 0;
  const totalCorrect = stats?.total_correct || 0;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const winRate = (data?.totalGames || 0) > 0
    ? Math.round(((data?.totalWins || 0) / (data?.totalGames || 1)) * 100)
    : 0;

  // Rating history grouped by variant
  const historyByVariant: Record<string, number[]> = {};
  for (const p of data?.ratingHistory || []) {
    if (!historyByVariant[p.variant]) historyByVariant[p.variant] = [];
    historyByVariant[p.variant].push(Math.round(p.rating));
  }

  const bestVariant = variantRatings[0];
  const bestDisplay = bestVariant ? VARIANT_DISPLAY[bestVariant.variant] : null;
  const memberSince = data?.profile?.created_at || data?.firstGame;

  return (
    <main className="min-h-dvh pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="animate-fade-up mb-6">
        <Link href="/" className="text-text-dim text-xs uppercase tracking-widest mb-2 block">
          &larr; Home
        </Link>
        <h1 className="text-3xl font-black">
          <span className="text-bauhaus-blue">Profile</span>
        </h1>
        <div className="w-12 h-1 bg-bauhaus-blue mt-2" />
      </div>

      {/* Player card */}
      <div className="animate-fade-up stagger-1 mb-6 p-5 border-2 border-surface-border bg-surface">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full border-2 border-bauhaus-blue flex items-center justify-center text-3xl bg-bg">
            {xpInfo.current.icon}
          </div>
          <div className="flex-1">
            <div className="text-lg font-black text-text-primary">{session.user.displayName}</div>
            <div className="text-text-secondary text-xs font-light">{xpInfo.current.title}</div>
            {memberSince && (
              <div className="text-text-dim text-[10px] font-mono mt-0.5">
                Member since {formatDate(memberSince)} ({daysSince(memberSince)}d)
              </div>
            )}
          </div>
        </div>

        {/* XP bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-sm font-bold text-bauhaus-blue">{xp.toLocaleString()} XP</span>
            {xpInfo.next && (
              <span className="text-text-dim text-[10px] font-mono">
                {xpInfo.xpToNext.toLocaleString()} to {xpInfo.next.title}
              </span>
            )}
          </div>
          <ProgressBar progress={xpInfo.progressPercent} />
        </div>

        {/* Key stats grid */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-surface-border">
          <MiniStat label="Time" value={formatDuration(data?.totalTimePlayed || 0)} />
          <MiniStat label="Games" value={(data?.totalGames || 0).toString()} />
          <MiniStat label="Accuracy" value={`${accuracy}%`} />
          <MiniStat label="Win Rate" value={`${winRate}%`} />
        </div>

        <div className="grid grid-cols-4 gap-2 mt-2">
          <MiniStat label="Questions" value={totalAnswered.toLocaleString()} />
          <MiniStat label="Correct" value={totalCorrect.toLocaleString()} />
          <MiniStat label="Streak" value={(stats?.best_streak || 0).toString()} />
          <MiniStat label="Daily" value={`${stats?.daily_streak || 0}d`} />
        </div>

        {/* Best variant badge */}
        {bestVariant && bestDisplay && (
          <div className="mt-3 pt-3 border-t border-surface-border flex items-center gap-2">
            <span className="text-lg">{bestDisplay.icon}</span>
            <span className="text-text-dim text-[10px] uppercase tracking-wider">Highest rated:</span>
            <span className="font-mono text-sm font-bold" style={{ color: bestDisplay.color }}>
              {bestDisplay.label} {Math.round(bestVariant.rating)}
              {bestVariant.games_count < 10 && <span className="text-text-dim">?</span>}
            </span>
          </div>
        )}
      </div>

      {/* Variant Ratings */}
      {variantRatings.length > 0 && (
        <div className="animate-fade-up stagger-2 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-3">Ratings</h2>
          <div className="space-y-2">
            {variantRatings.map((vr) => {
              const display = VARIANT_DISPLAY[vr.variant] || { label: vr.variant, icon: "?", color: "#666" };
              const provisional = vr.games_count < 10;
              const history = historyByVariant[vr.variant] || [];
              const vs = data?.variantStats?.[vr.variant];
              const variantWinRate = vs && vs.played > 0 ? Math.round((vs.wins / vs.played) * 100) : 0;
              return (
                <div
                  key={vr.variant}
                  className="flex items-center gap-3 p-3 rounded-none bg-surface border-2 border-surface-border"
                >
                  <div className="w-1 self-stretch rounded-full" style={{ background: display.color }} />
                  <span className="text-xl w-8 text-center">{display.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: display.color }}>
                      {display.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-text-primary">
                        {Math.round(vr.rating)}
                        {provisional && <span className="text-text-dim text-xs ml-0.5">?</span>}
                      </span>
                      <span className="text-text-dim text-[10px] font-mono">
                        peak {Math.round(vr.peak_rating)}
                      </span>
                    </div>
                    <div className="text-text-dim text-[10px] font-mono mt-0.5">
                      {vr.games_count}g
                      {vs && <> &middot; {formatDuration(vs.totalTime)} &middot; {variantWinRate}% win</>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {history.length >= 2 && (
                      <Sparkline data={history} color={display.color} width={64} height={24} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Variant breakdown (for variants played but not yet rated) */}
      {data?.variantStats && Object.keys(data.variantStats).length > variantRatings.length && (
        <div className="animate-fade-up stagger-3 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-3">Unrated Variants</h2>
          <div className="space-y-1">
            {Object.entries(data.variantStats)
              .filter(([v]) => !variantRatings.some((vr) => vr.variant === v))
              .map(([variant, vs]) => {
                const display = VARIANT_DISPLAY[variant] || { label: variant, icon: "?", color: "#666" };
                return (
                  <div key={variant} className="flex items-center gap-3 p-2 text-xs">
                    <span>{display.icon}</span>
                    <span className="font-bold" style={{ color: display.color }}>{display.label}</span>
                    <span className="text-text-dim font-mono">{vs.played}g &middot; {formatDuration(vs.totalTime)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="animate-fade-up stagger-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-3">Settings</h2>
        <div className="p-4 border-2 border-surface-border bg-surface">
          <label htmlFor="discipline" className="text-text-secondary text-xs uppercase tracking-widest mb-2 block">
            Discipline
          </label>
          <select
            id="discipline"
            value={discipline}
            onChange={(e) => handleDisciplineChange(e.target.value)}
            disabled={saving}
            className="w-full px-4 py-3 rounded-none bg-bg border-2 border-surface-border text-text-primary text-sm font-light focus:outline-none focus:border-bauhaus-blue disabled:opacity-50"
          >
            {DISCIPLINES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <p className="text-text-dim text-xs mt-2">
            Physicists see all questions. Other disciplines see their relevant questions plus general physics.
          </p>
          {saving && <p className="text-text-secondary text-xs mt-1">Saving...</p>}
          {saved && <p className="text-success text-xs mt-1">Saved!</p>}
        </div>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-sm font-bold text-text-primary">{value}</div>
      <div className="text-text-dim text-[10px] uppercase">{label}</div>
    </div>
  );
}

function Sparkline({
  data,
  color,
  width = 64,
  height = 24,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const points = data.slice(-20);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pathPoints = points.map((val, i) => {
    const x = pad + (i / (points.length - 1)) * w;
    const y = pad + h - ((val - min) / range) * h;
    return `${x},${y}`;
  });

  const trending = points[points.length - 1] >= points[0];

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <path
        d={`M ${pathPoints.join(" L ")}`}
        fill="none"
        stroke={trending ? color : "#ef4444"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
      <circle
        cx={pad + w}
        cy={pad + h - ((points[points.length - 1] - min) / range) * h}
        r={2}
        fill={trending ? color : "#ef4444"}
      />
    </svg>
  );
}
