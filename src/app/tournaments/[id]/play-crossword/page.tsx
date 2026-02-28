"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CrosswordGrid from "@/components/CrosswordGrid";
import type { PuzzleSubmitResult } from "@/components/CrosswordGrid";
import type { CrosswordPuzzle } from "@/lib/types";

type Phase = "loading" | "playing" | "submitting" | "results";

interface RoundResult {
  points_earned: number;
  fire_multiplier: number;
  fire_streak: number;
  berserk_bonus: boolean;
  wordsCompleted: number;
  wordsRevealed: number;
  wordsWithoutReveal: number;
  totalWords: number;
  baseScore: number;
  timeBonus: number;
  remainingSeconds: number;
  accuracy: number;
  xp: { totalXp: number; baseXp: number; bonusXp: number; perfectBonusXp: number };
}

export default function PlayCrosswordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const berserk = searchParams.get("berserk") === "true";

  const [phase, setPhase] = useState<Phase>("loading");
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [wordsRevealed, setWordsRevealed] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [clueIds, setClueIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RoundResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch puzzle on mount
  useEffect(() => {
    if (!session?.user?.id) return;

    fetch(`/api/tournaments/${id}/crossword-puzzle`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        const effectiveTimer = berserk
          ? Math.ceil(data.timerSeconds / 2)
          : data.timerSeconds;
        setPuzzle(data.puzzle);
        setTimerSeconds(effectiveTimer);
        setTimeRemaining(effectiveTimer);
        setClueIds(data.puzzle.words.map((w: { questionId: string }) => w.questionId));
        startTimeRef.current = Date.now();
        setPhase("playing");
      })
      .catch(() => setError("Failed to load puzzle"));
  }, [id, session?.user?.id, berserk]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeElapsed(elapsed);
      const remaining = timerSeconds - elapsed;
      setTimeRemaining(Math.max(0, remaining));

      if (remaining <= 0) {
        setPhase("submitting");
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timerSeconds]);

  const handlePuzzleSubmit = useCallback((result: PuzzleSubmitResult) => {
    if (result.allCorrect) {
      setWordsCompleted(result.wordsCorrect);
      setWordsRevealed(result.wordsWithHint);
      setAllDone(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("submitting");
    }
    // If not all correct, grid shows feedback — user keeps playing
  }, []);

  // Submit round when phase becomes "submitting"
  useEffect(() => {
    if (phase !== "submitting") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const totalWords = puzzle?.words.length || 0;

    fetch(`/api/tournaments/${id}/crossword-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        berserk,
        wordsCompleted,
        wordsRevealed,
        totalWords,
        allComplete: allDone,
        clueIds,
        durationSeconds: elapsed,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setPhase("playing");
          return;
        }
        setResult(data);
        setPhase("results");
      })
      .catch(() => {
        setError("Failed to submit round");
        setPhase("playing");
      });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!session) return null;

  // Error state
  if (error && phase === "loading") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-bauhaus-red text-sm mb-4">{error}</div>
        <Link
          href={`/tournaments/${id}`}
          className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary"
        >
          Back to Tournament
        </Link>
      </main>
    );
  }

  // Loading state
  if (phase === "loading") {
    return (
      <main className="min-h-dvh flex items-center justify-center text-text-secondary">
        Generating puzzle...
      </main>
    );
  }

  // Results screen
  if (phase === "results" && result) {
    const totalWords = puzzle?.words.length || 0;
    const isPerfect = result.wordsCompleted === totalWords && result.wordsRevealed === 0;

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">{isPerfect ? "🏆" : "🧩"}</span>
        <h1 className="text-3xl font-black text-indigo-500 mb-2">
          {allDone ? "COMPLETE!" : "TIME'S UP"}
        </h1>
        <div className="w-12 h-1 bg-indigo-500 mx-auto mb-6" />

        <div className="grid grid-cols-2 gap-4 mb-6 text-center w-full max-w-xs">
          <div>
            <div className="font-mono text-2xl font-bold text-success">{result.wordsCompleted}</div>
            <div className="text-text-dim text-xs uppercase">Words Solved</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-indigo-500">{result.points_earned}</div>
            <div className="text-text-dim text-xs uppercase">Points</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">{formatTime(timeElapsed)}</div>
            <div className="text-text-dim text-xs uppercase">Time</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-bauhaus-yellow">{result.wordsRevealed}</div>
            <div className="text-text-dim text-xs uppercase">Revealed</div>
          </div>
        </div>

        {/* Bonuses */}
        <div className="space-y-1 mb-6 text-center">
          {result.fire_multiplier > 1 && (
            <div className="text-orange-500 text-sm font-mono">
              🔥 {result.fire_multiplier}x fire multiplier (streak: {result.fire_streak})
            </div>
          )}
          {result.berserk_bonus && (
            <div className="text-bauhaus-red text-sm font-mono">
              💀 1.5x berserk bonus!
            </div>
          )}
          {isPerfect && (
            <div className="text-bauhaus-yellow text-sm font-mono">+75 perfect bonus!</div>
          )}
          {result.xp && (
            <div className="text-text-secondary text-sm font-mono">
              +{result.xp.totalXp} XP
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setPhase("loading");
              setPuzzle(null);
              setWordsCompleted(0);
              setWordsRevealed(0);
              setAllDone(false);
              setError("");
              setResult(null);
              // Re-fetch a new puzzle
              fetch(`/api/tournaments/${id}/crossword-puzzle`)
                .then((r) => r.json())
                .then((data) => {
                  if (data.error) {
                    setError(data.error);
                    return;
                  }
                  const effectiveTimer = berserk
                    ? Math.ceil(data.timerSeconds / 2)
                    : data.timerSeconds;
                  setPuzzle(data.puzzle);
                  setTimerSeconds(effectiveTimer);
                  setTimeRemaining(effectiveTimer);
                  setTimeElapsed(0);
                  setClueIds(data.puzzle.words.map((w: { questionId: string }) => w.questionId));
                  startTimeRef.current = Date.now();
                  setPhase("playing");
                })
                .catch(() => setError("Failed to load puzzle"));
            }}
            className="px-6 py-3 rounded-none font-bold text-white bg-indigo-500 hover:opacity-90 active:scale-95 transition-all"
          >
            Play Another
          </button>
          <button
            onClick={() => router.push(`/tournaments/${id}`)}
            className="px-6 py-3 rounded-none font-bold text-text-primary border-2 border-surface-border hover:bg-surface active:scale-95 transition-all"
          >
            Leaderboard
          </button>
        </div>
      </main>
    );
  }

  // Playing
  if (!puzzle) return null;

  const timerColor = timeRemaining < 60 ? "#dc2626" : "#6366f1";
  const timerPercent = timerSeconds > 0 ? (timeRemaining / timerSeconds) * 100 : 100;

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <span className="text-sm font-bold text-indigo-500 uppercase tracking-wider">
            Tournament
          </span>
          {berserk && (
            <span className="text-xs font-bold text-bauhaus-red uppercase">💀 Berserk</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-dim text-xs">
            {wordsCompleted}/{puzzle.words.length} words
          </span>
          <span className="font-mono text-sm font-bold" style={{ color: timerColor }}>
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1 bg-surface-border mb-3">
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${timerPercent}%`,
            backgroundColor: timerColor,
          }}
        />
      </div>

      {error && (
        <div className="mb-3 p-2 border-2 border-bauhaus-red/30 text-bauhaus-red text-xs">
          {error}
        </div>
      )}

      <CrosswordGrid
        puzzle={puzzle}
        onPuzzleSubmit={handlePuzzleSubmit}
      />
    </main>
  );
}
