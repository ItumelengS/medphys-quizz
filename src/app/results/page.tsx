"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { getGradeEmoji, getCareerLevel } from "@/lib/scoring";
import { getVariantDisplayName } from "@/lib/game-variants";
import { POWERUP_INFO } from "@/lib/types";
import type { PowerUpType } from "@/lib/types";

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
  const penalized = searchParams.get("penalized") === "1";

  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const grade = getGradeEmoji(accuracy);

  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [examReady, setExamReady] = useState(false);
  const [awardedPowerUps, setAwardedPowerUps] = useState<PowerUpType[]>([]);
  const [showPowerUpBanner, setShowPowerUpBanner] = useState(false);

  // Check exam readiness
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          const confirmedLevel = data.profile.confirmed_level || 1;
          const xpLevel = getCareerLevel(data.profile.xp);
          if (xpLevel.level > confirmedLevel) {
            setExamReady(true);
          }
        }
      });
  }, []);

  // Check for awarded power-ups from the quiz submission response
  useEffect(() => {
    const powerUpsParam = searchParams.get("powerups");
    if (powerUpsParam) {
      try {
        const parsed = JSON.parse(powerUpsParam) as PowerUpType[];
        if (parsed.length > 0) {
          setAwardedPowerUps(parsed);
          setShowPowerUpBanner(true);
        }
      } catch { /* ignore */ }
    }
  }, [searchParams]);

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

  return (
    <main className="min-h-dvh px-4 pt-8 pb-8 max-w-lg mx-auto">
      <div className="animate-fade-up text-center mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 border-4 border-bauhaus-blue rounded-full mb-4">
          <span className="text-5xl">{grade}</span>
        </div>
        <h1 className="text-4xl font-black text-text-primary mb-1">
          {animatedScore}/{total}
        </h1>
        <p className="text-text-secondary text-sm font-light">{sectionName}</p>
        <p className="text-text-dim text-xs mt-1 uppercase tracking-widest">
          {getVariantDisplayName(mode)}
        </p>
      </div>

      {/* Power-up Award Banner */}
      {showPowerUpBanner && awardedPowerUps.length > 0 && (
        <div className="animate-fade-up mb-6 p-4 rounded-none bg-surface border-2 border-bauhaus-yellow border-l-4 border-l-bauhaus-yellow">
          <div className="text-sm font-bold text-bauhaus-yellow mb-2 uppercase tracking-wider">Power-Up Earned!</div>
          <div className="flex gap-3">
            {awardedPowerUps.map((type, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xl">{POWERUP_INFO[type].icon}</span>
                <span className="text-sm text-text-primary font-medium">{POWERUP_INFO[type].name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam Ready Banner */}
      {examReady && (
        <Link href="/level-up" className="block animate-fade-up mb-6">
          <div className="p-4 rounded-none border-2 border-bauhaus-yellow transition-all hover:border-l-4 hover:border-l-bauhaus-yellow" style={{ background: "rgba(234, 179, 8, 0.08)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-bold text-bauhaus-yellow text-sm uppercase tracking-wider">Exam Ready!</div>
                  <div className="text-text-secondary text-xs font-light">Take your level-up exam now</div>
                </div>
              </div>
              <div className="text-bauhaus-yellow font-bold text-lg animate-pulse">→</div>
            </div>
          </div>
        </Link>
      )}

      {/* Stats grid */}
      <div className="animate-fade-up stagger-1 grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Accuracy" value={`${accuracy}%`} barColor="#2563eb" />
        <StatCard label="Points" value={animatedPoints.toLocaleString()} barColor="#eab308" />
        <StatCard label="Best Streak" value={bestStreak.toString()} barColor="#dc2626" />
        <StatCard
          label={penalized ? "XP Lost" : "XP Earned"}
          value={penalized ? `${xp}` : `+${xp}`}
          barColor={penalized ? "#dc2626" : "#16a34a"}
          accent={!penalized}
        />
      </div>

      {/* Penalty Warning */}
      {penalized && (
        <div className="animate-fade-up stagger-2 mb-4 p-4 rounded-none border-2 border-bauhaus-red/40 border-l-4 border-l-bauhaus-red" style={{ background: "rgba(220, 38, 38, 0.06)" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-bold text-bauhaus-red text-sm uppercase tracking-wider">Below 70% — XP Penalty</div>
              <div className="text-text-secondary text-xs font-light mt-0.5">
                HPCSA requires 70% to earn CEUs. Score above 70% to gain XP.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* XP Breakdown */}
      <div className={`animate-fade-up stagger-2 rounded-none bg-surface border-2 border-surface-border border-l-4 p-4 mb-6 ${penalized ? "border-l-bauhaus-red" : "border-l-bauhaus-blue"}`}>
        <div className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">
          {penalized ? "XP Penalty" : "XP Breakdown"}
        </div>
        <div className="space-y-2 text-sm">
          {penalized ? (
            <>
              <div className="flex justify-between">
                <span className="text-text-secondary font-light">Accuracy</span>
                <span className="font-mono text-bauhaus-red">{accuracy}% (need 70%)</span>
              </div>
              <div className="flex justify-between border-t-2 border-surface-border pt-2 font-bold">
                <span className="text-text-primary">XP Lost</span>
                <span className="font-mono text-bauhaus-red">{xp}</span>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="animate-fade-up stagger-3 flex flex-col gap-3">
        <Link
          href={["sudden-death", "sprint", "crossword"].includes(mode) ? `/games/${mode}` : `/quiz/${section}`}
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
