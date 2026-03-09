"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getRandomPuzzle, type ConnectionGroup, type ConnectionPuzzle } from "@/lib/connections-puzzles";
import { calculateConnectionsScore, calculateXp } from "@/lib/scoring";

type Phase = "playing" | "complete";

const DIFFICULTY_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "#eab308", text: "#ffffff", label: "Yellow" },
  2: { bg: "#16a34a", text: "#ffffff", label: "Green" },
  3: { bg: "#3b82f6", text: "#ffffff", label: "Blue" },
  4: { bg: "#a855f7", text: "#ffffff", label: "Purple" },
};

const MAX_MISTAKES = 4;

export default function ConnectionsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [puzzle, setPuzzle] = useState<ConnectionPuzzle>(() => getRandomPuzzle());
  const [phase, setPhase] = useState<Phase>("playing");

  // All 16 words shuffled
  const [remainingWords, setRemainingWords] = useState<string[]>(() => {
    const all = puzzle.groups.flatMap((g) => g.words);
    return shuffleArray(all);
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [solvedGroups, setSolvedGroups] = useState<ConnectionGroup[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState(false);
  const [oneAway, setOneAway] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function toggleWord(word: string) {
    if (phase !== "playing") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else if (next.size < 4) {
        next.add(word);
      }
      return next;
    });
    setOneAway(false);
  }

  const submitGuess = useCallback(() => {
    if (selected.size !== 4 || phase !== "playing") return;

    const guess = Array.from(selected);
    const unsolved = puzzle.groups.filter(
      (g) => !solvedGroups.some((sg) => sg.category === g.category)
    );

    // Check if guess matches any unsolved group
    const match = unsolved.find((g) =>
      g.words.length === 4 && g.words.every((w) => selected.has(w))
    );

    if (match) {
      // Correct!
      const newSolved = [...solvedGroups, match];
      setSolvedGroups(newSolved);
      setRemainingWords((prev) => prev.filter((w) => !selected.has(w)));
      setSelected(new Set());
      setOneAway(false);

      // Check if all groups solved
      if (newSolved.length === 4) {
        setTimeout(() => setPhase("complete"), 600);
      }
    } else {
      // Wrong — check if one away from any group
      const isOneAway = unsolved.some((g) => {
        const overlap = g.words.filter((w) => selected.has(w)).length;
        return overlap === 3;
      });

      if (isOneAway) {
        setOneAway(true);
      }

      setShake(true);
      setTimeout(() => setShake(false), 500);

      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setSelected(new Set());

      if (newMistakes >= MAX_MISTAKES) {
        // Reveal all remaining groups
        const remaining = puzzle.groups.filter(
          (g) => !solvedGroups.some((sg) => sg.category === g.category)
        );
        setSolvedGroups([...solvedGroups, ...remaining]);
        setRemainingWords([]);
        setTimeout(() => setPhase("complete"), 800);
      }
    }
  }, [selected, phase, puzzle, solvedGroups, mistakes]);

  function deselectAll() {
    setSelected(new Set());
    setOneAway(false);
  }

  function shuffleRemaining() {
    setRemainingWords((prev) => shuffleArray(prev));
  }

  function newGame() {
    const p = getRandomPuzzle();
    setPuzzle(p);
    setRemainingWords(shuffleArray(p.groups.flatMap((g) => g.words)));
    setSelected(new Set());
    setSolvedGroups([]);
    setMistakes(0);
    setShake(false);
    setOneAway(false);
    setPhase("playing");
  }

  async function submitAndNavigate() {
    if (submitting) return;
    setSubmitting(true);

    const groupsFound = solvedGroups.length;
    const mistakesLeft = MAX_MISTAKES - mistakes;
    const perfect = mistakes === 0 && groupsFound === 4;
    const won = groupsFound === 4 && mistakes < MAX_MISTAKES;

    const points = calculateConnectionsScore(
      won ? groupsFound : 0,
      won ? mistakesLeft : 0,
      perfect
    );

    const xpResult = calculateXp(points, "connections", won ? 4 : 0, 4, 0);

    let responseData: { ratingUpdate?: { newRating: number; ratingDelta: number } } | undefined;
    if (session?.user?.id) {
      const res = await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: "connections",
          answers: puzzle.groups.map((g) => ({
            questionId: puzzle.id + "-" + g.difficulty,
            correct: solvedGroups.some((sg) => sg.category === g.category) && mistakes < MAX_MISTAKES,
            timeRemaining: 0,
            pointsEarned: 0,
          })),
          score: won ? 4 : solvedGroups.filter((_, i) => i < solvedGroups.length - (mistakes >= MAX_MISTAKES ? puzzle.groups.length - solvedGroups.length + (puzzle.groups.length - solvedGroups.length) : 0)).length,
          total: 4,
          points,
          bestStreak: 0,
          section: "connections",
          sectionName: "Connections",
          metadata: {
            puzzleId: puzzle.id,
            mistakes,
            groupsFound,
            perfect,
          },
        }),
      });
      try { responseData = await res.json(); } catch {}
    }

    const resultParams = new URLSearchParams({
      score: won ? "4" : "0",
      total: "4",
      points: points.toString(),
      bestStreak: "0",
      section: "connections",
      sectionName: "Connections",
      mode: "connections",
      xp: xpResult.totalXp.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      penalized: "0",
    });
    if (responseData?.ratingUpdate) {
      resultParams.set("ratingNew", responseData.ratingUpdate.newRating.toString());
      resultParams.set("ratingDelta", responseData.ratingUpdate.ratingDelta.toString());
    }
    router.push(`/results?${resultParams.toString()}`);
  }

  const mistakeDots = Array.from({ length: MAX_MISTAKES }, (_, i) => i < mistakes);
  const won = solvedGroups.length === 4 && mistakes < MAX_MISTAKES;

  // ── Complete Screen ──
  if (phase === "complete") {
    const mistakesLeft = MAX_MISTAKES - mistakes;
    const perfect = mistakes === 0 && won;
    const points = calculateConnectionsScore(won ? 4 : 0, won ? mistakesLeft : 0, perfect);

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">{won ? "🎉" : "😔"}</span>
        <h1 className="text-3xl font-black text-[#a855f7] mb-2">
          {won ? (perfect ? "PERFECT!" : "SOLVED!") : "GAME OVER"}
        </h1>
        <div className="w-12 h-1 bg-[#a855f7] mx-auto mb-6" />

        {/* Show all groups */}
        <div className="w-full flex flex-col gap-2 mb-6">
          {puzzle.groups
            .sort((a, b) => a.difficulty - b.difficulty)
            .map((group) => {
              const colors = DIFFICULTY_COLORS[group.difficulty];
              return (
                <div
                  key={group.category}
                  className="p-3 rounded-none text-center"
                  style={{ backgroundColor: colors.bg }}
                >
                  <div className="font-bold text-sm text-white uppercase tracking-wider">
                    {group.category}
                  </div>
                  <div className="text-white/90 text-sm mt-1">
                    {group.words.join(", ")}
                  </div>
                </div>
              );
            })}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-[#a855f7]">{points}</div>
            <div className="text-text-dim text-xs uppercase">Points</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">
              {mistakes}/{MAX_MISTAKES}
            </div>
            <div className="text-text-dim text-xs uppercase">Mistakes</div>
          </div>
        </div>

        {perfect && (
          <div className="text-[#a855f7] text-sm font-mono mb-4">+75 perfect bonus!</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={newGame}
            className="px-6 py-3 rounded-none font-bold text-white bg-[#a855f7] hover:opacity-90 active:scale-95 transition-all"
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

  // ── Playing Screen ──
  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link href="/games" className="text-text-dim text-xs hover:text-text-secondary">←</Link>
          <span className="text-lg">🔗</span>
          <span className="text-sm font-bold text-[#a855f7] uppercase tracking-wider">
            Connections
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-dim font-mono mr-1">Mistakes:</span>
          {mistakeDots.map((used, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                used ? "bg-bauhaus-red" : "bg-surface-border"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-text-secondary text-xs mb-4 text-center">
        Find groups of 4 related medical physics terms
      </p>

      {/* One away notice */}
      {oneAway && (
        <div className="mb-3 p-2 border-2 border-bauhaus-yellow/40 bg-bauhaus-yellow/10 text-bauhaus-yellow text-sm text-center font-bold">
          One away!
        </div>
      )}

      {/* Solved groups */}
      <div className="flex flex-col gap-2 mb-3">
        {solvedGroups
          .sort((a, b) => a.difficulty - b.difficulty)
          .map((group) => {
            const colors = DIFFICULTY_COLORS[group.difficulty];
            return (
              <div
                key={group.category}
                className="p-3 rounded-none text-center animate-scale-in"
                style={{ backgroundColor: colors.bg }}
              >
                <div className="font-bold text-sm text-white uppercase tracking-wider">
                  {group.category}
                </div>
                <div className="text-white/90 text-sm mt-1">
                  {group.words.join(", ")}
                </div>
              </div>
            );
          })}
      </div>

      {/* Word grid */}
      <div className={`grid grid-cols-4 gap-2 mb-4 ${shake ? "animate-shake" : ""}`}>
        {remainingWords.map((word) => {
          const isSelected = selected.has(word);
          return (
            <button
              key={word}
              onClick={() => toggleWord(word)}
              className={`p-3 rounded-none text-xs sm:text-sm font-bold uppercase text-center border-2 transition-all min-h-[52px] flex items-center justify-center ${
                isSelected
                  ? "bg-text-primary text-bg border-text-primary scale-95"
                  : "bg-surface border-surface-border text-text-primary hover:border-[#a855f7]/50"
              }`}
            >
              {word}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={shuffleRemaining}
          className="px-4 py-2.5 rounded-none text-sm font-bold border-2 border-surface-border text-text-secondary hover:bg-surface transition-all"
        >
          Shuffle
        </button>
        <button
          onClick={deselectAll}
          disabled={selected.size === 0}
          className="px-4 py-2.5 rounded-none text-sm font-bold border-2 border-surface-border text-text-secondary hover:bg-surface transition-all disabled:opacity-30"
        >
          Deselect
        </button>
        <button
          onClick={submitGuess}
          disabled={selected.size !== 4}
          className="px-6 py-2.5 rounded-none text-sm font-bold text-white bg-[#a855f7] hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </main>
  );
}
