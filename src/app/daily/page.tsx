"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getNextDailyReset, formatCountdown } from "@/lib/daily-seed";
import {
  calculatePoints,
  calculateXp,
  isCalculationQuestion,
  getAdaptiveTimer,
  TIMER_WRONG_RECOVERY,
} from "@/lib/scoring";
import type { DbQuestion, AnswerRecord } from "@/lib/types";
import TimerRing from "@/components/TimerRing";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";
import ExplanationCard from "@/components/ExplanationCard";
import StreakBadge from "@/components/StreakBadge";
import ProgressBar from "@/components/ProgressBar";

const TIMER_SECONDS = 12;
const ADVANCE_DELAY = 800;
const WRONG_DELAY = 2000;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function DailyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [locked, setLocked] = useState(false);
  const [lockedScore, setLockedScore] = useState<number | null>(null);
  const [countdown, setCountdown] = useState("");
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [pointsPopup, setPointsPopup] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/quiz/daily")
      .then((r) => r.json())
      .then((data) => {
        if (data.locked) {
          setLocked(true);
          setLockedScore(data.score);
          setCountdown(formatCountdown(getNextDailyReset()));
        } else if (data.questions) {
          setQuestions(data.questions);
          if (data.questions.length > 0) {
            setShuffledChoices(shuffleArray(data.questions[0].choices));
          }
        }
      });
  }, []);

  const currentQuestion = questions[currentIndex];

  // Compute adaptive timer for current question
  const currentTimerTotal = currentQuestion
    ? getAdaptiveTimer(TIMER_SECONDS, correctCount, isCalculationQuestion(currentQuestion.question))
    : TIMER_SECONDS;

  useEffect(() => {
    if (!currentQuestion || selectedAnswer !== null || locked) return;
    setTimeRemaining(currentTimerTotal);
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
  }, [currentIndex, currentQuestion, locked, currentTimerTotal]);

  const handleTimeout = useCallback(() => {
    if (!currentQuestion || selectedAnswer !== null) return;
    processAnswer(null, false, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, selectedAnswer]);

  function processAnswer(selected: string | null, correct: boolean, time: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    const newStreak = correct ? streak + 1 : 0;
    const earned = calculatePoints(correct, time, correct ? newStreak : 0);

    setSelectedAnswer(selected);
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    if (correct) {
      setScore((s) => s + 1);
      setPoints((p) => p + earned);
      setCorrectCount((c) => c + 1);
      setPointsPopup(earned);
      setTimeout(() => setPointsPopup(null), 600);
    } else {
      setShowExplanation(true);
      setCorrectCount((c) => Math.max(0, c - Math.ceil(TIMER_WRONG_RECOVERY / 1.5)));
    }

    setAnswers((a) => [...a, {
      questionId: currentQuestion.id,
      selectedAnswer: selected,
      correct,
      timeRemaining: time,
      pointsEarned: earned,
    }]);

    const delay = correct ? ADVANCE_DELAY : WRONG_DELAY;
    setTimeout(() => advance(), delay);
  }

  function handleSelectAnswer(choice: string) {
    if (selectedAnswer !== null || !currentQuestion) return;
    const correct = choice === currentQuestion.answer;
    processAnswer(choice, correct, timeRemaining);
  }

  function advance() {
    if (currentIndex + 1 >= questions.length) {
      finishDaily();
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShuffledChoices(shuffleArray(questions[nextIndex].choices));
  }

  function finishDaily() {
    const xpResult = calculateXp(points, "daily", score, questions.length, 1);

    const submitAnswers = answers.map((a) => ({
      questionId: a.questionId,
      correct: a.correct,
      timeRemaining: a.timeRemaining,
      pointsEarned: a.pointsEarned,
    }));

    fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: submitAnswers,
        score,
        total: questions.length,
        points,
        bestStreak,
        section: "daily",
        sectionName: "Daily Challenge",
        mode: "daily",
      }),
    });

    const dailyAccuracy = questions.length > 0 ? score / questions.length : 0;
    const dailyPenalized = dailyAccuracy < 0.7;
    const dailyXpChange = dailyPenalized
      ? -Math.ceil((0.7 - dailyAccuracy) * questions.length * 5)
      : xpResult.totalXp;

    const resultParams = new URLSearchParams({
      score: score.toString(),
      total: questions.length.toString(),
      points: points.toString(),
      bestStreak: bestStreak.toString(),
      section: "daily",
      sectionName: "Daily Challenge",
      mode: "daily",
      xp: dailyXpChange.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      penalized: dailyPenalized ? "1" : "0",
    });
    router.push(`/results?${resultParams.toString()}`);
  }

  if (locked) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4 max-w-lg mx-auto text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-2xl font-black text-bauhaus-yellow mb-2 uppercase tracking-wider">Challenge Complete!</h1>
        <p className="text-text-secondary mb-4 font-light">Come back tomorrow for a new challenge.</p>
        {lockedScore !== null && (
          <p className="text-bauhaus-yellow font-mono text-lg mb-2">Score: {lockedScore}/10</p>
        )}
        <p className="font-mono text-bauhaus-yellow text-lg mb-8">Next in {countdown}</p>
        <Link href="/" className="px-8 py-3 rounded-none font-bold border-2 border-bauhaus-yellow/30 text-bauhaus-yellow hover:bg-gold-dim transition-all">
          Home
        </Link>
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

  const isCalc = isCalculationQuestion(currentQuestion.question);

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="text-sm font-bold text-bauhaus-yellow uppercase tracking-wider">Daily Challenge</span>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={streak} />
          <div className="font-mono text-sm font-bold text-bauhaus-yellow">{points}</div>
        </div>
      </div>

      <ProgressBar progress={((currentIndex + 1) / questions.length) * 100} color="#eab308" />

      <div className="flex items-center justify-between mt-4 mb-6">
        <div className="relative">
          <TimerRing timeRemaining={timeRemaining} totalTime={currentTimerTotal} />
          {isCalc && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-bauhaus-yellow uppercase tracking-wider">
              calc
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-text-primary">
            {score}/{currentIndex + (selectedAnswer !== null ? 1 : 0)}
          </div>
          <div className="text-text-dim text-xs font-mono">{currentIndex + 1}/{questions.length}</div>
        </div>
      </div>

      <div className="relative mb-6">
        <QuestionCard question={currentQuestion.question} questionNumber={currentIndex + 1} totalQuestions={questions.length} />
        {pointsPopup && (
          <div className="absolute -top-2 right-0 animate-points-fly font-mono font-bold text-bauhaus-yellow text-lg">+{pointsPopup}</div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        {shuffledChoices.map((choice) => (
          <ChoiceButton key={choice} text={choice} state={getChoiceState(choice)} onClick={() => handleSelectAnswer(choice)} sectionColor="#eab308" />
        ))}
      </div>

      {showExplanation && selectedAnswer !== null && (
        <ExplanationCard explanation={currentQuestion.explanation} correct={false} correctAnswer={currentQuestion.answer} />
      )}
      {selectedAnswer !== null && selectedAnswer === currentQuestion.answer && (
        <ExplanationCard explanation={currentQuestion.explanation} correct={true} correctAnswer={currentQuestion.answer} />
      )}
    </main>
  );
}
