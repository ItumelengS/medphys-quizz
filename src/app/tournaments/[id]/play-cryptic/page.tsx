"use client";

import { useState, useEffect, useCallback, useRef, use, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getRandomClues, type CrypticClue } from "@/lib/cryptic-clues";
import { calculateCrypticScore } from "@/lib/scoring";

type Phase = "playing" | "submitting" | "results";

const CLUE_COUNT = 10;
const TIME_PER_CLUE = 90;

interface RoundResult {
  points_earned: number;
  fire_multiplier: number;
  fire_streak: number;
  correct: number;
  total: number;
  baseScore: number;
}

export default function TournamentCrypticPageWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center text-text-secondary">Loading...</div>}>
      <TournamentCrypticPage params={params} />
    </Suspense>
  );
}

function TournamentCrypticPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const berserk = searchParams.get("berserk") === "true";

  const [clues] = useState<CrypticClue[]>(() => getRandomClues(CLUE_COUNT));
  const [phase, setPhase] = useState<Phase>("playing");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [results, setResults] = useState<{ correct: boolean; timeUsed: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_CLUE);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState("");
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const submitRound = useCallback(
    async (finalResults: { correct: boolean; timeUsed: number }[]) => {
      if (!session?.user?.id) return;
      setPhase("submitting");

      const correct = finalResults.filter((r) => r.correct).length;
      const total = finalResults.length;
      const avgTime = total > 0 ? finalResults.reduce((s, r) => s + r.timeUsed, 0) / total : 0;

      try {
        const res = await fetch(`/api/tournaments/${id}/cryptic-round`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            correct,
            total,
            avgTimePerClue: avgTime,
            berserk,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to submit round");
          setPhase("playing");
          return;
        }
        setRoundResult(data);
        setPhase("results");
      } catch {
        setError("Failed to submit round");
        setPhase("playing");
      }
    },
    [id, session?.user?.id, berserk]
  );

  const handleSubmitGuess = useCallback(() => {
    if (phase !== "playing" || showAnswer) return;
    const clue = clues[currentIndex];
    const isCorrect = guess.trim().toUpperCase() === clue.answer.toUpperCase();
    const timeUsed = TIME_PER_CLUE - timeLeft;

    if (isCorrect) {
      const newResults = [...results, { correct: true, timeUsed }];
      setResults(newResults);
      if (currentIndex + 1 >= clues.length) {
        submitRound(newResults);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setGuess("");
        setTimeLeft(TIME_PER_CLUE);
        setShowAnswer(false);
        setShowHint(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else {
      setShowAnswer(true);
    }
  }, [phase, showAnswer, guess, clues, currentIndex, timeLeft, results, submitRound]);

  function markResult(correct: boolean) {
    const timeUsed = TIME_PER_CLUE - timeLeft;
    const newResults = [...results, { correct, timeUsed }];
    setResults(newResults);
    if (currentIndex + 1 >= clues.length) {
      submitRound(newResults);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setGuess("");
      setTimeLeft(TIME_PER_CLUE);
      setShowAnswer(false);
      setShowHint(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function skipClue() {
    const newResults = [...results, { correct: false, timeUsed: TIME_PER_CLUE }];
    setResults(newResults);
    if (currentIndex + 1 >= clues.length) {
      submitRound(newResults);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setGuess("");
      setTimeLeft(TIME_PER_CLUE);
      setShowAnswer(false);
      setShowHint(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  if (error) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-bauhaus-red text-lg font-bold mb-4">{error}</div>
        <Link href={`/tournaments/${id}`} className="text-bauhaus-blue font-bold">
          ← Back to Tournament
        </Link>
      </main>
    );
  }

  // Results
  if (phase === "results" && roundResult) {
    const correct = roundResult.correct;
    const total = roundResult.total;
    const perfect = correct === total && total > 0;

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">{correct >= 7 ? "🎉" : correct >= 4 ? "👍" : "😔"}</span>
        <h1 className="text-3xl font-black text-[#be185d] mb-2">
          {perfect ? "PERFECT!" : `${correct}/${total}`}
        </h1>
        <div className="w-12 h-1 bg-[#be185d] mx-auto mb-6" />

        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-[#be185d]">
              {roundResult.points_earned}
            </div>
            <div className="text-text-dim text-xs uppercase">Arena Points</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">
              {correct}/{total}
            </div>
            <div className="text-text-dim text-xs uppercase">Correct</div>
          </div>
        </div>

        {roundResult.fire_streak > 0 && (
          <div className="text-bauhaus-yellow text-sm font-mono mb-4">
            🔥 Fire streak: {roundResult.fire_streak}
          </div>
        )}

        {berserk && (
          <div className="text-bauhaus-red text-xs font-mono mb-4">
            💀 Berserk: 2× points, half timer
          </div>
        )}

        {/* Review clues */}
        <div className="w-full space-y-2 mb-6 max-h-48 overflow-y-auto">
          {clues.map((c, i) => (
            <div
              key={c.id}
              className={`p-2 rounded-none border text-xs ${
                results[i]?.correct
                  ? "border-green-600/30 bg-green-600/5"
                  : "border-bauhaus-red/30 bg-bauhaus-red/5"
              }`}
            >
              <span className="text-text-secondary italic">{c.clue}</span>
              <span className="font-bold text-text-primary ml-2">{c.answer}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push(`/tournaments/${id}`)}
          className="px-6 py-3 rounded-none font-bold text-white bg-[#be185d] hover:opacity-90 active:scale-95 transition-all"
        >
          Back to Tournament
        </button>
      </main>
    );
  }

  if (phase === "submitting") {
    return (
      <main className="min-h-dvh flex items-center justify-center text-text-secondary">
        Submitting round...
      </main>
    );
  }

  // Playing
  const clue = clues[currentIndex];
  const progress = (currentIndex / clues.length) * 100;
  const timerPct = (timeLeft / TIME_PER_CLUE) * 100;
  const score = results.filter((r) => r.correct).length;

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/tournaments/${id}`}
            className="text-text-dim text-xs hover:text-text-secondary"
          >
            ←
          </Link>
          <span className="text-lg">🔮</span>
          <span className="text-sm font-bold text-[#be185d] uppercase tracking-wider">
            Arena Cryptic
          </span>
        </div>
        <div className="flex items-center gap-3">
          {berserk && <span className="text-bauhaus-red text-xs font-bold">💀 BERSERK</span>}
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
        <div className="h-full bg-[#be185d] transition-all" style={{ width: `${progress}%` }} />
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

      {/* Difficulty + timer */}
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
        <span className="font-mono text-lg font-bold text-text-dim">{timeLeft}s</span>
      </div>

      {/* Clue */}
      <div className="bg-surface border-2 border-surface-border border-l-4 border-l-[#be185d] p-6 mb-6">
        <p className="text-lg text-text-primary font-serif italic leading-relaxed">
          &ldquo;{clue.clue}&rdquo;
        </p>
        <div className="mt-3 text-text-dim text-xs font-mono">Length: {clue.length}</div>
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

      {/* Input or reveal */}
      {!showAnswer ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitGuess();
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
            <div className="text-xs text-text-secondary mt-2 italic">{clue.wordplay}</div>
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
