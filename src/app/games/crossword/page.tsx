"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { generateCrossword } from "@/lib/crossword-generator";
import { calculateCrosswordScore, calculateXp } from "@/lib/scoring";
import type { CrosswordPuzzle, DbQuestion, DbSection } from "@/lib/types";
import CrosswordGrid from "@/components/CrosswordGrid";

type Phase = "setup" | "playing" | "complete";
type TimerOption = null | 300 | 600 | 900;

export default function CrosswordPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [phase, setPhase] = useState<Phase>("setup");
  const [sections, setSections] = useState<DbSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [timerOption, setTimerOption] = useState<TimerOption>(null);
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Game state
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [wordsRevealed, setWordsRevealed] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch sections
  useEffect(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then((data) => setSections(Array.isArray(data) ? data : []));
  }, []);

  async function generatePuzzle() {
    setGenerating(true);
    setError("");

    try {
      const url = `/api/questions?section=${selectedSection}&shuffle=true&limit=30`;
      const res = await fetch(url);
      const qs: DbQuestion[] = await res.json();

      if (qs.length < 10) {
        setError("Not enough questions in this section for a crossword.");
        setGenerating(false);
        return;
      }

      const entries = qs.map((q) => ({
        answer: q.answer,
        clue: q.question,
        questionId: q.id,
      }));

      const result = generateCrossword(entries);

      if (!result || result.words.length < 6) {
        setError("Could not generate a good crossword. Try a different section.");
        setGenerating(false);
        return;
      }

      setPuzzle(result);
      setQuestionIds(result.words.map((w) => w.questionId));
      setWordsCompleted(0);
      setWordsRevealed(0);
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

  const handleWordComplete = useCallback((_wordIndex: number, revealed: boolean) => {
    if (revealed) {
      setWordsRevealed((r) => r + 1);
    }
    setWordsCompleted((c) => c + 1);
  }, []);

  const handleAllComplete = useCallback(() => {
    setAllDone(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("complete");
  }, []);

  async function submitAndNavigate() {
    if (submitting || !puzzle) return;
    setSubmitting(true);

    const wordsWithoutReveal = wordsCompleted - wordsRevealed;
    const totalWords = puzzle.words.length;
    const allWords = wordsCompleted === totalWords;
    const remaining = timeRemaining ?? 0;

    const points = calculateCrosswordScore(
      wordsWithoutReveal,
      wordsRevealed,
      allWords,
      timerOption !== null,
      remaining
    );

    const xpResult = calculateXp(points, "crossword", wordsCompleted, totalWords, 0);

    if (session?.user?.id) {
      await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: "crossword",
          answers: questionIds.map((qid) => ({
            questionId: qid,
            correct: true,
            timeRemaining: 0,
            pointsEarned: 0,
          })),
          score: wordsCompleted,
          total: totalWords,
          points,
          bestStreak: 0,
          section: selectedSection,
          sectionName: selectedSection === "all" ? "All Topics" : sections.find((s) => s.id === selectedSection)?.name || selectedSection,
          durationSeconds: timeElapsed,
          metadata: {
            wordsWithoutReveal,
            wordsRevealed,
            timerOption,
            allComplete: allWords,
          },
        }),
      });
    }

    const sName = selectedSection === "all" ? "Crossword" : `Crossword — ${sections.find((s) => s.id === selectedSection)?.name || ""}`;
    const resultParams = new URLSearchParams({
      score: wordsCompleted.toString(),
      total: totalWords.toString(),
      points: points.toString(),
      bestStreak: "0",
      section: selectedSection,
      sectionName: sName,
      mode: "crossword",
      xp: xpResult.totalXp.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
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
            Medical physics crossword. Fill the grid using quiz question clues.
          </p>
        </div>

        {/* Section picker */}
        <div className="mb-6">
          <label className="text-xs text-text-dim uppercase tracking-wider font-bold mb-2 block">
            Topic
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedSection("all")}
              className={`p-3 rounded-none text-sm font-bold border-2 transition-all ${
                selectedSection === "all"
                  ? "border-bauhaus-blue text-bauhaus-blue bg-bauhaus-blue/10"
                  : "border-surface-border text-text-secondary hover:bg-surface"
              }`}
            >
              All Topics
            </button>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSection(s.id)}
                className={`p-3 rounded-none text-sm font-bold border-2 transition-all text-left ${
                  selectedSection === s.id
                    ? "border-bauhaus-blue text-bauhaus-blue bg-bauhaus-blue/10"
                    : "border-surface-border text-text-secondary hover:bg-surface"
                }`}
              >
                <span className="mr-1">{s.icon}</span> {s.name}
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
  if (phase === "complete") {
    const totalWords = puzzle?.words.length || 0;
    const wordsWithoutReveal = wordsCompleted - wordsRevealed;
    const remaining = timeRemaining ?? 0;
    const points = calculateCrosswordScore(
      wordsWithoutReveal,
      wordsRevealed,
      wordsCompleted === totalWords,
      timerOption !== null,
      remaining
    );

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">{wordsCompleted === totalWords ? "🏆" : "🧩"}</span>
        <h1 className="text-3xl font-black text-bauhaus-blue mb-2">
          {wordsCompleted === totalWords ? "COMPLETE!" : "TIME'S UP"}
        </h1>
        <div className="w-12 h-1 bg-bauhaus-blue mx-auto mb-6" />

        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-success">{wordsCompleted}</div>
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
            <div className="font-mono text-2xl font-bold text-bauhaus-yellow">{wordsRevealed}</div>
            <div className="text-text-dim text-xs uppercase">Revealed</div>
          </div>
        </div>

        {wordsCompleted === totalWords && wordsRevealed === 0 && (
          <div className="text-bauhaus-yellow text-sm font-mono mb-4">+75 perfect bonus!</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setPhase("setup"); setPuzzle(null); }}
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
          <span className="text-text-dim text-xs">
            {wordsCompleted}/{puzzle.words.length} words
          </span>
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
        onWordComplete={handleWordComplete}
        onAllComplete={handleAllComplete}
      />
    </main>
  );
}
