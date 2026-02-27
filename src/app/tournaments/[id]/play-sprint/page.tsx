"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { DbQuestion, DbTournament } from "@/lib/types";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";

const BASE_TIME = 60;
const WRONG_PENALTY = 3;
const ADVANCE_DELAY = 200;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type Phase = "loading" | "ready" | "playing" | "finished";

interface RoundResult {
  points_earned: number;
  fire_multiplier: number;
  fire_streak: number;
  berserk_bonus: boolean;
  accuracy: number;
  score: number;
  total: number;
}

export default function TournamentSprintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const berserk = searchParams.get("berserk") === "true";

  const totalTime = berserk ? Math.ceil(BASE_TIME / 2) : BASE_TIME;

  const [tournament, setTournament] = useState<DbTournament | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [answersLog, setAnswersLog] = useState<{ questionId: string; selectedAnswer: string | null; timeRemaining: number }[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(totalTime);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [penaltyFlash, setPenaltyFlash] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeRef = useRef(totalTime);

  // Fetch tournament info
  useEffect(() => {
    fetch(`/api/tournaments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tournament) setTournament(data.tournament);
      });
  }, [id]);

  // Fetch questions
  useEffect(() => {
    fetch(`/api/questions?shuffle=true&limit=50`)
      .then((r) => r.json())
      .then((qs: DbQuestion[]) => {
        setQuestions(qs);
        if (qs.length > 0) setShuffledChoices(shuffleArray(qs[0].choices));
        setPhase("ready");
      });
  }, []);

  const currentQuestion = questions[currentIndex];

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
    setPhase("finished");
  }, []);

  // Global timer
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = setInterval(() => {
      timeRef.current -= 0.1;
      const t = timeRef.current;
      setTimeRemaining(t);
      if (t <= 0) {
        timeRef.current = 0;
        setTimeRemaining(0);
        endGame();
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, endGame]);

  function handleSelectAnswer(choice: string) {
    if (selectedAnswer !== null || !currentQuestion || phase !== "playing") return;

    const isCorrect = choice === currentQuestion.answer;
    setSelectedAnswer(choice);

    if (isCorrect) {
      setCorrect((c) => c + 1);
    } else {
      setWrong((w) => w + 1);
      timeRef.current = Math.max(0, timeRef.current - WRONG_PENALTY);
      setTimeRemaining(timeRef.current);
      setPenaltyFlash(true);
      setTimeout(() => setPenaltyFlash(false), 400);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
      if (timeRef.current <= 0) {
        endGame();
        return;
      }
    }

    setAnswersLog((a) => [
      ...a,
      { questionId: currentQuestion.id, selectedAnswer: choice, timeRemaining: timeRef.current },
    ]);

    advanceRef.current = setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        endGame();
        return;
      }
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setSelectedAnswer(null);
      setShuffledChoices(shuffleArray(questions[next].choices));
    }, ADVANCE_DELAY);
  }

  function startGame() {
    setPhase("playing");
    setCurrentIndex(0);
    setCorrect(0);
    setWrong(0);
    setAnswersLog([]);
    setSelectedAnswer(null);
    setRoundResult(null);
    setSubmitting(false);
    timeRef.current = totalTime;
    setTimeRemaining(totalTime);
    if (questions.length > 0) setShuffledChoices(shuffleArray(questions[0].choices));
  }

  async function submitRound() {
    if (submitting) return;
    setSubmitting(true);

    const res = await fetch(`/api/tournaments/${id}/sprint-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        berserk,
        answers: answersLog,
        totalTimeUsed: totalTime - timeRef.current,
      }),
    });

    const data = await res.json();
    setRoundResult(data);
    setSubmitting(false);
  }

  // Auto-submit when game ends
  useEffect(() => {
    if (phase === "finished" && !roundResult && !submitting) {
      submitRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!session) return null;

  // Loading
  if (phase === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-secondary">
        Loading...
      </div>
    );
  }

  const typeColor = "#ca8a04";

  // Ready screen
  if (phase === "ready") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col">
        <button onClick={() => router.push(`/tournaments/${id}`)} className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary mb-6 text-left">
          ← Back to Tournament
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-7xl mb-6">🏃</span>
          <h1 className="text-4xl font-black text-bauhaus-yellow mb-2">SPRINT</h1>
          <div className="w-16 h-1 bg-bauhaus-yellow mx-auto mb-4" />
          <p className="text-text-secondary text-sm font-light mb-4 max-w-xs">
            Race the clock. {totalTime} seconds. Wrong answers cost you {WRONG_PENALTY} seconds.
          </p>
          {berserk && (
            <div className="text-bauhaus-red text-xs font-bold uppercase tracking-wider mb-4 border border-bauhaus-red px-3 py-1">
              💀 Berserk Mode — {totalTime}s clock
            </div>
          )}
          <div className="flex flex-col gap-2 text-xs text-text-dim mb-8">
            <div>{totalTime}s total · -{WRONG_PENALTY}s penalty · Tournament round</div>
          </div>
          <button
            onClick={startGame}
            disabled={questions.length === 0}
            className="px-8 py-3.5 rounded-none font-bold text-black bg-bauhaus-yellow hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {questions.length === 0 ? "Loading..." : "GO!"}
          </button>
        </div>
      </main>
    );
  }

  // Finished screen
  if (phase === "finished") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">🏁</span>
        <h1 className="text-4xl font-black text-bauhaus-yellow mb-2">TIME!</h1>
        <div className="w-16 h-1 bg-bauhaus-yellow mx-auto mb-6" />

        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-success">{correct}</div>
            <div className="text-text-dim text-xs uppercase">Correct</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-bauhaus-red">{wrong}</div>
            <div className="text-text-dim text-xs uppercase">Wrong</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-bauhaus-yellow">{correct + wrong}</div>
            <div className="text-text-dim text-xs uppercase">Total</div>
          </div>
        </div>

        {submitting ? (
          <div className="text-text-dim text-sm mb-6">Submitting round...</div>
        ) : roundResult ? (
          <div className="w-full max-w-xs p-4 border-2 border-surface-border bg-surface mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Points earned</span>
              <span className="font-mono font-bold" style={{ color: typeColor }}>{roundResult.points_earned}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Fire multiplier</span>
              <span className="font-mono font-bold">{roundResult.fire_multiplier}x</span>
            </div>
            {roundResult.fire_streak > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Fire streak</span>
                <span className="font-mono font-bold">🔥 {roundResult.fire_streak}</span>
              </div>
            )}
            {berserk && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">💀 Berserk</span>
                <span className={`font-mono font-bold ${roundResult.berserk_bonus ? "text-success" : "text-bauhaus-red"}`}>
                  {roundResult.berserk_bonus ? "1.5x applied" : "Failed (<60% accuracy)"}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Accuracy</span>
              <span className="font-mono font-bold text-text-primary">{roundResult.accuracy}%</span>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="px-6 py-3 rounded-none font-bold text-black bg-bauhaus-yellow hover:opacity-90 active:scale-95 transition-all"
          >
            Again
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
  if (!currentQuestion) return null;

  const timerPercent = (timeRemaining / totalTime) * 100;
  const timerColor = timeRemaining > 30 ? "#16a34a" : timeRemaining > 10 ? "#eab308" : "#dc2626";

  function getChoiceState(choice: string) {
    if (selectedAnswer === null) return "idle" as const;
    if (choice === currentQuestion!.answer) {
      return choice === selectedAnswer
        ? ("selected-correct" as const)
        : ("reveal-correct" as const);
    }
    if (choice === selectedAnswer) return "selected-wrong" as const;
    return "disabled" as const;
  }

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
      {/* Timer bar */}
      <div className={`mb-4 transition-colors ${penaltyFlash ? "bg-bauhaus-red/20" : ""}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏃</span>
            <span className="text-sm font-bold text-bauhaus-yellow uppercase tracking-wider">Sprint</span>
            {berserk && (
              <span className="text-xs font-bold text-bauhaus-red border border-bauhaus-red px-1.5 py-0.5 uppercase tracking-wider">
                💀 Berserk
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-sm text-success">{correct}</div>
            <div className="font-mono text-sm text-bauhaus-red">{wrong}</div>
          </div>
        </div>
        <div className="w-full h-3 bg-surface rounded-none overflow-hidden relative">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${timerPercent}%`,
              background: timerColor,
            }}
          />
          {penaltyFlash && (
            <div className="absolute inset-0 bg-bauhaus-red/30 animate-pulse" />
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="font-mono text-lg font-bold" style={{ color: timerColor }}>
            {Math.ceil(timeRemaining)}s
          </span>
          <span className="text-text-dim text-xs font-mono">Q{currentIndex + 1}</span>
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <QuestionCard
          question={currentQuestion.question}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
        />
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 gap-2.5 mb-4">
        {shuffledChoices.map((choice) => (
          <ChoiceButton
            key={choice}
            text={choice}
            state={getChoiceState(choice)}
            onClick={() => handleSelectAnswer(choice)}
            sectionColor="#eab308"
          />
        ))}
      </div>
    </main>
  );
}
