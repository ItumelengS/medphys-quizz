"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { getGradeEmoji, CAREER_LEVELS } from "@/lib/scoring";
import LevelUpModal from "@/components/LevelUpModal";

function ResultsContent() {
  const searchParams = useSearchParams();
  const score = parseInt(searchParams.get("score") || "0");
  const total = parseInt(searchParams.get("total") || "0");
  const points = parseInt(searchParams.get("points") || "0");
  const bestStreak = parseInt(searchParams.get("bestStreak") || "0");
  const section = searchParams.get("section") || "all";
  const sectionName = searchParams.get("sectionName") || "All Topics";
  const mode = searchParams.get("mode") || "speed";
  const xp = parseInt(searchParams.get("xp") || "0");
  const baseXp = parseInt(searchParams.get("baseXp") || "0");
  const bonusXp = parseInt(searchParams.get("bonusXp") || "0");
  const perfectBonus = parseInt(searchParams.get("perfectBonus") || "0");
  const leveledUpStr = searchParams.get("leveledUp") || "";

  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const grade = getGradeEmoji(accuracy);

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedPoints, setAnimatedPoints] = useState(0);

  useEffect(() => {
    if (leveledUpStr) setShowLevelUp(true);
  }, [leveledUpStr]);

  // Animate numbers
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const scoreStep = score / steps;
    const pointsStep = points / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setAnimatedScore(Math.min(Math.round(scoreStep * step), score));
      setAnimatedPoints(Math.min(Math.round(pointsStep * step), points));
      if (step >= steps) clearInterval(interval);
    }, duration / steps);

    return () => clearInterval(interval);
  }, [score, points]);

  const levelUpLevel = leveledUpStr
    ? CAREER_LEVELS.find((l) => l.level === parseInt(leveledUpStr))
    : null;

  return (
    <main className="min-h-dvh px-4 pt-8 pb-8 max-w-lg mx-auto">
      {showLevelUp && levelUpLevel && (
        <LevelUpModal level={levelUpLevel} onClose={() => setShowLevelUp(false)} />
      )}

      <div className="animate-fade-up text-center mb-8">
        <div className="text-6xl mb-4">{grade}</div>
        <h1 className="text-4xl font-black text-text-primary mb-1">
          {animatedScore}/{total}
        </h1>
        <p className="text-text-secondary text-sm">{sectionName}</p>
        <p className="text-text-dim text-xs mt-1">
          {mode === "daily" ? "Daily Challenge" : mode === "review" ? "Review" : "Speed Round"}
        </p>
      </div>

      {/* Stats grid */}
      <div className="animate-fade-up stagger-1 grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Accuracy" value={`${accuracy}%`} />
        <StatCard label="Points" value={animatedPoints.toLocaleString()} />
        <StatCard label="Best Streak" value={bestStreak.toString()} />
        <StatCard label="XP Earned" value={`+${xp}`} accent />
      </div>

      {/* XP Breakdown */}
      <div className="animate-fade-up stagger-2 rounded-xl bg-surface border border-surface-border p-4 mb-6">
        <div className="text-sm font-semibold text-text-primary mb-3">XP Breakdown</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Base XP</span>
            <span className="font-mono text-text-primary">+{baseXp}</span>
          </div>
          {perfectBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Perfect round!</span>
              <span className="font-mono text-accent">+{perfectBonus}</span>
            </div>
          )}
          {bonusXp > 0 && bonusXp !== perfectBonus && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Bonus</span>
              <span className="font-mono text-accent">+{bonusXp - perfectBonus}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-surface-border pt-2 font-bold">
            <span className="text-text-primary">Total</span>
            <span className="font-mono text-accent">+{xp}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="animate-fade-up stagger-3 flex flex-col gap-3">
        <Link
          href={`/quiz/${section}`}
          className="block w-full text-center py-3.5 rounded-xl font-bold text-bg transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#00e5a0" }}
        >
          Play Again
        </Link>
        <Link
          href="/"
          className="block w-full text-center py-3.5 rounded-xl font-bold text-text-primary border border-surface-border hover:bg-surface transition-all active:scale-95"
        >
          Home
        </Link>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface border border-surface-border p-3 text-center">
      <div
        className={`font-mono text-xl font-bold ${accent ? "text-accent" : "text-text-primary"}`}
      >
        {value}
      </div>
      <div className="text-text-dim text-xs mt-1">{label}</div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center text-text-secondary">
          Loading...
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
