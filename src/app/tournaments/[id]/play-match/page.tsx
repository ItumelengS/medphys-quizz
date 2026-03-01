"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";

type Phase = "loading" | "playing" | "submitting" | "results";

interface CardData {
  id: string;
  pairId: string;
  type: "question" | "answer";
  text: string;
  questionId: string;
}

interface CardState extends CardData {
  flipped: boolean;
  matched: boolean;
}

interface RoundResult {
  points_earned: number;
  fire_multiplier: number;
  fire_streak: number;
  berserk_bonus: boolean;
  pairs: number;
  moves: number;
  timeSeconds: number;
  baseScore: number;
  xp: { totalXp: number; baseXp: number; bonusXp: number; perfectBonusXp: number };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function PlayMatchPage({
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
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(8);
  const [locked, setLocked] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch questions and set up cards
  useEffect(() => {
    if (!session?.user?.id) return;

    // Get tournament config
    fetch(`/api/tournaments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.tournament) {
          setError("Tournament not found");
          return;
        }

        const config = TOURNAMENT_TYPES[data.tournament.type];
        if (!config?.isMatch) {
          setError("Not a match tournament");
          return;
        }

        const pairs = config.pairsCount || 8;
        setTotalPairs(pairs);

        // Fetch random questions
        return fetch(`/api/questions?shuffle=true&limit=${pairs}`)
          .then((r) => r.json())
          .then((questions) => {
            if (!Array.isArray(questions) || questions.length < pairs) {
              setError("Not enough questions");
              return;
            }

            const selected = questions.slice(0, pairs);
            setQuestionIds(selected.map((q: { id: string }) => q.id));

            const cardPairs: CardData[] = [];
            for (const q of selected) {
              cardPairs.push({
                id: `q-${q.id}`,
                pairId: q.id,
                type: "question",
                text: q.question,
                questionId: q.id,
              });
              cardPairs.push({
                id: `a-${q.id}`,
                pairId: q.id,
                type: "answer",
                text: q.answer,
                questionId: q.id,
              });
            }

            setCards(shuffleArray(cardPairs).map((c) => ({ ...c, flipped: false, matched: false })));
            startTimeRef.current = Date.now();
            setPhase("playing");
          });
      })
      .catch(() => setError("Failed to load tournament"));
  }, [id, session?.user?.id]);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleFlip = useCallback(
    (index: number) => {
      if (locked) return;
      if (cards[index].flipped || cards[index].matched) return;

      const newCards = [...cards];
      newCards[index] = { ...newCards[index], flipped: true };
      const newFlipped = [...flippedIndices, index];

      setCards(newCards);
      setFlippedIndices(newFlipped);

      if (newFlipped.length === 2) {
        setMoves((m) => m + 1);
        const [first, second] = newFlipped;
        const card1 = newCards[first];
        const card2 = newCards[second];

        if (card1.pairId === card2.pairId && card1.type !== card2.type) {
          const matched = [...newCards];
          matched[first] = { ...matched[first], matched: true };
          matched[second] = { ...matched[second], matched: true };
          setCards(matched);
          setFlippedIndices([]);
          setMatchedPairs((p) => p + 1);
        } else {
          setLocked(true);
          setTimeout(() => {
            const reset = [...newCards];
            reset[first] = { ...reset[first], flipped: false };
            reset[second] = { ...reset[second], flipped: false };
            setCards(reset);
            setFlippedIndices([]);
            setLocked(false);
          }, 1000);
        }
      }
    },
    [cards, flippedIndices, locked]
  );

  // Check completion
  useEffect(() => {
    if (phase !== "playing") return;
    if (matchedPairs > 0 && matchedPairs === totalPairs) {
      if (timerRef.current) clearInterval(timerRef.current);
      const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeElapsed(finalTime);
      setPhase("submitting");
    }
  }, [matchedPairs, totalPairs, phase]);

  // Submit round
  useEffect(() => {
    if (phase !== "submitting") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);

    fetch(`/api/tournaments/${id}/match-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        berserk,
        pairs: totalPairs,
        moves,
        timeSeconds: finalTime,
        questionIds,
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

  function resetAndPlayAgain() {
    setPhase("loading");
    setCards([]);
    setFlippedIndices([]);
    setMoves(0);
    setMatchedPairs(0);
    setLocked(false);
    setTimeElapsed(0);
    setError("");
    setResult(null);
    setQuestionIds([]);

    fetch(`/api/questions?shuffle=true&limit=${totalPairs}`)
      .then((r) => r.json())
      .then((questions) => {
        if (!Array.isArray(questions) || questions.length < totalPairs) {
          setError("Not enough questions");
          return;
        }

        const selected = questions.slice(0, totalPairs);
        setQuestionIds(selected.map((q: { id: string }) => q.id));

        const cardPairs: CardData[] = [];
        for (const q of selected) {
          cardPairs.push({
            id: `q-${q.id}`,
            pairId: q.id,
            type: "question",
            text: q.question,
            questionId: q.id,
          });
          cardPairs.push({
            id: `a-${q.id}`,
            pairId: q.id,
            type: "answer",
            text: q.answer,
            questionId: q.id,
          });
        }

        setCards(shuffleArray(cardPairs).map((c) => ({ ...c, flipped: false, matched: false })));
        startTimeRef.current = Date.now();
        setPhase("playing");
      })
      .catch(() => setError("Failed to load questions"));
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

  // Loading
  if (phase === "loading") {
    return (
      <main className="min-h-dvh flex items-center justify-center text-text-secondary">
        Setting up cards...
      </main>
    );
  }

  // Results
  if (phase === "results" && result) {
    const isPerfect = result.moves === totalPairs;

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">{isPerfect ? "🏆" : "🃏"}</span>
        <h1 className="text-3xl font-black mb-2" style={{ color: "#8b5cf6" }}>
          {isPerfect ? "PERFECT!" : "COMPLETE!"}
        </h1>
        <div className="w-12 h-1 mx-auto mb-6" style={{ background: "#8b5cf6" }} />

        <div className="grid grid-cols-2 gap-4 mb-6 text-center w-full max-w-xs">
          <div>
            <div className="font-mono text-2xl font-bold text-success">{result.pairs}</div>
            <div className="text-text-dim text-xs uppercase">Pairs</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold" style={{ color: "#8b5cf6" }}>{result.points_earned}</div>
            <div className="text-text-dim text-xs uppercase">Points</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">{result.moves}</div>
            <div className="text-text-dim text-xs uppercase">Moves</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">{formatTime(result.timeSeconds)}</div>
            <div className="text-text-dim text-xs uppercase">Time</div>
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
            <div className="text-bauhaus-yellow text-sm font-mono">Perfect memory!</div>
          )}
          {result.xp && (
            <div className="text-text-secondary text-sm font-mono">
              +{result.xp.totalXp} XP
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={resetAndPlayAgain}
            className="px-6 py-3 rounded-none font-bold text-white hover:opacity-90 active:scale-95 transition-all"
            style={{ background: "#8b5cf6" }}
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
  const gridCols = totalPairs === 12 ? "grid-cols-4" : "grid-cols-4";

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🃏</span>
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>
            Tournament
          </span>
          {berserk && (
            <span className="text-xs font-bold text-bauhaus-red uppercase">💀 Berserk</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-dim text-xs font-mono">
            {matchedPairs}/{totalPairs} pairs
          </span>
          <span className="text-text-dim text-xs font-mono">
            {moves} moves
          </span>
          <span className="font-mono text-sm font-bold" style={{ color: "#8b5cf6" }}>
            {formatTime(timeElapsed)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-surface-border mb-3">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${(matchedPairs / totalPairs) * 100}%`,
            backgroundColor: "#8b5cf6",
          }}
        />
      </div>

      {error && (
        <div className="mb-3 p-2 border-2 border-bauhaus-red/30 text-bauhaus-red text-xs">
          {error}
        </div>
      )}

      {/* Card grid */}
      <div className={`grid ${gridCols} gap-2`}>
        {cards.map((card, i) => (
          <button
            key={card.id}
            onClick={() => handleFlip(i)}
            disabled={locked || card.flipped || card.matched}
            className={`relative aspect-[3/4] rounded-none border-2 transition-all duration-300 text-left p-2 overflow-hidden ${
              card.matched
                ? "border-violet-500 opacity-60"
                : card.flipped
                  ? card.type === "question"
                    ? "border-violet-500"
                    : "border-violet-400"
                  : "border-surface-border hover:border-text-dim cursor-pointer"
            }`}
            style={{
              background: card.matched
                ? "rgba(139, 92, 246, 0.15)"
                : card.flipped
                  ? card.type === "question"
                    ? "rgba(139, 92, 246, 0.1)"
                    : "rgba(124, 58, 237, 0.1)"
                  : "var(--surface)",
            }}
          >
            {card.flipped || card.matched ? (
              <div className="flex flex-col h-full">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: card.type === "question" ? "#8b5cf6" : "#7c3aed" }}
                >
                  {card.type === "question" ? "Q" : "A"}
                </span>
                <span className="text-[10px] leading-tight text-text-primary line-clamp-5">
                  {card.text}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-2xl opacity-30">🃏</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </main>
  );
}
