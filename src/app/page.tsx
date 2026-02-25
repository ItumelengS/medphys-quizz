"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSections, getSectionQuestionCount, getTotalQuestionCount } from "@/lib/questions";
import { storage } from "@/lib/storage";
import { getXpProgress, getStreakEmoji } from "@/lib/scoring";
import { getDueQuestions } from "@/lib/spaced-repetition";
import { getAllQuestions } from "@/lib/questions";
import { getTodayDateString, getNextDailyReset, formatCountdown } from "@/lib/daily-seed";
import type { AppState } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import SectionMasteryRing from "@/components/SectionMasteryRing";

export default function HomePage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const s = storage.getState();
    if (!s.player.name) {
      router.replace("/register");
      return;
    }
    setState(s);
    setCountdown(formatCountdown(getNextDailyReset()));
    const timer = setInterval(() => {
      setCountdown(formatCountdown(getNextDailyReset()));
    }, 60000);
    return () => clearInterval(timer);
  }, [router]);

  if (!state) return null;

  const sections = getSections();
  const xpInfo = getXpProgress(state.player.xp);
  const dailyCompleted = state.dailyChallenge.lastCompletedDate === getTodayDateString();

  const allIds = getAllQuestions().map((q) => q.id);
  const dueCount = getDueQuestions(state.questionHistory, allIds).length;

  function getSectionMastery(sectionId: string): number {
    if (!state) return 0;
    let shown = 0;
    let correct = 0;
    for (const [id, record] of Object.entries(state.questionHistory)) {
      if (id.startsWith(sectionId)) {
        shown += record.timesShown;
        correct += record.timesCorrect;
      }
    }
    return shown > 0 ? Math.round((correct / shown) * 100) : 0;
  }

  return (
    <main className="min-h-dvh pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="animate-fade-up mb-6">
        <h1 className="text-3xl font-black">
          <span className="bg-gradient-to-r from-accent to-[#60a5fa] bg-clip-text text-transparent">
            MedPhys
          </span>{" "}
          <span className="text-text-primary">Speed Quiz</span>
        </h1>

        <div className="mt-2 text-text-secondary text-sm">
          {state.player.name}
        </div>
      </div>

      {/* Level & XP */}
      <div className="animate-fade-up stagger-1 mb-6 p-4 rounded-2xl bg-surface border border-surface-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{xpInfo.current.icon}</span>
            <div>
              <div className="font-bold text-sm">{xpInfo.current.title}</div>
              <div className="text-text-secondary text-xs font-mono">
                Level {xpInfo.current.level}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-accent">
              {state.player.xp.toLocaleString()} XP
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
          className={`p-4 rounded-2xl border-2 transition-all hover:-translate-y-0.5 ${
            dailyCompleted
              ? "border-gold/20 opacity-75"
              : "border-gold/40 hover:border-gold/60"
          }`}
          style={{ background: "rgba(245, 158, 11, 0.05)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="font-bold text-gold text-sm">Daily Challenge</div>
                <div className="text-text-secondary text-xs">
                  {dailyCompleted
                    ? `Done! Next in ${countdown}`
                    : "10 questions, 12s timer"}
                </div>
              </div>
            </div>
            {state.stats.dailyStreak > 0 && (
              <div className="flex items-center gap-1 text-gold font-mono text-sm font-bold">
                {getStreakEmoji(state.stats.dailyStreak)} {state.stats.dailyStreak}d
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Review badge */}
      {dueCount > 0 && (
        <Link href="/review" className="block animate-fade-up stagger-3 mb-6">
          <div className="p-3 rounded-xl bg-surface border border-accent/20 flex items-center justify-between hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2">
              <span>🔄</span>
              <span className="text-sm font-semibold text-accent">
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
          className="p-5 rounded-2xl border border-accent/20 hover:-translate-y-0.5 transition-all"
          style={{ background: "rgba(0, 229, 160, 0.03)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-accent">⚡ All Topics</div>
              <div className="text-text-secondary text-xs mt-1">
                {getTotalQuestionCount()} questions across {sections.length} sections
              </div>
            </div>
            <div className="text-text-dim text-2xl">→</div>
          </div>
        </div>
      </Link>

      {/* Section grid */}
      <div className="grid grid-cols-2 gap-3">
        {sections.map((section, i) => {
          const mastery = getSectionMastery(section.id);
          const count = getSectionQuestionCount(section.id);

          return (
            <Link
              key={section.id}
              href={`/quiz/${section.id}`}
              className={`animate-fade-up stagger-${Math.min(i + 4, 10)}`}
            >
              <div
                className="p-4 rounded-xl border hover:-translate-y-0.5 transition-all h-full"
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
                <div className="font-semibold text-sm text-text-primary mb-0.5">
                  {section.name}
                </div>
                <div className="text-text-dim text-xs">{count} questions</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-surface-border bg-bg/80 backdrop-blur-lg">
        <div className="max-w-lg mx-auto flex justify-around py-3 px-4">
          <Link href="/leaderboard" className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors">
            <span className="text-lg">🏅</span>
            <span className="text-xs">Leaderboard</span>
          </Link>
          <Link href="/stats" className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors">
            <span className="text-lg">📊</span>
            <span className="text-xs">Stats</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
