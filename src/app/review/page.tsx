"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  calculateXp,
  getCareerLevel,
} from "@/lib/scoring";
import type { DbQuestion } from "@/lib/types";
import TimerRing from "@/components/TimerRing";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";
import ExplanationCard from "@/components/ExplanationCard";
import ProgressBar from "@/components/ProgressBar";

const TIMER_SECONDS = 30;
const ADVANCE_DELAY = 2500;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ReviewPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [noQuestions, setNoQuestions] = useState(false);
  const [reviewAnswers, setReviewAnswers] = useState<{ questionId: string; correct: boolean }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/review/due")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setNoQuestions(true);
          return;
        }
        setQuestions(data);
        if (data.length > 0) setShuffledChoices(shuffleArray(data[0].choices));
      });
  }, []);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setTimeRemaining(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentQuestion]);

  const handleTimeout = useCallback(() => {
    if (!currentQuestion || selectedAnswer !== null) return;
    processAnswer(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, selectedAnswer]);

  function processAnswer(selected: string | null, correct: boolean) {
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedAnswer(selected);
    if (correct) setScore((s) => s + 1);

    setReviewAnswers((a) => [...a, { questionId: currentQuestion.id, correct }]);

    setTimeout(() => advance(), ADVANCE_DELAY);
  }

  function handleSelectAnswer(choice: string) {
    if (selectedAnswer !== null || !currentQuestion) return;
    processAnswer(choice, choice === currentQuestion.answer);
  }

  function advance() {
    if (currentIndex + 1 >= questions.length) {
      finishReview();
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setShuffledChoices(shuffleArray(questions[nextIndex].choices));
  }

  function finishReview() {
    const prevXp = session?.user?.xp || 0;
    const prevLevel = getCareerLevel(prevXp);
    const xpResult = calculateXp(0, "review", score, questions.length, 0);

    fetch("/api/review/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: reviewAnswers,
        score,
        total: questions.length,
      }),
    });

    const reviewAccuracy = questions.length > 0 ? score / questions.length : 0;
    const reviewPenalized = reviewAccuracy < 0.7;
    const reviewXpChange = reviewPenalized
      ? -Math.ceil((0.7 - reviewAccuracy) * questions.length * 12)
      : xpResult.totalXp;

    const newLevel = getCareerLevel(Math.max(0, prevXp + reviewXpChange));
    const leveledUp = !reviewPenalized && newLevel.level > prevLevel.level;

    const resultParams = new URLSearchParams({
      score: score.toString(),
      total: questions.length.toString(),
      points: "0",
      bestStreak: "0",
      section: "review",
      sectionName: "Spaced Review",
      mode: "review",
      xp: reviewXpChange.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      leveledUp: leveledUp ? newLevel.level.toString() : "",
      penalized: reviewPenalized ? "1" : "0",
    });
    router.push(`/results?${resultParams.toString()}`);
  }

  if (noQuestions) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4 max-w-lg mx-auto text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-text-primary mb-2">All caught up!</h1>
        <p className="text-text-secondary text-sm mb-6">No questions due for review right now.</p>
        <Link href="/" className="px-8 py-3 rounded-xl font-bold border border-accent/30 text-accent hover:bg-accent-dim transition-all">Home</Link>
      </main>
    );
  }

  if (!currentQuestion) {
    return <div className="min-h-dvh flex items-center justify-center text-text-secondary">Loading...</div>;
  }

  function getChoiceState(choice: string) {
    if (selectedAnswer === null) return "idle" as const;
    if (choice === currentQuestion.answer) {
      return choice === selectedAnswer ? "selected-correct" as const : "reveal-correct" as const;
    }
    if (choice === selectedAnswer) return "selected-wrong" as const;
    return "disabled" as const;
  }

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <span className="text-sm font-semibold text-accent">Review</span>
        </div>
        <div className="font-mono text-sm text-text-secondary">
          {score}/{currentIndex + (selectedAnswer !== null ? 1 : 0)}
        </div>
      </div>

      <ProgressBar progress={((currentIndex + 1) / questions.length) * 100} />

      <div className="flex items-center justify-between mt-4 mb-6">
        <TimerRing timeRemaining={timeRemaining} totalTime={TIMER_SECONDS} />
        <div className="text-text-dim text-xs font-mono">{currentIndex + 1}/{questions.length}</div>
      </div>

      <div className="mb-6">
        <QuestionCard question={currentQuestion.question} questionNumber={currentIndex + 1} totalQuestions={questions.length} />
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        {shuffledChoices.map((choice) => (
          <ChoiceButton key={choice} text={choice} state={getChoiceState(choice)} onClick={() => handleSelectAnswer(choice)} />
        ))}
      </div>

      {selectedAnswer !== null && (
        <ExplanationCard
          explanation={currentQuestion.explanation}
          correct={selectedAnswer === currentQuestion.answer}
          correctAnswer={currentQuestion.answer}
          alwaysShow
        />
      )}
    </main>
  );
}
