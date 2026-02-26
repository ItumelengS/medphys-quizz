"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getXpProgress } from "@/lib/scoring";
import type { DbSection } from "@/lib/types";
import SectionMasteryRing from "@/components/SectionMasteryRing";
import ProgressBar from "@/components/ProgressBar";

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

      {/* Section mastery */}
      <div className="animate-fade-up stagger-2 mb-6">
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
      <div className="animate-fade-up stagger-3">
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
