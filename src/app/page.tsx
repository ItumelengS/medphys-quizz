"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getXpProgress, getStreakEmoji } from "@/lib/scoring";
import { getNextDailyReset, formatCountdown } from "@/lib/daily-seed";
import type { DbSection } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import SectionMasteryRing from "@/components/SectionMasteryRing";

interface StatsData {
  profile: { xp: number; display_name: string } | null;
  stats: {
    daily_streak: number;
    total_answered: number;
  } | null;
  sections: DbSection[];
  sectionMastery: Record<string, { shown: number; correct: number; percent: number }>;
}

export default function HomePage() {
  const { data: session } = useSession();
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    if (!session) return;

    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStatsData(data));

    fetch("/api/review/due")
      .then((r) => r.json())
      .then((data) => setDueCount(Array.isArray(data) ? data.length : 0));

    fetch("/api/quiz/daily")
      .then((r) => r.json())
      .then((data) => setDailyCompleted(!!data.locked));

    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => setTotalQuestions(Array.isArray(data) ? data.length : 0));

    setCountdown(formatCountdown(getNextDailyReset()));
    const timer = setInterval(() => {
      setCountdown(formatCountdown(getNextDailyReset()));
    }, 60000);
    return () => clearInterval(timer);
  }, [session]);

  if (!session || !statsData) return null;

  const xp = statsData.profile?.xp || 0;
  const xpInfo = getXpProgress(xp);
  const sections = statsData.sections || [];
  const dailyStreak = statsData.stats?.daily_streak || 0;

  return (
    <main className="min-h-dvh pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="animate-fade-up mb-6">
        <h1 className="text-3xl font-black">
          <span className="text-bauhaus-blue">MedPhys</span>{" "}
          <span className="text-text-primary">Speed Quiz</span>
        </h1>
        <div className="w-12 h-1 bg-bauhaus-yellow mt-2 mb-1" />
        <div className="text-text-secondary text-sm font-light">
          {statsData.profile?.display_name || session.user?.name}
        </div>
      </div>

      {/* Level & XP */}
      <div className="animate-fade-up stagger-1 mb-6 p-4 rounded-none bg-surface border-2 border-surface-border border-l-4 border-l-bauhaus-blue">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{xpInfo.current.icon}</span>
            <div>
              <div className="font-bold text-sm">{xpInfo.current.title}</div>
              <div className="text-text-secondary text-xs font-mono uppercase tracking-widest">
                Level {xpInfo.current.level}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-bauhaus-blue">
              {xp.toLocaleString()} XP
            </div>
            {xpInfo.next && (
              <div className="text-text-dim text-xs font-mono">
                {xpInfo.xpToNext.toLocaleString()} to {xpInfo.next.title}
              </div>
            )}
          </div>
        </div>
        <ProgressBar progress={xpInfo.progressPercent} />
      </div>

      {/* Daily Challenge */}
      <Link href="/daily" className="block animate-fade-up stagger-2 mb-4">
        <div
          className={`p-4 rounded-none border-2 transition-all hover:border-l-4 hover:border-l-bauhaus-yellow ${
            dailyCompleted
              ? "border-bauhaus-yellow/20 opacity-75"
              : "border-bauhaus-yellow/40"
          }`}
          style={{ background: "rgba(234, 179, 8, 0.05)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="font-bold text-bauhaus-yellow text-sm uppercase tracking-wider">Daily Challenge</div>
                <div className="text-text-secondary text-xs font-light">
                  {dailyCompleted
                    ? `Done! Next in ${countdown}`
                    : "10 questions, 12s timer"}
                </div>
              </div>
            </div>
            {dailyStreak > 0 && (
              <div className="flex items-center gap-1 text-bauhaus-yellow font-mono text-sm font-bold">
                {getStreakEmoji(dailyStreak)} {dailyStreak}d
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Review badge */}
      {dueCount > 0 && (
        <Link href="/review" className="block animate-fade-up stagger-3 mb-6">
          <div className="p-3 rounded-none bg-surface border-2 border-bauhaus-blue/20 flex items-center justify-between hover:border-l-4 hover:border-l-bauhaus-blue transition-all">
            <div className="flex items-center gap-2">
              <span>🔄</span>
              <span className="text-sm font-semibold text-bauhaus-blue">
                {dueCount} due for review
              </span>
            </div>
            <span className="text-text-dim text-xs">Tap to start →</span>
          </div>
        </Link>
      )}

      {/* All Topics hero card */}
      <Link href="/quiz/all" className="block animate-fade-up stagger-3 mb-4">
        <div
          className="p-5 rounded-none border-2 border-bauhaus-blue/20 hover:border-l-4 hover:border-l-bauhaus-blue transition-all"
          style={{ background: "rgba(37, 99, 235, 0.03)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-black text-bauhaus-blue uppercase tracking-wider">All Topics</div>
              <div className="text-text-secondary text-xs mt-1 font-light">
                {totalQuestions} questions across {sections.length} sections
              </div>
            </div>
            <div className="text-text-dim text-2xl">→</div>
          </div>
        </div>
      </Link>

      {/* Section grid */}
      <div className="grid grid-cols-2 gap-3">
        {sections.map((section, i) => {
          const mastery = statsData.sectionMastery[section.id]?.percent || 0;

          return (
            <Link
              key={section.id}
              href={`/quiz/${section.id}`}
              className={`animate-fade-up stagger-${Math.min(i + 4, 10)}`}
            >
              <div
                className="p-4 rounded-none border-2 hover:border-l-4 hover:border-l-bauhaus-yellow transition-all h-full"
                style={{
                  background: `${section.color}08`,
                  borderColor: `${section.color}26`,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xl">{section.icon}</span>
                  {mastery > 0 && (
                    <SectionMasteryRing percent={mastery} size={32} strokeWidth={2.5} />
                  )}
                </div>
                <div className="font-bold text-sm text-text-primary mb-0.5">
                  {section.name}
                </div>
                <div className="text-text-dim text-xs font-light">{section.description}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-bauhaus-blue bg-bg">
        <div className="max-w-lg mx-auto flex justify-around py-3 px-4">
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
