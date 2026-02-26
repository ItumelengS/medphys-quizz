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
        {/* Geometric circle frame around grade emoji */}
        <div className="inline-flex items-center justify-center w-24 h-24 border-4 border-bauhaus-blue rounded-full mb-4">
          <span className="text-5xl">{grade}</span>
        </div>
        <h1 className="text-4xl font-black text-text-primary mb-1">
          {animatedScore}/{total}
        </h1>
        <p className="text-text-secondary text-sm font-light">{sectionName}</p>
        <p className="text-text-dim text-xs mt-1 uppercase tracking-widest">
          {mode === "daily" ? "Daily Challenge" : mode === "review" ? "Review" : "Speed Round"}
        </p>
      </div>

      {/* Stats grid */}
      <div className="animate-fade-up stagger-1 grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Accuracy" value={`${accuracy}%`} barColor="#2563eb" />
        <StatCard label="Points" value={animatedPoints.toLocaleString()} barColor="#eab308" />
        <StatCard label="Best Streak" value={bestStreak.toString()} barColor="#dc2626" />
        <StatCard label="XP Earned" value={`+${xp}`} barColor="#16a34a" accent />
      </div>

      {/* XP Breakdown */}
      <div className="animate-fade-up stagger-2 rounded-none bg-surface border-2 border-surface-border border-l-4 border-l-bauhaus-blue p-4 mb-6">
        <div className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">XP Breakdown</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary font-light">Base XP</span>
            <span className="font-mono text-text-primary">+{baseXp}</span>
          </div>
          {perfectBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary font-light">Perfect round!</span>
              <span className="font-mono text-bauhaus-blue">+{perfectBonus}</span>
            </div>
          )}
          {bonusXp > 0 && bonusXp !== perfectBonus && (
            <div className="flex justify-between">
              <span className="text-text-secondary font-light">Bonus</span>
              <span className="font-mono text-bauhaus-blue">+{bonusXp - perfectBonus}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-surface-border pt-2 font-bold">
            <span className="text-text-primary">Total</span>
            <span className="font-mono text-bauhaus-blue">+{xp}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="animate-fade-up stagger-3 flex flex-col gap-3">
        <Link
          href={`/quiz/${section}`}
          className="block w-full text-center py-3.5 rounded-none font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#2563eb" }}
        >
          Play Again
        </Link>
        <Link
          href="/"
          className="block w-full text-center py-3.5 rounded-none font-bold text-text-primary border-2 border-surface-border hover:bg-surface transition-all active:scale-95"
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
  barColor,
}: {
  label: string;
  value: string;
  accent?: boolean;
  barColor?: string;
}) {
  return (
    <div className="rounded-none bg-surface border-2 border-surface-border p-3 text-center relative overflow-hidden">
      {barColor && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: barColor }} />
      )}
      <div
        className={`font-mono text-xl font-bold mt-1 ${accent ? "text-success" : "text-text-primary"}`}
      >
        {value}
      </div>
      <div className="text-text-dim text-xs mt-1 uppercase tracking-wider">{label}</div>
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
