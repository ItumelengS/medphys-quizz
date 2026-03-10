"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculateWordleScore } from "@/lib/scoring";
import ArenaCountdown from "@/components/ArenaCountdown";

type Phase = "loading" | "playing" | "submitting" | "results";
type LetterState = "correct" | "present" | "absent" | "empty";

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

interface RoundResult {
  points_earned: number;
  fire_multiplier: number;
  fire_streak: number;
  solved: boolean;
  guessesUsed: number;
  baseScore: number;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 6; // Fixed for tournament fairness

export default function TournamentWordlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [error, setError] = useState("");

  const [guesses, setGuesses] = useState<CellData[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [currentRow, setCurrentRow] = useState(0);
  const [solved, setSolved] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);
  const [keyStates, setKeyStates] = useState<Record<string, LetterState>>({});
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [readyToPlay, setReadyToPlay] = useState(false);

  // Fetch word on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/wordle?minLen=${WORD_LENGTH}&maxLen=${WORD_LENGTH}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setWordData(data);
        setGuesses(
          Array.from({ length: MAX_GUESSES }, () =>
            Array.from({ length: data.length }, () => ({ letter: "", state: "empty" as LetterState }))
          )
        );
        setPhase("playing");
      })
      .catch(() => setError("Failed to load word"));
  }, [session?.user?.id]);

  const evaluateGuess = useCallback(
    (guess: string): CellData[] => {
      if (!wordData) return [];
      const answer = wordData.answer;
      const result: CellData[] = guess.split("").map((l) => ({ letter: l, state: "absent" as LetterState }));
      const used = new Array(answer.length).fill(false);

      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === answer[i]) {
          result[i].state = "correct";
          used[i] = true;
        }
      }

      for (let i = 0; i < guess.length; i++) {
        if (result[i].state === "correct") continue;
        for (let j = 0; j < answer.length; j++) {
          if (!used[j] && guess[i] === answer[j]) {
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

  const submitRound = useCallback(async (didSolve: boolean, row: number) => {
    if (!wordData) return;
    setPhase("submitting");

    try {
      const res = await fetch(`/api/tournaments/${id}/wordle-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solved: didSolve,
          guessesUsed: row,
          hintUsed,
          wordLength: wordData.length,
          wordId: wordData.id,
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
  }, [id, wordData, hintUsed]);

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

    const newKeyStates = { ...keyStates };
    for (const cell of result) {
      const existing = newKeyStates[cell.letter];
      if (cell.state === "correct") newKeyStates[cell.letter] = "correct";
      else if (cell.state === "present" && existing !== "correct") newKeyStates[cell.letter] = "present";
      else if (cell.state === "absent" && !existing) newKeyStates[cell.letter] = "absent";
    }
    setKeyStates(newKeyStates);

    const isCorrect = currentGuess === wordData.answer;
    const nextRow = currentRow + 1;

    if (isCorrect) {
      setSolved(true);
      setTimeout(() => submitRound(true, nextRow), 1200);
    } else if (nextRow >= MAX_GUESSES) {
      setTimeout(() => submitRound(false, nextRow), 1200);
    }

    setCurrentRow(nextRow);
    setCurrentGuess("");
  }, [wordData, solved, currentRow, currentGuess, guesses, evaluateGuess, keyStates, submitRound]);

  const handleKey = useCallback(
    (key: string) => {
      if (!wordData || solved || currentRow >= MAX_GUESSES || phase !== "playing") return;
      if (key === "ENTER") { submitGuess(); return; }
      if (key === "⌫" || key === "BACKSPACE") { setCurrentGuess((g) => g.slice(0, -1)); return; }
      if (/^[A-Z]$/.test(key) && currentGuess.length < wordData.length) setCurrentGuess((g) => g + key);
    },
    [wordData, solved, currentRow, currentGuess, submitGuess, phase]
  );

  useEffect(() => {
    if (!readyToPlay || phase !== "playing") return;
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
  }, [readyToPlay, phase, handleKey]);

  if (error) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-bauhaus-red text-lg font-bold mb-4">{error}</div>
        <Link href={`/tournaments/${id}`} className="text-bauhaus-blue font-bold">← Back to Tournament</Link>
      </main>
    );
  }

  async function handleAbandon() {
    // Submit zero-score round as penalty
    if (wordData) {
      await fetch(`/api/tournaments/${id}/wordle-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solved: false,
          guessesUsed: 0,
          hintUsed: false,
          wordLength: wordData.length,
          wordId: wordData.id,
        }),
      });
    }
    router.push(`/tournaments/${id}`);
  }

  if (phase === "loading") {
    return <main className="min-h-dvh flex items-center justify-center text-text-secondary">Loading word...</main>;
  }

  // Countdown phase — show before starting the round
  if (!readyToPlay && phase === "playing") {
    return (
      <ArenaCountdown
        onReady={() => setReadyToPlay(true)}
        onAbandon={handleAbandon}
        variantLabel="Wordle"
        variantIcon="🔤"
        color="#16a34a"
        berserk={false}
      />
    );
  }

  // Results
  if (phase === "results" && roundResult && wordData) {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">{roundResult.solved ? "🎉" : "😔"}</span>
        <h1 className="text-3xl font-black text-[#16a34a] mb-2">
          {roundResult.solved ? "SOLVED!" : "GAME OVER"}
        </h1>
        <div className="w-12 h-1 bg-[#16a34a] mx-auto mb-4" />

        <div className="font-mono text-2xl font-bold tracking-[0.3em] text-text-primary mb-2">{wordData.answer}</div>
        <p className="text-text-secondary text-sm mb-6">{wordData.clue}</p>

        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-[#16a34a]">{roundResult.points_earned}</div>
            <div className="text-text-dim text-xs uppercase">Arena Points</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-text-primary">
              {roundResult.solved ? `${roundResult.guessesUsed}/6` : "X/6"}
            </div>
            <div className="text-text-dim text-xs uppercase">Guesses</div>
          </div>
        </div>

        {roundResult.fire_streak > 0 && (
          <div className="text-bauhaus-yellow text-sm font-mono mb-4">🔥 Fire streak: {roundResult.fire_streak}</div>
        )}

        <button
          onClick={() => router.push(`/tournaments/${id}`)}
          className="px-6 py-3 rounded-none font-bold text-white bg-[#16a34a] hover:opacity-90 active:scale-95 transition-all"
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
  if (!wordData) return null;

  return (
    <main className="min-h-dvh px-4 pt-4 pb-4 max-w-lg mx-auto flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link href={`/tournaments/${id}`} className="text-text-dim text-xs hover:text-text-secondary">←</Link>
          <span className="text-lg">🔤</span>
          <span className="text-sm font-bold text-[#16a34a] uppercase tracking-wider">Arena Wordle</span>
        </div>
        <button
          onClick={() => { if (!hintUsed) setHintUsed(true); setShowHint((h) => !h); }}
          className={`text-xs font-bold px-3 py-1.5 rounded-none border-2 transition-all ${
            showHint ? "border-bauhaus-yellow text-bauhaus-yellow bg-bauhaus-yellow/10" : "border-surface-border text-text-dim hover:border-bauhaus-yellow"
          }`}
        >
          {showHint ? "Hide Hint" : hintUsed ? "Show Hint" : "Hint (-40pts)"}
        </button>
      </div>

      {showHint && (
        <div className="mb-3 p-3 border-2 border-bauhaus-yellow/30 bg-bauhaus-yellow/5 text-text-secondary text-sm">
          <span className="text-bauhaus-yellow font-bold text-xs uppercase">Clue: </span>{wordData.clue}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 mb-3">
        {guesses.map((row, rowIdx) => (
          <div key={rowIdx} className={`flex gap-1.5 ${rowIdx === currentRow && shake ? "animate-shake" : ""}`}>
            {row.map((cell, colIdx) => {
              const isCurrentRow = rowIdx === currentRow;
              const displayLetter = cell.letter || (isCurrentRow ? currentGuess[colIdx] || "" : "");
              let bg = "bg-surface", border = "border-surface-border", textColor = "text-text-primary";
              if (cell.state === "correct") { bg = "bg-[#16a34a]"; border = "border-[#16a34a]"; textColor = "text-white"; }
              else if (cell.state === "present") { bg = "bg-[#eab308]"; border = "border-[#eab308]"; textColor = "text-white"; }
              else if (cell.state === "absent") { bg = "bg-[#6b7280]"; border = "border-[#6b7280]"; textColor = "text-white"; }
              else if (displayLetter) { border = "border-text-secondary"; }
              return (
                <div key={colIdx} className={`w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] border-2 flex items-center justify-center font-bold text-2xl uppercase transition-all ${bg} ${border} ${textColor}`}>
                  {displayLetter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1.5">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1">
            {row.map((key) => {
              const state = keyStates[key];
              const isWide = key === "ENTER" || key === "⌫";
              let bg = "bg-surface-elevated", textColor = "text-text-primary";
              if (state === "correct") { bg = "bg-[#16a34a]"; textColor = "text-white"; }
              else if (state === "present") { bg = "bg-[#eab308]"; textColor = "text-white"; }
              else if (state === "absent") { bg = "bg-[#4b5563]"; textColor = "text-[#9ca3af]"; }
              return (
                <button key={key} onClick={() => handleKey(key)}
                  className={`${isWide ? "px-3 sm:px-4" : "w-[30px] sm:w-[36px]"} h-[46px] sm:h-[52px] rounded-none font-bold text-sm sm:text-base ${bg} ${textColor} active:scale-95 transition-all`}>
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
