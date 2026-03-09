"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getRandomClues, type CrypticClue } from "@/lib/cryptic-clues";
import { calculateCrypticScore, calculateXp } from "@/lib/scoring";

type Phase = "setup" | "playing" | "complete";

const CLUE_COUNT = 10;
const TIME_PER_CLUE = 90; // seconds

export default function CrypticPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center text-text-secondary">Loading...</div>}>
      <CrypticPage />
    </Suspense>
  );
}

function CrypticPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | undefined>(undefined);
  const [clues, setClues] = useState<CrypticClue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [results, setResults] = useState<{ correct: boolean; timeUsed: number; revealed: boolean }[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_CLUE);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(Date.now());

  function startGame(diff?: 1 | 2 | 3) {
    setDifficulty(diff);
    const selected = getRandomClues(CLUE_COUNT, diff);
    setClues(selected);
    setCurrentIndex(0);
    setResults([]);
    setTimeLeft(TIME_PER_CLUE);
    setShowAnswer(false);
    setShowHint(false);
    setGuess("");
    startTimeRef.current = Date.now();
    setPhase("playing");
  }

  // Timer
  useEffect(() => {
    if (phase !== "playing" || showAnswer) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, showAnswer, currentIndex]);

  const submitGuess = useCallback(() => {
    if (phase !== "playing" || showAnswer) return;
    const clue = clues[currentIndex];
    const isCorrect = guess.trim().toUpperCase() === clue.answer.toUpperCase();
    const timeUsed = TIME_PER_CLUE - timeLeft;

    if (isCorrect) {
      setResults((prev) => [...prev, { correct: true, timeUsed, revealed: false }]);
      nextClue();
    } else {
      setShowAnswer(true);
    }
  }, [phase, showAnswer, guess, clues, currentIndex, timeLeft]);

  function markResult(correct: boolean) {
    const timeUsed = TIME_PER_CLUE - timeLeft;
    setResults((prev) => [...prev, { correct, timeUsed, revealed: true }]);
    nextClue();
  }

  function nextClue() {
    if (currentIndex + 1 >= clues.length) {
      setPhase("complete");
    } else {
      setCurrentIndex((prev) => prev + 1);
      setGuess("");
      setTimeLeft(TIME_PER_CLUE);
      setShowAnswer(false);
      setShowHint(false);
      startTimeRef.current = Date.now();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function skipClue() {
    setResults((prev) => [...prev, { correct: false, timeUsed: TIME_PER_CLUE, revealed: true }]);
    nextClue();
  }

  const score = results.filter((r) => r.correct).length;
  const total = results.length;
  const avgTime = total > 0 ? results.reduce((sum, r) => sum + r.timeUsed, 0) / total : 0;

  async function submitAndNavigate() {
    if (submitting) return;
    setSubmitting(true);

    const points = calculateCrypticScore(score, clues.length, avgTime);
    const xpResult = calculateXp(points, "cryptic", score, clues.length, 0);

    if (session?.user?.id) {
      await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: "cryptic",
          answers: clues.map((c, i) => ({
            questionId: c.id,
            correct: results[i]?.correct || false,
            timeRemaining: Math.max(0, TIME_PER_CLUE - (results[i]?.timeUsed || TIME_PER_CLUE)),
            pointsEarned: 0,
          })),
          score,
          total: clues.length,
          points,
          bestStreak: longestStreak(results.map((r) => r.correct)),
          section: "cryptic",
          sectionName: "Cryptic Clues",
          metadata: { difficulty, avgTime: Math.round(avgTime) },
        }),
      });
    }

    const resultParams = new URLSearchParams({
      score: score.toString(),
      total: clues.length.toString(),
      points: points.toString(),
      bestStreak: longestStreak(results.map((r) => r.correct)).toString(),
      section: "cryptic",
      sectionName: "Cryptic Clues",
      mode: "cryptic",
      xp: xpResult.totalXp.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      penalized: "0",
    });
    router.push(`/results?${resultParams.toString()}`);
  }

  // ── Setup ──
  if (phase === "setup") {
    return (
      <main className="min-h-dvh px-4 pt-8 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-6xl mb-4">🔮</span>
        <h1 className="text-3xl font-black text-[#be185d] mb-2 uppercase tracking-wider">
          Cryptic Clues
        </h1>
        <div className="w-12 h-1 bg-[#be185d] mx-auto mb-6" />
        <p className="text-text-secondary text-sm text-center mb-8 max-w-sm">
          Solve cryptic crossword-style clues for medical physics terms. Each clue has a wordplay component and a definition.
        </p>

        <div className="w-full space-y-3 mb-6">
          <button
            onClick={() => startGame(undefined)}
            className="w-full py-3 rounded-none font-bold text-white bg-[#be185d] hover:opacity-90 active:scale-95 transition-all"
          >
            Mixed Difficulty
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => startGame(1)}
              className="py-3 rounded-none font-bold text-sm border-2 border-green-600 text-green-600 hover:bg-green-600/10 active:scale-95 transition-all"
            >
              Easy
            </button>
            <button
              onClick={() => startGame(2)}
              className="py-3 rounded-none font-bold text-sm border-2 border-bauhaus-yellow text-bauhaus-yellow hover:bg-bauhaus-yellow/10 active:scale-95 transition-all"
            >
              Medium
            </button>
            <button
              onClick={() => startGame(3)}
              className="py-3 rounded-none font-bold text-sm border-2 border-bauhaus-red text-bauhaus-red hover:bg-bauhaus-red/10 active:scale-95 transition-all"
            >
              Hard
            </button>
          </div>
        </div>

        <Link href="/games" className="text-text-dim text-xs hover:text-text-secondary">
          ← Back to Games
        </Link>
      </main>
    );
  }

  // ── Complete ──
  if (phase === "complete") {
    const points = calculateCrypticScore(score, clues.length, avgTime);
    const perfect = score === clues.length;

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">{score >= 7 ? "🎉" : score >= 4 ? "👍" : "😔"}</span>
        <h1 className="text-3xl font-black text-[#be185d] mb-2">
          {perfect ? "PERFECT!" : `${score}/${clues.length}`}
        </h1>
        <div className="w-12 h-1 bg-[#be185d] mx-auto mb-6" />

        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-[#be185d]">{points}</div>
            <div className="text-text-dim text-xs uppercase">Points</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">
              {Math.round(avgTime)}s
            </div>
            <div className="text-text-dim text-xs uppercase">Avg Time</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">
              {score}/{clues.length}
            </div>
            <div className="text-text-dim text-xs uppercase">Correct</div>
          </div>
        </div>

        {/* Review */}
        <div className="w-full space-y-2 mb-6 max-h-60 overflow-y-auto">
          {clues.map((c, i) => (
            <div
              key={c.id}
              className={`p-3 rounded-none border-2 text-xs ${
                results[i]?.correct
                  ? "border-green-600/30 bg-green-600/5"
                  : "border-bauhaus-red/30 bg-bauhaus-red/5"
              }`}
            >
              <div className="text-text-secondary italic mb-1">{c.clue}</div>
              <div className="font-bold text-text-primary">{c.answer}</div>
              <div className="text-text-dim mt-1">{c.wordplay}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => startGame(difficulty)}
            className="px-6 py-3 rounded-none font-bold text-white bg-[#be185d] hover:opacity-90 active:scale-95 transition-all"
          >
            Play Again
          </button>
          <button
            onClick={submitAndNavigate}
            disabled={submitting}
            className="px-6 py-3 rounded-none font-bold text-text-primary border-2 border-surface-border hover:bg-surface active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Results"}
          </button>
        </div>
      </main>
    );
  }

  // ── Playing ──
  const clue = clues[currentIndex];
  if (!clue) {
    return <main className="min-h-dvh flex items-center justify-center text-text-secondary">Loading clues...</main>;
  }
  const progress = ((currentIndex) / clues.length) * 100;
  const timerPct = (timeLeft / TIME_PER_CLUE) * 100;

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link href="/games" className="text-text-dim text-xs hover:text-text-secondary">←</Link>
          <span className="text-lg">🔮</span>
          <span className="text-sm font-bold text-[#be185d] uppercase tracking-wider">
            Cryptic
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-text-secondary">
            {score}/{currentIndex + (showAnswer ? 1 : 0)}
          </span>
          <span className="font-mono text-xs text-text-dim">
            {currentIndex + 1}/{clues.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-surface-border mb-4 relative">
        <div
          className="h-full bg-[#be185d] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-surface-border mb-6 relative rounded-none overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            timeLeft <= 10 ? "bg-bauhaus-red animate-pulse" : "bg-[#be185d]"
          }`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Difficulty badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border ${
            clue.difficulty === 1
              ? "border-green-600 text-green-600"
              : clue.difficulty === 2
                ? "border-bauhaus-yellow text-bauhaus-yellow"
                : "border-bauhaus-red text-bauhaus-red"
          }`}
        >
          {clue.difficulty === 1 ? "Easy" : clue.difficulty === 2 ? "Medium" : "Hard"}
        </span>
        <span className="font-mono text-lg font-bold text-text-dim">
          {timeLeft}s
        </span>
      </div>

      {/* Clue */}
      <div className="bg-surface border-2 border-surface-border border-l-4 border-l-[#be185d] p-6 mb-6">
        <p className="text-lg text-text-primary font-serif italic leading-relaxed">
          &ldquo;{clue.clue}&rdquo;
        </p>
        <div className="mt-3 text-text-dim text-xs font-mono">
          Length: {clue.length}
        </div>
      </div>

      {/* Hint */}
      {!showAnswer && (
        <button
          onClick={() => setShowHint(true)}
          className={`mb-4 text-xs text-center transition-all ${
            showHint ? "text-[#be185d]" : "text-text-dim hover:text-text-secondary"
          }`}
        >
          {showHint ? clue.wordplay : "Show hint"}
        </button>
      )}

      {/* Input or answer reveal */}
      {!showAnswer ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitGuess();
          }}
          className="flex gap-2 mb-4"
        >
          <input
            ref={inputRef}
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Type your answer..."
            autoFocus
            className="flex-1 px-4 py-3 rounded-none border-2 border-surface-border bg-surface text-text-primary font-mono uppercase tracking-wider focus:border-[#be185d] focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!guess.trim()}
            className="px-6 py-3 rounded-none font-bold text-white bg-[#be185d] hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
          >
            →
          </button>
        </form>
      ) : (
        <div className="mb-4">
          <div className="p-4 rounded-none border-2 border-bauhaus-red/30 bg-bauhaus-red/5 text-center mb-3">
            <div className="text-xs text-text-dim uppercase tracking-wider mb-1">Answer</div>
            <div className="text-2xl font-black text-text-primary tracking-widest">
              {clue.answer}
            </div>
            <div className="text-xs text-text-secondary mt-2 italic">
              {clue.wordplay}
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => markResult(true)}
              className="px-6 py-2.5 rounded-none text-sm font-bold border-2 border-green-600 text-green-600 hover:bg-green-600/10 active:scale-95 transition-all"
            >
              I knew it ✓
            </button>
            <button
              onClick={() => markResult(false)}
              className="px-6 py-2.5 rounded-none text-sm font-bold border-2 border-bauhaus-red text-bauhaus-red hover:bg-bauhaus-red/10 active:scale-95 transition-all"
            >
              Didn&apos;t know ✗
            </button>
          </div>
        </div>
      )}

      {/* Skip */}
      {!showAnswer && (
        <button
          onClick={skipClue}
          className="text-text-dim text-xs text-center hover:text-text-secondary transition-all"
        >
          Skip →
        </button>
      )}
    </main>
  );
}

function longestStreak(results: boolean[]): number {
  let max = 0;
  let current = 0;
  for (const r of results) {
    if (r) { current++; max = Math.max(max, current); }
    else current = 0;
  }
  return max;
}
