"use client";

import { useState, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getRandomPuzzle, type ConnectionGroup, type ConnectionPuzzle } from "@/lib/connections-puzzles";
import { calculateConnectionsScore } from "@/lib/scoring";

type Phase = "playing" | "submitting" | "results";

const DIFFICULTY_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#eab308", text: "#ffffff" },
  2: { bg: "#16a34a", text: "#ffffff" },
  3: { bg: "#3b82f6", text: "#ffffff" },
  4: { bg: "#a855f7", text: "#ffffff" },
};

const MAX_MISTAKES = 4;

interface RoundResult {
  points_earned: number;
  fire_multiplier: number;
  fire_streak: number;
  won: boolean;
  groupsFound: number;
  baseScore: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TournamentConnectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [puzzle] = useState<ConnectionPuzzle>(() => getRandomPuzzle());
  const [phase, setPhase] = useState<Phase>("playing");

  const [remainingWords, setRemainingWords] = useState<string[]>(() =>
    shuffleArray(puzzle.groups.flatMap((g) => g.words))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [solvedGroups, setSolvedGroups] = useState<ConnectionGroup[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState(false);
  const [oneAway, setOneAway] = useState(false);
  const [error, setError] = useState("");
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  function toggleWord(word: string) {
    if (phase !== "playing") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else if (next.size < 4) next.add(word);
      return next;
    });
    setOneAway(false);
  }

  const submitRound = useCallback(async (won: boolean, groupsFound: number, finalMistakes: number) => {
    if (!session?.user?.id) return;
    setPhase("submitting");

    try {
      const res = await fetch(`/api/tournaments/${id}/connections-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupsFound,
          mistakes: finalMistakes,
          won,
          puzzleId: puzzle.id,
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
  }, [id, session?.user?.id, puzzle.id]);

  const submitGuess = useCallback(() => {
    if (selected.size !== 4 || phase !== "playing") return;

    const unsolved = puzzle.groups.filter(
      (g) => !solvedGroups.some((sg) => sg.category === g.category)
    );

    const match = unsolved.find((g) =>
      g.words.length === 4 && g.words.every((w) => selected.has(w))
    );

    if (match) {
      const newSolved = [...solvedGroups, match];
      setSolvedGroups(newSolved);
      setRemainingWords((prev) => prev.filter((w) => !selected.has(w)));
      setSelected(new Set());
      setOneAway(false);

      if (newSolved.length === 4) {
        setTimeout(() => submitRound(true, 4, mistakes), 600);
      }
    } else {
      const isOneAway = unsolved.some((g) => g.words.filter((w) => selected.has(w)).length === 3);
      if (isOneAway) setOneAway(true);

      setShake(true);
      setTimeout(() => setShake(false), 500);

      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setSelected(new Set());

      if (newMistakes >= MAX_MISTAKES) {
        const remaining = puzzle.groups.filter(
          (g) => !solvedGroups.some((sg) => sg.category === g.category)
        );
        setSolvedGroups([...solvedGroups, ...remaining]);
        setRemainingWords([]);
        setTimeout(() => submitRound(false, solvedGroups.length, newMistakes), 800);
      }
    }
  }, [selected, phase, puzzle, solvedGroups, mistakes, submitRound]);

  if (error) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-bauhaus-red text-lg font-bold mb-4">{error}</div>
        <Link href={`/tournaments/${id}`} className="text-bauhaus-blue font-bold">← Back to Tournament</Link>
      </main>
    );
  }

  // Results
  if (phase === "results" && roundResult) {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">{roundResult.won ? "🎉" : "😔"}</span>
        <h1 className="text-3xl font-black text-[#a855f7] mb-2">
          {roundResult.won && mistakes === 0 ? "PERFECT!" : roundResult.won ? "SOLVED!" : "GAME OVER"}
        </h1>
        <div className="w-12 h-1 bg-[#a855f7] mx-auto mb-6" />

        <div className="w-full flex flex-col gap-2 mb-6">
          {puzzle.groups.sort((a, b) => a.difficulty - b.difficulty).map((group) => {
            const colors = DIFFICULTY_COLORS[group.difficulty];
            return (
              <div key={group.category} className="p-3 rounded-none text-center" style={{ backgroundColor: colors.bg }}>
                <div className="font-bold text-sm text-white uppercase tracking-wider">{group.category}</div>
                <div className="text-white/90 text-sm mt-1">{group.words.join(", ")}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-[#a855f7]">{roundResult.points_earned}</div>
            <div className="text-text-dim text-xs uppercase">Arena Points</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">{mistakes}/{MAX_MISTAKES}</div>
            <div className="text-text-dim text-xs uppercase">Mistakes</div>
          </div>
        </div>

        {roundResult.fire_streak > 0 && (
          <div className="text-bauhaus-yellow text-sm font-mono mb-4">🔥 Fire streak: {roundResult.fire_streak}</div>
        )}

        <button
          onClick={() => router.push(`/tournaments/${id}`)}
          className="px-6 py-3 rounded-none font-bold text-white bg-[#a855f7] hover:opacity-90 active:scale-95 transition-all"
        >
          Back to Tournament
        </button>
      </main>
    );
  }

  if (phase === "submitting") {
    return <main className="min-h-dvh flex items-center justify-center text-text-secondary">Submitting round...</main>;
  }

  // Playing
  const mistakeDots = Array.from({ length: MAX_MISTAKES }, (_, i) => i < mistakes);

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link href={`/tournaments/${id}`} className="text-text-dim text-xs hover:text-text-secondary">←</Link>
          <span className="text-lg">🔗</span>
          <span className="text-sm font-bold text-[#a855f7] uppercase tracking-wider">Arena Connections</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-dim font-mono mr-1">Mistakes:</span>
          {mistakeDots.map((used, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${used ? "bg-bauhaus-red" : "bg-surface-border"}`} />
          ))}
        </div>
      </div>

