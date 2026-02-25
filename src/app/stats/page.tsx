"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { storage } from "@/lib/storage";
import { getSections } from "@/lib/questions";
import { getXpProgress } from "@/lib/scoring";
import type { AppState } from "@/lib/types";
import SectionMasteryRing from "@/components/SectionMasteryRing";
import ProgressBar from "@/components/ProgressBar";

export default function StatsPage() {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    setState(storage.getState());
  }, []);

  if (!state) return null;

  const sections = getSections();
  const xpInfo = getXpProgress(state.player.xp);
  const accuracy =
    state.stats.totalAnswered > 0
      ? Math.round((state.stats.totalCorrect / state.stats.totalAnswered) * 100)
      : 0;

  function getSectionMastery(sectionId: string): { shown: number; correct: number; percent: number } {
    let shown = 0;
    let correct = 0;
    for (const [id, record] of Object.entries(state!.questionHistory)) {
      if (id.startsWith(sectionId)) {
        shown += record.timesShown;
        correct += record.timesCorrect;
      }
    }
    return { shown, correct, percent: shown > 0 ? Math.round((correct / shown) * 100) : 0 };
  }

  // Activity calendar (last 30 days)
  const activityMap = new Map<string, number>();
  for (const record of Object.values(state.questionHistory)) {
    if (record.lastShown) {
      const day = record.lastShown.split("T")[0];
      activityMap.set(day, (activityMap.get(day) || 0) + 1);
    }
  }

  const last30Days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    last30Days.push({ date: dateStr, count: activityMap.get(dateStr) || 0 });
  }

  const maxActivity = Math.max(1, ...last30Days.map((d) => d.count));

  return (
    <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-text-primary">Stats</h1>
        <Link href="/" className="text-text-secondary text-sm hover:text-text-primary transition-colors">
          ← Back
        </Link>
      </div>

      {/* Level */}
      <div className="animate-fade-up mb-6 p-4 rounded-2xl bg-surface border border-surface-border">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{xpInfo.current.icon}</span>
          <div>
            <div className="font-bold">{xpInfo.current.title}</div>
            <div className="font-mono text-sm text-accent">{state.player.xp.toLocaleString()} XP</div>
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
        <StatCard label="Questions Answered" value={state.stats.totalAnswered.toLocaleString()} />
        <StatCard label="Accuracy" value={`${accuracy}%`} />
        <StatCard label="Games Played" value={state.stats.gamesPlayed.toLocaleString()} />
        <StatCard label="Best Streak" value={state.stats.bestStreak.toString()} />
        <StatCard label="Daily Streak" value={`${state.stats.dailyStreak}d`} />
        <StatCard label="Total XP" value={state.player.xp.toLocaleString()} />
      </div>

      {/* Section mastery */}
      <div className="animate-fade-up stagger-2 mb-6">
        <h2 className="text-lg font-bold mb-3">Section Mastery</h2>
        <div className="space-y-2">
          {sections.map((section) => {
            const m = getSectionMastery(section.id);
            return (
              <div
                key={section.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-surface-border"
              >
                <SectionMasteryRing percent={m.percent} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">{section.icon} {section.name}</div>
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
        <h2 className="text-lg font-bold mb-3">Activity (30 days)</h2>
        <div className="flex gap-1 flex-wrap">
          {last30Days.map((day) => {
            const intensity = day.count / maxActivity;
            return (
              <div
                key={day.date}
                className="w-5 h-5 rounded-sm"
                title={`${day.date}: ${day.count} questions`}
                style={{
                  background:
                    day.count === 0
                      ? "rgba(255,255,255,0.04)"
                      : `rgba(0, 229, 160, ${0.2 + intensity * 0.8})`,
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
    <div className="rounded-xl bg-surface border border-surface-border p-3 text-center">
      <div className="font-mono text-lg font-bold text-text-primary">{value}</div>
      <div className="text-text-dim text-xs mt-1">{label}</div>
    </div>
  );
}
