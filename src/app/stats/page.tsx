"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getXpProgress } from "@/lib/scoring";
import type { DbSection } from "@/lib/types";
import SectionMasteryRing from "@/components/SectionMasteryRing";
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
  last_played: string;
}

interface RatingHistoryPoint {
  variant: string;
  rating: number;
  played_at: string;
}

interface StatsData {
  profile: { xp: number; display_name: string } | null;
  stats: {
    total_answered: number;
    total_correct: number;
    games_played: number;
    best_score: number | null;
    best_streak: number;
    daily_streak: number;
  } | null;
  sections: DbSection[];
  sectionMastery: Record<string, { shown: number; correct: number; percent: number }>;
  activityMap: Record<string, number>;
  variantRatings: VariantRating[];
  ratingHistory: RatingHistoryPoint[];
}

export default function StatsPage() {
  const { data: session } = useSession();
  const [statsData, setStatsData] = useState<StatsData | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStatsData(data));
  }, [session]);

  if (!statsData) return null;

  const xp = statsData.profile?.xp || 0;
  const xpInfo = getXpProgress(xp);
  const stats = statsData.stats;
  const totalAnswered = stats?.total_answered || 0;
  const totalCorrect = stats?.total_correct || 0;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Activity calendar (last 30 days)
  const last30Days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    last30Days.push({ date: dateStr, count: statsData.activityMap[dateStr] || 0 });
  }
  const maxActivity = Math.max(1, ...last30Days.map((d) => d.count));

  // Sort variant ratings by rating descending
  const variantRatings = (statsData.variantRatings || []).sort((a, b) => b.rating - a.rating);

  // Group rating history by variant
  const ratingHistoryByVariant: Record<string, number[]> = {};
  for (const point of statsData.ratingHistory || []) {
    if (!ratingHistoryByVariant[point.variant]) ratingHistoryByVariant[point.variant] = [];
    ratingHistoryByVariant[point.variant].push(Math.round(point.rating));
  }

  return (
    <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-text-primary uppercase tracking-wider">Stats</h1>
        <Link href="/" className="text-text-secondary text-sm hover:text-text-primary transition-colors">
          ← Back
        </Link>
      </div>

      {/* Level */}
      <div className="animate-fade-up mb-6 p-4 rounded-none bg-surface border-2 border-surface-border border-l-4 border-l-bauhaus-blue">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{xpInfo.current.icon}</span>
          <div>
            <div className="font-bold">{xpInfo.current.title}</div>
            <div className="font-mono text-sm text-bauhaus-blue">{xp.toLocaleString()} XP</div>
          </div>
        </div>
        <ProgressBar progress={xpInfo.progressPercent} />
        {xpInfo.next && (
          <div className="text-text-dim text-xs mt-2 font-mono">
            {xpInfo.xpToNext.toLocaleString()} XP to {xpInfo.next.title}
          </div>
        )}
      </div>

      {/* Overview stats */}
      <div className="animate-fade-up stagger-1 grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Questions Answered" value={totalAnswered.toLocaleString()} />
        <StatCard label="Accuracy" value={`${accuracy}%`} />
        <StatCard label="Games Played" value={(stats?.games_played || 0).toLocaleString()} />
        <StatCard label="Best Streak" value={(stats?.best_streak || 0).toString()} />
        <StatCard label="Daily Streak" value={`${stats?.daily_streak || 0}d`} />
        <StatCard label="Total XP" value={xp.toLocaleString()} />
      </div>

      {/* Variant Ratings */}
      {variantRatings.length > 0 && (
        <div className="animate-fade-up stagger-2 mb-6">
          <h2 className="text-lg font-black mb-3 uppercase tracking-wider">Ratings</h2>
          <div className="grid grid-cols-2 gap-3">
            {variantRatings.map((vr) => {
              const display = VARIANT_DISPLAY[vr.variant] || {
                label: vr.variant,
                icon: "?",
                color: "#666",
              };
              const provisional = vr.games_count < 10;
              const history = ratingHistoryByVariant[vr.variant] || [];
              return (
                <div
                  key={vr.variant}
                  className="rounded-none bg-surface border-2 border-surface-border p-3 relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: display.color }}
                  />
                  <div className="flex items-center gap-2 mb-1 mt-1">
                    <span className="text-lg">{display.icon}</span>
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: display.color }}
                    >
                      {display.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-2xl font-bold text-text-primary">
                      {Math.round(vr.rating)}
                      {provisional && (
                        <span className="text-text-dim text-sm ml-0.5">?</span>
                      )}
                    </div>
                    {history.length >= 2 && (
                      <Sparkline data={history} color={display.color} width={80} height={28} />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-text-dim text-[10px] font-mono uppercase">
                      Peak {Math.round(vr.peak_rating)}
                    </span>
                    <span className="text-text-dim text-[10px] font-mono">
                      {vr.games_count} game{vr.games_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section mastery */}
      <div className={`animate-fade-up ${variantRatings.length > 0 ? "stagger-3" : "stagger-2"} mb-6`}>
        <h2 className="text-lg font-black mb-3 uppercase tracking-wider">Section Mastery</h2>
        <div className="space-y-2">
          {(statsData.sections || []).map((section) => {
            const m = statsData.sectionMastery[section.id] || { shown: 0, correct: 0, percent: 0 };
            return (
              <div
                key={section.id}
                className="flex items-center gap-3 p-3 rounded-none bg-surface border-2 border-surface-border hover:border-l-4 hover:border-l-bauhaus-blue transition-all"
              >
                <SectionMasteryRing percent={m.percent} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-text-primary">{section.icon} {section.name}</div>
                  <div className="text-text-dim text-xs font-mono">
                    {m.shown > 0 ? `${m.correct}/${m.shown} correct` : "Not started"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity calendar */}
      <div className={`animate-fade-up ${variantRatings.length > 0 ? "stagger-4" : "stagger-3"}`}>
        <h2 className="text-lg font-black mb-3 uppercase tracking-wider">Activity (30 days)</h2>
        <div className="flex gap-1 flex-wrap">
          {last30Days.map((day) => {
            const intensity = day.count / maxActivity;
            return (
              <div
                key={day.date}
                className="w-5 h-5"
                title={`${day.date}: ${day.count} questions`}
                style={{
                  background:
                    day.count === 0
                      ? "rgba(255,255,255,0.04)"
                      : `rgba(37, 99, 235, ${0.2 + intensity * 0.8})`,
                }}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-none bg-surface border-2 border-surface-border p-3 text-center">
      <div className="font-mono text-lg font-bold text-text-primary">{value}</div>
      <div className="text-text-dim text-xs mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Sparkline({
  data,
  color,
  width = 80,
  height = 28,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  // Take last 20 points max
  const points = data.slice(-20);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const pathPoints = points.map((val, i) => {
    const x = padding + (i / (points.length - 1)) * w;
    const y = padding + h - ((val - min) / range) * h;
    return `${x},${y}`;
  });

  const d = `M ${pathPoints.join(" L ")}`;

  // Determine if trending up or down
  const trending = points[points.length - 1] >= points[0];

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <path
        d={d}
        fill="none"
        stroke={trending ? color : "#ef4444"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
      {/* Current point dot */}
      <circle
        cx={padding + w}
        cy={padding + h - ((points[points.length - 1] - min) / range) * h}
        r={2}
        fill={trending ? color : "#ef4444"}
      />
    </svg>
  );
}