      <p className="text-text-secondary text-xs mb-4 text-center">Find groups of 4 related medical physics terms</p>

      {oneAway && (
        <div className="mb-3 p-2 border-2 border-bauhaus-yellow/40 bg-bauhaus-yellow/10 text-bauhaus-yellow text-sm text-center font-bold">
          One away!
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3">
        {solvedGroups.sort((a, b) => a.difficulty - b.difficulty).map((group) => {
          const colors = DIFFICULTY_COLORS[group.difficulty];
          return (
            <div key={group.category} className="p-3 rounded-none text-center animate-scale-in" style={{ backgroundColor: colors.bg }}>
              <div className="font-bold text-sm text-white uppercase tracking-wider">{group.category}</div>
              <div className="text-white/90 text-sm mt-1">{group.words.join(", ")}</div>
            </div>
          );
        })}
      </div>

      <div className={`grid grid-cols-4 gap-2 mb-4 ${shake ? "animate-shake" : ""}`}>
        {remainingWords.map((word) => {
          const isSelected = selected.has(word);
          return (
            <button key={word} onClick={() => toggleWord(word)}
              className={`p-3 rounded-none text-xs sm:text-sm font-bold uppercase text-center border-2 transition-all min-h-[52px] flex items-center justify-center ${
                isSelected
                  ? "bg-text-primary text-bg border-text-primary scale-95"
                  : "bg-surface border-surface-border text-text-primary hover:border-[#a855f7]/50"
              }`}>
              {word}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 justify-center">
        <button onClick={() => setRemainingWords((p) => shuffleArray(p))}
          className="px-4 py-2.5 rounded-none text-sm font-bold border-2 border-surface-border text-text-secondary hover:bg-surface transition-all">
          Shuffle
        </button>
        <button onClick={() => { setSelected(new Set()); setOneAway(false); }} disabled={selected.size === 0}
          className="px-4 py-2.5 rounded-none text-sm font-bold border-2 border-surface-border text-text-secondary hover:bg-surface transition-all disabled:opacity-30">
          Deselect
        </button>
        <button onClick={submitGuess} disabled={selected.size !== 4}
          className="px-6 py-2.5 rounded-none text-sm font-bold text-white bg-[#a855f7] hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          Submit
        </button>
      </div>
    </main>
  );
}
