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
};

interface VariantRating {
  variant: string;
  rating: number;
  rd: number;
  peak_rating: number;
  games_count: number;
}

interface RatingHistoryPoint {
  variant: string;
  rating: number;
}

interface ProfileStats {
  variantRatings: VariantRating[];
  ratingHistory: RatingHistoryPoint[];
  stats: {
    total_answered: number;
    total_correct: number;
    games_played: number;
    best_streak: number;
    daily_streak: number;
  } | null;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [discipline, setDiscipline] = useState(session?.user?.discipline || "physicist");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setProfileStats(data));
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
  const variantRatings = (profileStats?.variantRatings || []).sort((a, b) => b.rating - a.rating);
  const stats = profileStats?.stats;
  const totalAnswered = stats?.total_answered || 0;
  const totalCorrect = stats?.total_correct || 0;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Group rating history by variant
  const historyByVariant: Record<string, number[]> = {};
  for (const p of profileStats?.ratingHistory || []) {
    if (!historyByVariant[p.variant]) historyByVariant[p.variant] = [];
    historyByVariant[p.variant].push(Math.round(p.rating));
  }

  // Best variant
  const bestVariant = variantRatings[0];
  const bestDisplay = bestVariant ? VARIANT_DISPLAY[bestVariant.variant] : null;

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
          <div className="w-14 h-14 rounded-full border-2 border-bauhaus-blue flex items-center justify-center text-2xl bg-bg">
            {xpInfo.current.icon}
          </div>
          <div>
            <div className="text-lg font-black text-text-primary">{session.user.displayName}</div>
            <div className="text-text-secondary text-xs font-light">{xpInfo.current.title}</div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mb-3">
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

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-surface-border">
          <div className="text-center">
            <div className="font-mono text-sm font-bold text-text-primary">{accuracy}%</div>
            <div className="text-text-dim text-[10px] uppercase">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-sm font-bold text-text-primary">{(stats?.games_played || 0).toLocaleString()}</div>
            <div className="text-text-dim text-[10px] uppercase">Games</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-sm font-bold text-text-primary">{stats?.best_streak || 0}</div>
            <div className="text-text-dim text-[10px] uppercase">Best Streak</div>
          </div>
        </div>

        {/* Best variant badge */}
        {bestVariant && bestDisplay && (
          <div className="mt-3 pt-3 border-t border-surface-border flex items-center gap-2">
            <span className="text-lg">{bestDisplay.icon}</span>
            <span className="text-text-dim text-[10px] uppercase tracking-wider">Best:</span>
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
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {history.length >= 2 && (
                      <Sparkline data={history} color={display.color} width={64} height={24} />
                    )}
                    <span className="text-text-dim text-[10px] font-mono">
                      {vr.games_count}g
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="animate-fade-up stagger-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-3">Settings</h2>
        <div className="space-y-4">
          {/* Discipline */}
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
      </div>
    </main>
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
