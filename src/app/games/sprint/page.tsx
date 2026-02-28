"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { calculateSprintScore, calculateXp } from "@/lib/scoring";
import type { DbQuestion, AnswerRecord } from "@/lib/types";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";

const TOTAL_TIME = 60;
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

type Phase = "ready" | "playing" | "finished";

export default function SprintPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [phase, setPhase] = useState<Phase>("ready");
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [penaltyFlash, setPenaltyFlash] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeRef = useRef(TOTAL_TIME);

  useEffect(() => {
    fetch(`/api/questions?shuffle=true&limit=50`)
      .then((r) => r.json())
      .then((qs: DbQuestion[]) => {
        setQuestions(qs);
        if (qs.length > 0) setShuffledChoices(shuffleArray(qs[0].choices));
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
      // Apply time penalty
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

    setAnswers((a) => [
      ...a,
      {
        questionId: currentQuestion.id,
        selectedAnswer: choice,
        correct: isCorrect,
        timeRemaining: timeRef.current,
        pointsEarned: isCorrect ? 10 : -2,
      },
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
    setAnswers([]);
    setSelectedAnswer(null);
    timeRef.current = TOTAL_TIME;
    setTimeRemaining(TOTAL_TIME);
    if (questions.length > 0) setShuffledChoices(shuffleArray(questions[0].choices));
  }

  async function submitAndNavigate() {
    if (submitting) return;
    setSubmitting(true);

    const finalPoints = calculateSprintScore(correct, wrong, timeRef.current);
    const xpResult = calculateXp(Math.max(0, finalPoints), "sprint", correct, correct + wrong, 0);

    if (session?.user?.id) {
      await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: "sprint",
          answers: answers.map((a) => ({
            questionId: a.questionId,
            correct: a.correct,
            timeRemaining: a.timeRemaining,
            pointsEarned: a.pointsEarned,
          })),
          score: correct,
          total: correct + wrong,
          points: Math.max(0, finalPoints),
          bestStreak: 0,
          section: "all",
          sectionName: "Sprint",
          durationSeconds: Math.round(TOTAL_TIME - timeRef.current),
          metadata: {
            correct,
            wrong,
            timeRemaining: Math.round(timeRef.current),
          },
        }),
      });
    }

    const sprintTotal = correct + wrong;
    const sprintAccuracy = sprintTotal > 0 ? correct / sprintTotal : 0;
    const sprintPenalized = sprintAccuracy < 0.7;
    const sprintXpChange = sprintPenalized
      ? -Math.ceil((0.7 - sprintAccuracy) * sprintTotal * 12)
      : xpResult.totalXp;

    const resultParams = new URLSearchParams({
      score: correct.toString(),
      total: sprintTotal.toString(),
      points: Math.max(0, finalPoints).toString(),
      bestStreak: "0",
      section: "all",
      sectionName: "Sprint",
      mode: "sprint",
      xp: sprintXpChange.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      penalized: sprintPenalized ? "1" : "0",
    });
    router.push(`/results?${resultParams.toString()}`);
  }

  // Ready screen
  if (phase === "ready") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col">
        <Link href="/games" className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary mb-6">
          ← Game Variants
        </Link>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-7xl mb-6">🏃</span>
          <h1 className="text-4xl font-black text-bauhaus-yellow mb-2">SPRINT</h1>
          <div className="w-16 h-1 bg-bauhaus-yellow mx-auto mb-4" />
          <p className="text-text-secondary text-sm font-light mb-8 max-w-xs">
            Race the clock. 60 seconds. Wrong answers cost you 3 seconds.
            How many can you get right?
          </p>
          <div className="flex flex-col gap-2 text-xs text-text-dim mb-8">
            <div>60s total · -3s penalty · instant advance</div>
            <div>+10 per correct · -2 per wrong · time bonus</div>
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
    const finalPoints = calculateSprintScore(correct, wrong, timeRef.current);
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
            <div className="font-mono text-2xl font-bold text-bauhaus-yellow">{Math.max(0, finalPoints)}</div>
            <div className="text-text-dim text-xs uppercase">Points</div>
          </div>
        </div>

        <div className="text-text-dim text-xs mb-8">
          {Math.floor(timeRef.current)}s remaining · {correct + wrong} answered
        </div>

        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="px-6 py-3 rounded-none font-bold text-black bg-bauhaus-yellow hover:opacity-90 active:scale-95 transition-all"
          >
            Again
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
  if (!currentQuestion) return null;

  const timerPercent = (timeRemaining / TOTAL_TIME) * 100;
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
