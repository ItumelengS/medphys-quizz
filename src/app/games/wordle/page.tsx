"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { calculateWordleScore, calculateXp } from "@/lib/scoring";

type Phase = "setup" | "playing" | "complete";
type LetterState = "correct" | "present" | "absent" | "empty" | "tbd";

interface WordData {
  id: string;
  answer: string;
  clue: string;
  category: string;
  length: number;
}

interface CellData {
  letter: string;
  state: LetterState;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

const MAX_GUESSES = 6;

export default function WordlePage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [phase, setPhase] = useState<Phase>("setup");
  const [wordLength, setWordLength] = useState(5);
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Game state
  const [guesses, setGuesses] = useState<CellData[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [currentRow, setCurrentRow] = useState(0);
  const [solved, setSolved] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyStates, setKeyStates] = useState<Record<string, LetterState>>({});
  const [revealRow, setRevealRow] = useState<number | null>(null);

  async function startGame() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/wordle?minLen=${wordLength}&maxLen=${wordLength}`);
      if (!res.ok) {
        setError("Could not find a word. Try a different length.");
        setLoading(false);
        return;
      }
      const data: WordData = await res.json();
      setWordData(data);

      // Initialize empty grid
      const emptyGrid: CellData[][] = Array.from({ length: MAX_GUESSES }, () =>
        Array.from({ length: data.length }, () => ({ letter: "", state: "empty" as LetterState }))
      );
      setGuesses(emptyGrid);
      setCurrentGuess("");
      setCurrentRow(0);
      setSolved(false);
      setHintUsed(false);
      setShowHint(false);
      setKeyStates({});
      setRevealRow(null);
      setPhase("playing");
    } catch {
      setError("Failed to start game. Please try again.");
    }
    setLoading(false);
  }

  const evaluateGuess = useCallback(
    (guess: string): CellData[] => {
      if (!wordData) return [];
      const answer = wordData.answer;
      const result: CellData[] = guess.split("").map((l) => ({ letter: l, state: "absent" as LetterState }));
      const answerLetters = answer.split("");
      const used = new Array(answer.length).fill(false);

      // First pass: correct positions
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === answerLetters[i]) {
          result[i].state = "correct";
          used[i] = true;
        }
      }

      // Second pass: present but wrong position
      for (let i = 0; i < guess.length; i++) {
        if (result[i].state === "correct") continue;
        for (let j = 0; j < answerLetters.length; j++) {
          if (!used[j] && guess[i] === answerLetters[j]) {
            result[i].state = "present";
            used[j] = true;
            break;
          }
        }
      }

      return result;
    },
    [wordData]
  );

  const submitGuess = useCallback(() => {
    if (!wordData || solved || currentRow >= MAX_GUESSES) return;

    if (currentGuess.length !== wordData.length) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const result = evaluateGuess(currentGuess);
    const newGuesses = [...guesses];
    newGuesses[currentRow] = result;
    setGuesses(newGuesses);
    setRevealRow(currentRow);

    // Update keyboard states
    const newKeyStates = { ...keyStates };
    for (const cell of result) {
      const existing = newKeyStates[cell.letter];
      if (cell.state === "correct") {
        newKeyStates[cell.letter] = "correct";
      } else if (cell.state === "present" && existing !== "correct") {
        newKeyStates[cell.letter] = "present";
      } else if (cell.state === "absent" && !existing) {
        newKeyStates[cell.letter] = "absent";
      }
    }
    setKeyStates(newKeyStates);

    const isCorrect = currentGuess === wordData.answer;
    if (isCorrect) {
      setSolved(true);
      setTimeout(() => setPhase("complete"), 1500);
    } else if (currentRow + 1 >= MAX_GUESSES) {
      setTimeout(() => setPhase("complete"), 1500);
    }

    setCurrentRow((r) => r + 1);
    setCurrentGuess("");
  }, [wordData, solved, currentRow, currentGuess, guesses, evaluateGuess, keyStates]);

  const handleKey = useCallback(
    (key: string) => {
      if (!wordData || solved || currentRow >= MAX_GUESSES) return;

      if (key === "ENTER") {
        submitGuess();
        return;
      }

      if (key === "⌫" || key === "BACKSPACE") {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }

      if (/^[A-Z]$/.test(key) && currentGuess.length < wordData.length) {
        setCurrentGuess((g) => g + key);
      }
    },
    [wordData, solved, currentRow, currentGuess, submitGuess]
  );

  // Physical keyboard listener
  useEffect(() => {
    if (phase !== "playing") return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKey(key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, handleKey]);

  async function submitAndNavigate() {
    if (submitting || !wordData) return;
    setSubmitting(true);

    const points = calculateWordleScore(solved, currentRow, hintUsed, wordData.length);
    const xpResult = calculateXp(points, "wordle", solved ? 1 : 0, 1, 0);

    let responseData: { ratingUpdate?: { newRating: number; ratingDelta: number } } | undefined;
    if (session?.user?.id) {
      const res = await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: "wordle",
          answers: [
            {
              questionId: wordData.id,
              correct: solved,
              timeRemaining: 0,
              pointsEarned: points,
            },
          ],
          score: solved ? 1 : 0,
          total: 1,
          points,
          bestStreak: solved ? 1 : 0,
          section: wordData.category,
          sectionName: `Wordle — ${wordData.category}`,
          metadata: {
            guessesUsed: currentRow,
            wordLength: wordData.length,
            hintUsed,
            solved,
            answer: wordData.answer,
          },
        }),
      });
      try { responseData = await res.json(); } catch {}
    }

    const resultParams = new URLSearchParams({
      score: solved ? "1" : "0",
      total: "1",
      points: points.toString(),
      bestStreak: solved ? "1" : "0",
      section: wordData.category,
      sectionName: `Wordle — ${wordData.category}`,
      mode: "wordle",
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

  // ── Setup Screen ──
  if (phase === "setup") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto">
        <Link
          href="/games"
          className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary mb-6 block"
        >
          ← Game Variants
        </Link>

        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🔤</span>
          <h1 className="text-3xl font-black text-[#16a34a] mb-2">WORDLE</h1>
          <div className="w-12 h-1 bg-[#16a34a] mx-auto mb-3" />
          <p className="text-text-secondary text-sm font-light">
            Guess the medical physics term in 6 tries.
          </p>
        </div>

        {/* Word length picker */}
        <div className="mb-8">
          <label className="text-xs text-text-dim uppercase tracking-wider font-bold mb-2 block">
            Word Length
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[5, 6, 7].map((len) => (
              <button
                key={len}
                onClick={() => setWordLength(len)}
                className={`p-3 rounded-none text-sm font-bold border-2 transition-all ${
                  wordLength === len
                    ? "border-[#16a34a] text-[#16a34a] bg-[#16a34a]/10"
                    : "border-surface-border text-text-secondary hover:bg-surface"
                }`}
              >
                {len} Letters
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
          className="w-full py-3.5 rounded-none font-bold text-white bg-[#16a34a] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? "Finding word..." : "Start Game"}
        </button>
      </main>
    );
  }

  // ── Complete Screen ──
  if (phase === "complete" && wordData) {
    const points = calculateWordleScore(solved, currentRow, hintUsed, wordData.length);

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">{solved ? "🎉" : "😔"}</span>
        <h1 className="text-3xl font-black text-[#16a34a] mb-2">
          {solved ? `SOLVED IN ${currentRow}!` : "GAME OVER"}
        </h1>
        <div className="w-12 h-1 bg-[#16a34a] mx-auto mb-4" />

        <div className="text-center mb-6">
          <div className="font-mono text-2xl font-bold tracking-[0.3em] text-text-primary mb-2">
            {wordData.answer}
          </div>
          <p className="text-text-secondary text-sm">{wordData.clue}</p>
          <p className="text-text-dim text-xs mt-1">{wordData.category}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-[#16a34a]">{points}</div>
            <div className="text-text-dim text-xs uppercase">Points</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">
              {solved ? `${currentRow}/6` : "X/6"}
            </div>
            <div className="text-text-dim text-xs uppercase">Guesses</div>
          </div>
        </div>

        {solved && !hintUsed && (
          <div className="text-[#16a34a] text-sm font-mono mb-4">No hint bonus!</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setPhase("setup");
              setWordData(null);
            }}
            className="px-6 py-3 rounded-none font-bold text-white bg-[#16a34a] hover:opacity-90 active:scale-95 transition-all"
          >
            New Word
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
  if (!wordData) return null;

  return (
    <main className="min-h-dvh px-4 pt-4 pb-4 max-w-lg mx-auto flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔤</span>
          <span className="text-sm font-bold text-[#16a34a] uppercase tracking-wider">
            Wordle
          </span>
        </div>
        <button
          onClick={() => {
            if (!hintUsed) setHintUsed(true);
            setShowHint((h) => !h);
          }}
          className={`text-xs font-bold px-3 py-1.5 rounded-none border-2 transition-all ${
            showHint
              ? "border-bauhaus-yellow text-bauhaus-yellow bg-bauhaus-yellow/10"
              : "border-surface-border text-text-dim hover:border-bauhaus-yellow hover:text-bauhaus-yellow"
          }`}
        >
          {showHint ? "Hide Hint" : hintUsed ? "Show Hint" : "Hint (-40pts)"}
        </button>
      </div>

      {/* Hint */}
      {showHint && (
        <div className="mb-3 p-3 border-2 border-bauhaus-yellow/30 bg-bauhaus-yellow/5 text-text-secondary text-sm">
          <span className="text-bauhaus-yellow font-bold text-xs uppercase">Clue: </span>
          {wordData.clue}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 mb-3">
        {guesses.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`flex gap-1.5 ${
              rowIdx === currentRow && shake ? "animate-shake" : ""
            }`}
          >
            {row.map((cell, colIdx) => {
              const isCurrentRow = rowIdx === currentRow;
              const currentLetter = isCurrentRow ? currentGuess[colIdx] || "" : "";
              const displayLetter = cell.letter || currentLetter;
              const isRevealing = revealRow === rowIdx;

              let bg = "bg-surface";
              let border = "border-surface-border";
              let textColor = "text-text-primary";

              if (cell.state === "correct") {
                bg = "bg-[#16a34a]";
                border = "border-[#16a34a]";
                textColor = "text-white";
              } else if (cell.state === "present") {
                bg = "bg-[#eab308]";
                border = "border-[#eab308]";
                textColor = "text-white";
              } else if (cell.state === "absent") {
                bg = "bg-[#6b7280]";
                border = "border-[#6b7280]";
                textColor = "text-white";
              } else if (displayLetter) {
                border = "border-text-secondary";
              }

              return (
                <div
                  key={colIdx}
                  className={`w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] border-2 flex items-center justify-center font-bold text-2xl uppercase transition-all ${bg} ${border} ${textColor} ${
                    isCurrentRow && displayLetter && cell.state === "empty"
                      ? "scale-105"
                      : ""
                  } ${isRevealing ? "animate-flip" : ""}`}
                  style={{
                    animationDelay: isRevealing ? `${colIdx * 150}ms` : undefined,
                  }}
                >
                  {displayLetter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div className="flex flex-col items-center gap-1.5">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1">
            {row.map((key) => {
              const state = keyStates[key];
              const isWide = key === "ENTER" || key === "⌫";

              let bg = "bg-surface-elevated";
              let textColor = "text-text-primary";

              if (state === "correct") {
                bg = "bg-[#16a34a]";
                textColor = "text-white";
              } else if (state === "present") {
                bg = "bg-[#eab308]";
                textColor = "text-white";
              } else if (state === "absent") {
                bg = "bg-[#4b5563]";
                textColor = "text-[#9ca3af]";
              }

              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className={`${
                    isWide ? "px-3 sm:px-4" : "w-[30px] sm:w-[36px]"
                  } h-[46px] sm:h-[52px] rounded-none font-bold text-sm sm:text-base ${bg} ${textColor} active:scale-95 transition-all`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
