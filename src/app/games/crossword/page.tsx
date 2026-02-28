"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { generateCrossword } from "@/lib/crossword-generator";
import { calculateCrosswordScore, calculateXp } from "@/lib/scoring";
import type { CrosswordPuzzle, DbCrosswordClue } from "@/lib/types";
import CrosswordGrid from "@/components/CrosswordGrid";
import type { PuzzleSubmitResult } from "@/components/CrosswordGrid";

type Phase = "setup" | "playing" | "complete";
type TimerOption = null | 300 | 600 | 900;

export default function CrosswordPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [phase, setPhase] = useState<Phase>("setup");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [timerOption, setTimerOption] = useState<TimerOption>(null);
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Game state
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [puzzleResult, setPuzzleResult] = useState<PuzzleSubmitResult | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clueIds, setClueIds] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch categories from DB
  useEffect(() => {
    fetch("/api/crossword-clues/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []));
  }, []);

  async function generatePuzzle() {
    setGenerating(true);
    setError("");

    try {
      const params = new URLSearchParams({ limit: "50" });
      if (selectedCategory !== "all") params.set("category", selectedCategory);

      const res = await fetch(`/api/crossword-clues?${params}`);
      const clues: DbCrosswordClue[] = await res.json();

      if (clues.length < 10) {
        setError("Not enough clues in this category for a crossword.");
        setGenerating(false);
        return;
      }

      const entries = clues.map((c) => ({
        answer: c.answer,
        clue: c.clue,
        questionId: c.id,
      }));

      const result = generateCrossword(entries);

      if (!result || result.words.length < 6) {
        setError("Could not generate a good crossword. Try a different category.");
        setGenerating(false);
        return;
      }

      setPuzzle(result);
      setClueIds(result.words.map((w) => w.questionId));
      setPuzzleResult(null);
      setAllDone(false);
      setTimeElapsed(0);

      if (timerOption) {
        setTimeRemaining(timerOption);
      } else {
        setTimeRemaining(null);
      }

      startTimeRef.current = Date.now();
      setPhase("playing");
    } catch {
      setError("Failed to generate crossword. Please try again.");
    }
    setGenerating(false);
  }

  // Timer
  useEffect(() => {
    if (phase !== "playing" || allDone) return;

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeElapsed(elapsed);

      if (timerOption) {
        const remaining = timerOption - elapsed;
        setTimeRemaining(Math.max(0, remaining));
        if (remaining <= 0) {
          setPhase("complete");
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timerOption, allDone]);

  const handlePuzzleSubmit = useCallback((result: PuzzleSubmitResult) => {
    setPuzzleResult(result);

    if (result.allCorrect) {
      setAllDone(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("complete");
    }
  }, []);

  async function submitAndNavigate() {
    if (submitting || !puzzle || !puzzleResult) return;
    setSubmitting(true);

    const { wordsCorrect, totalWords, wordsWithHint, hintsUsed } = puzzleResult;
    const wordsWithoutHint = wordsCorrect - wordsWithHint;
    const remaining = timeRemaining ?? 0;

    const points = calculateCrosswordScore(
      wordsWithoutHint,
      wordsWithHint,
      true, // only reachable when allCorrect
      timerOption !== null,
      remaining,
      hintsUsed
    );

    const xpResult = calculateXp(points, "crossword", wordsCorrect, totalWords, 0);

    if (session?.user?.id) {
      await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: "crossword",
          answers: clueIds.map((cid) => ({
            questionId: cid,
            correct: true,
            timeRemaining: 0,
            pointsEarned: 0,
          })),
          score: wordsCorrect,
          total: totalWords,
          points,
          bestStreak: 0,
          section: selectedCategory,
          sectionName: selectedCategory === "all" ? "All Categories" : selectedCategory,
          durationSeconds: timeElapsed,
          metadata: {
            wordsWithoutHint,
            wordsWithHint,
            hintsUsed,
            timerOption,
            allComplete: true,
          },
        }),
      });
    }

    const sName = selectedCategory === "all" ? "Crossword" : `Crossword — ${selectedCategory}`;
    const resultParams = new URLSearchParams({
      score: wordsCorrect.toString(),
      total: totalWords.toString(),
      points: points.toString(),
      bestStreak: "0",
      section: selectedCategory,
      sectionName: sName,
      mode: "crossword",
      xp: xpResult.totalXp.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      penalized: "0",
    });
    router.push(`/results?${resultParams.toString()}`);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Setup screen
  if (phase === "setup") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto">
        <Link href="/games" className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary mb-6 block">
          ← Game Variants
        </Link>

        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🧩</span>
          <h1 className="text-3xl font-black text-bauhaus-blue mb-2">CROSSWORD</h1>
          <div className="w-12 h-1 bg-bauhaus-blue mx-auto mb-3" />
          <p className="text-text-secondary text-sm font-light">
            Medical physics crossword. Fill the grid using crossword-style clues.
          </p>
        </div>

        {/* Category picker */}
        <div className="mb-6">
          <label className="text-xs text-text-dim uppercase tracking-wider font-bold mb-2 block">
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`p-3 rounded-none text-sm font-bold border-2 transition-all ${
                selectedCategory === "all"
                  ? "border-bauhaus-blue text-bauhaus-blue bg-bauhaus-blue/10"
                  : "border-surface-border text-text-secondary hover:bg-surface"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`p-3 rounded-none text-sm font-bold border-2 transition-all text-left ${
                  selectedCategory === cat
                    ? "border-bauhaus-blue text-bauhaus-blue bg-bauhaus-blue/10"
                    : "border-surface-border text-text-secondary hover:bg-surface"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Timer picker */}
        <div className="mb-8">
          <label className="text-xs text-text-dim uppercase tracking-wider font-bold mb-2 block">
            Timer
          </label>
          <div className="grid grid-cols-4 gap-2">
            {([null, 300, 600, 900] as TimerOption[]).map((opt) => (
              <button
                key={String(opt)}
                onClick={() => setTimerOption(opt)}
                className={`p-3 rounded-none text-sm font-bold border-2 transition-all ${
                  timerOption === opt
                    ? "border-bauhaus-yellow text-bauhaus-yellow bg-bauhaus-yellow/10"
                    : "border-surface-border text-text-secondary hover:bg-surface"
                }`}
              >
                {opt === null ? "None" : `${opt / 60}min`}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 border-2 border-bauhaus-red/30 text-bauhaus-red text-sm">
            {error}
          </div>
        )}

        <button
          onClick={generatePuzzle}
          disabled={generating}
          className="w-full py-3.5 rounded-none font-bold text-white bg-bauhaus-blue hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Crossword"}
        </button>
      </main>
    );
  }

  // Complete screen
  if (phase === "complete" && puzzleResult) {
    const { wordsCorrect, totalWords, wordsWithHint, hintsUsed } = puzzleResult;
    const wordsWithoutHint = wordsCorrect - wordsWithHint;
    const remaining = timeRemaining ?? 0;
    const points = calculateCrosswordScore(
      wordsWithoutHint,
      wordsWithHint,
      true,
      timerOption !== null,
      remaining,
      hintsUsed
    );

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">🏆</span>
        <h1 className="text-3xl font-black text-bauhaus-blue mb-2">COMPLETE!</h1>
        <div className="w-12 h-1 bg-bauhaus-blue mx-auto mb-6" />

        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-success">{wordsCorrect}/{totalWords}</div>
            <div className="text-text-dim text-xs uppercase">Words</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-bauhaus-blue">{points}</div>
            <div className="text-text-dim text-xs uppercase">Points</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">{formatTime(timeElapsed)}</div>
            <div className="text-text-dim text-xs uppercase">Time</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-bauhaus-yellow">{hintsUsed}</div>
            <div className="text-text-dim text-xs uppercase">Hints Used</div>
          </div>
        </div>

        {hintsUsed === 0 && (
          <div className="text-bauhaus-yellow text-sm font-mono mb-4">+75 perfect bonus!</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setPhase("setup"); setPuzzle(null); setPuzzleResult(null); }}
            className="px-6 py-3 rounded-none font-bold text-white bg-bauhaus-blue hover:opacity-90 active:scale-95 transition-all"
          >
            New Puzzle
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

  // Timer ran out without solving
  if (phase === "complete" && !puzzleResult) {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">🧩</span>
        <h1 className="text-3xl font-black text-bauhaus-blue mb-2">TIME&apos;S UP</h1>
        <div className="w-12 h-1 bg-bauhaus-blue mx-auto mb-6" />

        <p className="text-text-secondary text-sm mb-6 text-center">
          The puzzle wasn&apos;t completed in time. No XP awarded for incomplete crosswords.
        </p>

        <button
          onClick={() => { setPhase("setup"); setPuzzle(null); setPuzzleResult(null); }}
          className="px-6 py-3 rounded-none font-bold text-white bg-bauhaus-blue hover:opacity-90 active:scale-95 transition-all"
        >
          Try Again
        </button>
      </main>
    );
  }

  // Playing
  if (!puzzle) return null;

  const timerColor = timeRemaining !== null && timeRemaining < 60 ? "#dc2626" : "#2563eb";

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <span className="text-sm font-bold text-bauhaus-blue uppercase tracking-wider">Crossword</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold" style={{ color: timerColor }}>
            {timerOption
              ? formatTime(timeRemaining ?? 0)
              : formatTime(timeElapsed)
            }
          </span>
        </div>
      </div>

      <CrosswordGrid
        puzzle={puzzle}
        onPuzzleSubmit={handlePuzzleSubmit}
      />
    </main>
  );
}
