"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { calculateMatchScore } from "@/lib/scoring";
import type { DbSection } from "@/lib/types";

type Phase = "setup" | "playing" | "complete";

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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function MatchGamePage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [phase, setPhase] = useState<Phase>("setup");
  const [sections, setSections] = useState<DbSection[]>([]);
  const [selectedSection, setSelectedSection] = useState("all");
  const [pairCount, setPairCount] = useState<8 | 12>(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Game state
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch sections
  useEffect(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then((data) => setSections(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function startGame() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ limit: String(pairCount), shuffle: "true" });
      if (selectedSection !== "all") params.set("section", selectedSection);

      const res = await fetch(`/api/questions?${params}`);
      const questions = await res.json();

      if (!Array.isArray(questions) || questions.length < pairCount) {
        setError(`Not enough questions. Found ${questions?.length || 0}, need ${pairCount}.`);
        setLoading(false);
        return;
      }

      const selected = questions.slice(0, pairCount);
      setQuestionIds(selected.map((q: { id: string }) => q.id));

      // Create card pairs: one question card + one answer card per question
      const cardPairs: CardData[] = [];
      for (const q of selected) {
        const pairId = q.id;
        cardPairs.push({
          id: `q-${q.id}`,
          pairId,
          type: "question",
          text: q.question,
          questionId: q.id,
        });
        cardPairs.push({
          id: `a-${q.id}`,
          pairId,
          type: "answer",
          text: q.answer,
          questionId: q.id,
        });
      }

      const shuffled = shuffleArray(cardPairs);
      setCards(shuffled.map((c) => ({ ...c, flipped: false, matched: false })));
      setFlippedIndices([]);
      setMoves(0);
      setMatchedPairs(0);
      setLocked(false);
      setTimeElapsed(0);
      startTimeRef.current = Date.now();
      setPhase("playing");
      setLoading(false);
    } catch {
      setError("Failed to load questions.");
      setLoading(false);
    }
  }

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
          // Match!
          const matched = [...newCards];
          matched[first] = { ...matched[first], matched: true };
          matched[second] = { ...matched[second], matched: true };
          setCards(matched);
          setFlippedIndices([]);
          setMatchedPairs((p) => p + 1);
        } else {
          // No match — flip back after delay
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
    if (matchedPairs > 0 && matchedPairs === pairCount) {
      if (timerRef.current) clearInterval(timerRef.current);
      const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeElapsed(finalTime);
      setPhase("complete");
    }
  }, [matchedPairs, pairCount, phase]);

  // Submit on complete
  useEffect(() => {
    if (phase !== "complete" || submitting) return;
    if (!session?.user?.id) return;

    setSubmitting(true);
    const score = calculateMatchScore(pairCount, moves, timeElapsed);
    const sectionName =
      selectedSection === "all"
        ? "All Topics"
        : sections.find((s) => s.id === selectedSection)?.name || selectedSection;

    // Build answer records for submission
    const answers = questionIds.map((qId) => ({
      questionId: qId,
      correct: true,
      timeRemaining: 0,
      pointsEarned: Math.floor(score / pairCount),
    }));

    fetch("/api/games/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variant: "match",
        answers,
        score: pairCount,
        total: pairCount,
        points: score,
        bestStreak: pairCount,
        section: selectedSection,
        sectionName,
        durationSeconds: timeElapsed,
        metadata: { pairs: pairCount, moves, timeSeconds: timeElapsed },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const params = new URLSearchParams({
          score: String(pairCount),
          total: String(pairCount),
          points: String(score),
          bestStreak: String(pairCount),
          section: selectedSection,
          sectionName,
          mode: "match",
          xp: String(data.xpChange ?? data.xp?.totalXp ?? 0),
          baseXp: String(data.xp?.baseXp ?? 0),
          bonusXp: String(data.xp?.bonusXp ?? 0),
          perfectBonus: String(data.xp?.perfectBonusXp ?? 0),
          penalized: data.penalized ? "1" : "0",
        });
        if (data.awardedPowerUps?.length > 0) {
          params.set("powerups", JSON.stringify(data.awardedPowerUps));
        }
        router.push(`/results?${params}`);
      })
      .catch(() => {
        setError("Failed to submit game.");
        setSubmitting(false);
      });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!session) return null;

  // Setup phase
  if (phase === "setup") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto">
        <div className="animate-fade-up mb-2">
          <Link href="/games" className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary">
            ← Games
          </Link>
        </div>

        <div className="animate-fade-up mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🃏</span>
            <h1 className="text-2xl font-black uppercase tracking-wider" style={{ color: "#8b5cf6" }}>
              Match
            </h1>
          </div>
          <div className="w-12 h-1 mt-1 mb-2" style={{ background: "#8b5cf6" }} />
          <p className="text-text-secondary text-sm font-light">
            Flip cards and match questions to their answers. Fewer moves = higher score.
          </p>
        </div>

        {/* Section picker */}
        <div className="animate-fade-up stagger-1 mb-4">
          <label className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2 block">
            Section
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSection("all")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none border-2 transition-all ${
                selectedSection === "all"
                  ? "border-violet-500 text-violet-500"
                  : "border-surface-border text-text-dim"
              }`}
              style={selectedSection === "all" ? { background: "rgba(139, 92, 246, 0.1)" } : {}}
            >
              All Topics
            </button>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSection(s.id)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none border-2 transition-all ${
                  selectedSection === s.id
                    ? "border-violet-500 text-violet-500"
                    : "border-surface-border text-text-dim"
                }`}
                style={selectedSection === s.id ? { background: "rgba(139, 92, 246, 0.1)" } : {}}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Pair count */}
        <div className="animate-fade-up stagger-2 mb-6">
          <label className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2 block">
            Pairs
          </label>
          <div className="flex gap-3">
            {([8, 12] as const).map((count) => (
              <button
                key={count}
                onClick={() => setPairCount(count)}
                className={`flex-1 py-3 text-center font-bold rounded-none border-2 transition-all ${
                  pairCount === count
                    ? "border-violet-500 text-violet-500"
                    : "border-surface-border text-text-dim"
                }`}
                style={pairCount === count ? { background: "rgba(139, 92, 246, 0.1)" } : {}}
              >
                {count} pairs
                <div className="text-[10px] text-text-dim font-normal mt-0.5">
                  {count * 2} cards
                </div>
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
          onClick={startGame}
          disabled={loading}
          className="animate-fade-up stagger-3 w-full py-3.5 rounded-none font-black text-white text-sm uppercase tracking-widest transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#8b5cf6" }}
        >
          {loading ? "Loading..." : "Start Match"}
        </button>
      </main>
    );
  }

  // Playing phase
  const gridCols = pairCount === 12 ? "grid-cols-4" : "grid-cols-4";

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🃏</span>
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>
            Match
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-dim text-xs font-mono">
            {matchedPairs}/{pairCount} pairs
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
      <div className="w-full h-1 bg-surface-border mb-4">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${(matchedPairs / pairCount) * 100}%`,
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

      {submitting && (
        <div className="mt-4 text-center text-text-secondary text-sm">
          Submitting...
        </div>
      )}
    </main>
  );
}
