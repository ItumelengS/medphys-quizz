"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  calculateXp,
  getReactionRoundsTimer,
  calculateReactionRoundsPoints,
} from "@/lib/scoring";
import {
  ALL_CATEGORIES,
  getCategoriesForRole,
  generatePair,
  type ReactionRole,
  type ReactionPair,
} from "@/data/reaction-rounds-data";
import TimerRing from "@/components/TimerRing";

type GamePhase = "ready" | "countdown" | "playing" | "dead" | "results";

const ROLES: { value: ReactionRole; label: string; icon: string }[] = [
  { value: "physicist", label: "Medical Physicist", icon: "⚛️" },
  { value: "therapist", label: "Radiation Therapist", icon: "📐" },
  { value: "oncologist", label: "Radiation Oncologist", icon: "🏥" },
  { value: "dosimetrist", label: "Dosimetrist", icon: "📊" },
  { value: "engineer", label: "Engineer", icon: "⚙️" },
  { value: "all", label: "ALL (Chaos Mode)", icon: "🔀" },
];

export default function ReactionRoundsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [phase, setPhase] = useState<GamePhase>("ready");
  const [selectedRole, setSelectedRole] = useState<ReactionRole>("all");
  const [round, setRound] = useState(0);
  const [points, setPoints] = useState(0);
  const [currentPair, setCurrentPair] = useState<ReactionPair | null>(null);
  const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(null);
  const [flashResult, setFlashResult] = useState<"correct" | "wrong" | null>(null);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [countdownValue, setCountdownValue] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundStartRef = useRef<number>(0);
  const usedCategoriesRef = useRef<Set<string>>(new Set());

  const timerTotal = getReactionRoundsTimer(round);

  // Set default role from user's discipline
  useEffect(() => {
    if (session?.user?.discipline) {
      const d = session.user.discipline;
      if (["physicist", "therapist", "oncologist", "engineer"].includes(d)) {
        setSelectedRole(d as ReactionRole);
      }
    }
  }, [session]);

  function startGame() {
    setPhase("countdown");
    setCountdownValue(3);
    setRound(0);
    setPoints(0);
    setReactionTimes([]);
    setSelectedSide(null);
    setFlashResult(null);
    usedCategoriesRef.current = new Set();

    let count = 3;
    const cdInterval = setInterval(() => {
      count--;
      setCountdownValue(count);
      if (count <= 0) {
        clearInterval(cdInterval);
        setPhase("playing");
        nextRound(0);
      }
    }, 700);
  }

  function nextRound(nextRoundNum: number) {
    const categories = getCategoriesForRole(selectedRole);
    const pair = generatePair(categories, nextRoundNum, usedCategoriesRef.current);
    usedCategoriesRef.current.add(pair.category);
    // Reset after cycling through most categories
    if (usedCategoriesRef.current.size >= categories.length - 1) {
      usedCategoriesRef.current.clear();
    }

    setCurrentPair(pair);
    setSelectedSide(null);
    setFlashResult(null);
    setRound(nextRoundNum);
    roundStartRef.current = Date.now();

    // Start timer
    const total = getReactionRoundsTimer(nextRoundNum);
    setTimeRemaining(total);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current!);
          handleDeath();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  }

  const handleDeath = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("dead");
  }, []);

  function handleTap(side: "left" | "right") {
    if (!currentPair || selectedSide !== null || phase !== "playing") return;

    if (timerRef.current) clearInterval(timerRef.current);
    const reactionMs = Date.now() - roundStartRef.current;

    const tappedValue = side === "left" ? currentPair.left.value : currentPair.right.value;
    const otherValue = side === "left" ? currentPair.right.value : currentPair.left.value;

    let correct: boolean;
    if (currentPair.prompt === "higher") {
      correct = tappedValue > otherValue;
    } else {
      correct = tappedValue < otherValue;
    }

    // Handle equal values — always wrong (trick round)
    if (tappedValue === otherValue) correct = false;

    setSelectedSide(side);
    setFlashResult(correct ? "correct" : "wrong");
    setReactionTimes((prev) => [...prev, reactionMs]);

    if (correct) {
      const earned = calculateReactionRoundsPoints(
        round,
        reactionMs,
        timerTotal * 1000
      );
      setPoints((p) => p + earned);

      // Brief reveal of values then next round
      setTimeout(() => {
        nextRound(round + 1);
      }, 800);
    } else {
      // Death
      setTimeout(() => {
        handleDeath();
      }, 600);
    }
  }

  async function submitAndShowResults() {
    if (submitting) return;
    setSubmitting(true);

    const score = round;
    const total = round + 1; // includes the fatal round
    const avgReaction = reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0;

    const xpResult = calculateXp(points, "reaction-rounds", score, total, 0);

    let responseData: Record<string, unknown> | null = null;
    if (session?.user?.id) {
      const res = await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: "reaction-rounds",
          answers: [],
          score,
          total,
          points,
          bestStreak: score,
          section: selectedRole,
          sectionName: `Reaction Rounds (${ROLES.find((r) => r.value === selectedRole)?.label || selectedRole})`,
          metadata: {
            role: selectedRole,
            avgReactionMs: avgReaction,
            bestReactionMs: reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0,
            roundsSurvived: score,
          },
        }),
      });
      try { responseData = await res.json(); } catch { /* ignore */ }
    }

    const rrXpChange = (responseData?.xpChange as number) ?? xpResult.totalXp;
    const rrPenalized = (responseData?.penalized as boolean) ?? false;

    const resultParams = new URLSearchParams({
      score: score.toString(),
      total: total.toString(),
      points: points.toString(),
      bestStreak: score.toString(),
      section: selectedRole,
      sectionName: `Reaction Rounds`,
      mode: "reaction-rounds",
      xp: rrXpChange.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      penalized: rrPenalized ? "1" : "0",
    });
    if (responseData?.ratingUpdate) {
      const ru = responseData.ratingUpdate as { newRating: number; ratingDelta: number };
      resultParams.set("ratingNew", ru.newRating.toString());
      resultParams.set("ratingDelta", ru.ratingDelta.toString());
    }
    router.push(`/results?${resultParams.toString()}`);
  }

  const avgReaction = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;
  const bestReaction = reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0;

  // ── Ready Screen ──────────────────────────────────────────
  if (phase === "ready") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col">
        <Link href="/games" className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary mb-6">
          &larr; Game Variants
        </Link>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-7xl mb-6">⚡</span>
          <h1 className="text-4xl font-black text-[#f97316] mb-2">REACTION ROUNDS</h1>
          <div className="w-16 h-1 bg-[#f97316] mx-auto mb-4" />
          <p className="text-text-secondary text-sm font-light mb-6 max-w-xs">
            Two items appear — you must know which value is higher or lower from memory. One wrong = game over.
            One wrong answer = game over.
          </p>

          {/* Role Selector */}
          <div className="w-full max-w-xs mb-8">
            <label className="text-text-dim text-xs uppercase tracking-widest block mb-2">
              Select your role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`px-3 py-2.5 rounded-none text-xs font-bold transition-all border-2 ${
                    selectedRole === role.value
                      ? "border-[#f97316] bg-[#f97316]/10 text-[#f97316]"
                      : "border-border-primary bg-bg-secondary text-text-secondary hover:border-text-dim"
                  }`}
                >
                  <span className="mr-1">{role.icon}</span> {role.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs text-text-dim mb-8">
            <div>5s timer that shrinks to 2s</div>
            <div>Speed bonus for fast taps · 1.8x XP</div>
            <div className="text-[#f97316]/70 mt-1">
              {getCategoriesForRole(selectedRole).length} categories available
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-none font-bold text-white bg-[#f97316] hover:opacity-90 active:scale-95 transition-all"
          >
            PLAY
          </button>
        </div>
      </main>
    );
  }

  // ── Countdown ─────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl font-black text-[#f97316] animate-pulse">
            {countdownValue > 0 ? countdownValue : "GO!"}
          </div>
        </div>
      </main>
    );
  }

  // ── Dead Screen ───────────────────────────────────────────
  if (phase === "dead") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-8xl mb-4">💥</span>
        <h1 className="text-4xl font-black text-bauhaus-red mb-2">GAME OVER</h1>
        <div className="w-16 h-1 bg-bauhaus-red mx-auto mb-6" />

        {/* Show the correct answer */}
        {currentPair && (
          <div className="bg-bg-secondary border border-border-primary rounded-none p-4 mb-6 text-center max-w-xs">
            <div className="text-text-dim text-xs uppercase mb-2">The answer was</div>
            <div className="text-sm text-text-secondary">
              <span className="font-bold text-text-primary">{currentPair.left.label}</span>
              <span className="text-text-dim"> = </span>
              <span className="font-mono text-[#f97316]">{currentPair.left.value} {currentPair.left.unit}</span>
            </div>
            <div className="text-sm text-text-secondary mt-1">
              <span className="font-bold text-text-primary">{currentPair.right.label}</span>
              <span className="text-text-dim"> = </span>
              <span className="font-mono text-[#f97316]">{currentPair.right.value} {currentPair.right.unit}</span>
            </div>
          </div>
        )}

        <div className="text-text-secondary text-sm mb-2">
          You survived <span className="font-bold text-text-primary text-3xl">{round}</span> rounds
        </div>
        <div className="font-mono text-2xl font-bold text-[#f97316] mb-1">{points} pts</div>

        {reactionTimes.length > 0 && (
          <div className="flex gap-6 text-xs text-text-dim mt-2 mb-8">
            <div>
              <span className="block text-text-secondary font-mono text-lg">{avgReaction}ms</span>
              avg reaction
            </div>
            <div>
              <span className="block text-text-secondary font-mono text-lg">{bestReaction}ms</span>
              best reaction
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="px-6 py-3 rounded-none font-bold text-white bg-[#f97316] hover:opacity-90 active:scale-95 transition-all"
          >
            PLAY AGAIN
          </button>
          <button
            onClick={submitAndShowResults}
            disabled={submitting}
            className="px-6 py-3 rounded-none font-bold text-text-primary bg-bg-secondary border border-border-primary hover:border-text-dim active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Results"}
          </button>
        </div>
      </main>
    );
  }

  // ── Playing Screen ────────────────────────────────────────
  if (!currentPair) return null;

  const promptColor = currentPair.prompt === "higher" ? "#16a34a" : "#dc2626";
  const promptText = currentPair.prompt === "higher" ? "TAP THE HIGHER ONE" : "TAP THE LOWER ONE";

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="text-xs text-text-dim uppercase tracking-widest">Round {round + 1}</span>
        </div>
        <div className="font-mono text-sm font-bold text-[#f97316]">{points} pts</div>
        <TimerRing timeRemaining={timeRemaining} totalTime={timerTotal} />
      </div>

      {/* Category hint */}
      <div className="text-center text-xs text-text-dim uppercase tracking-widest mb-3">
        {currentPair.category}
      </div>

      {/* Prompt */}
      <div
        className="text-center py-3 mb-6 font-black text-xl tracking-wide"
        style={{ color: promptColor }}
      >
        {promptText}
      </div>

      {/* Two tap targets */}
      <div className="flex-1 flex gap-3 items-stretch min-h-[200px]">
        {(["left", "right"] as const).map((side) => {
          const value = side === "left" ? currentPair.left : currentPair.right;
          let bgClass = "bg-bg-secondary border-border-primary hover:border-[#f97316] active:scale-[0.98]";

          if (flashResult && selectedSide) {
            if (side === selectedSide) {
              bgClass = flashResult === "correct"
                ? "bg-green-500/20 border-green-500"
                : "bg-red-500/20 border-red-500";
            }
          }

          return (
            <button
              key={side}
              onClick={() => handleTap(side)}
              disabled={selectedSide !== null}
              className={`flex-1 flex flex-col items-center justify-center rounded-none border-2 transition-all ${bgClass}`}
            >
              <div className="text-text-primary font-bold text-base text-center px-3 leading-tight">
                {value.label}
              </div>
              {/* Only reveal the value after answering */}
              {flashResult && selectedSide && (
                <div className="font-mono text-2xl font-black text-[#f97316] mt-3 animate-fade-up">
                  {value.value} {value.unit}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Streak indicator */}
      {round > 0 && (
        <div className="text-center mt-4 text-text-dim text-xs">
          Streak: <span className="font-bold text-text-primary">{round}</span>
          {round >= 10 && " 🔥"}
          {round >= 20 && " 🔥"}
        </div>
      )}
    </main>
  );
}
