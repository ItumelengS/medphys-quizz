"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  calculatePoints,
  calculateXp,
  getCareerLevel,
} from "@/lib/scoring";
import type { DbQuestion, AnswerRecord } from "@/lib/types";
import TimerRing from "@/components/TimerRing";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";
import ExplanationCard from "@/components/ExplanationCard";
import StreakBadge from "@/components/StreakBadge";
import ProgressBar from "@/components/ProgressBar";

const TIMER_SECONDS = 15;
const QUESTIONS_PER_ROUND = 20;
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

export default function QuizPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [sectionInfo, setSectionInfo] = useState<{ name: string; color: string; icon: string } | null>(null);
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
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sectionColor = sectionInfo?.color || "#2563eb";
  const sectionName = sectionInfo?.name || (sectionId === "all" ? "All Topics" : sectionId);

  // Fetch section info and questions
  useEffect(() => {
    if (sectionId !== "all") {
      fetch("/api/sections")
        .then((r) => r.json())
        .then((sections) => {
          const s = sections.find((sec: { id: string }) => sec.id === sectionId);
          if (s) setSectionInfo({ name: s.name, color: s.color, icon: s.icon });
        });
    }

    fetch(`/api/questions?section=${sectionId}&shuffle=true&limit=${QUESTIONS_PER_ROUND}`)
      .then((r) => r.json())
      .then((qs) => {
        setQuestions(qs);
        if (qs.length > 0) setShuffledChoices(shuffleArray(qs[0].choices));
      });
  }, [sectionId]);

  const currentQuestion = questions[currentIndex];

  // Timer
  useEffect(() => {
    if (!currentQuestion || selectedAnswer !== null || isFinished) return;

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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentQuestion, isFinished]);

  const handleTimeout = useCallback(() => {
    if (!currentQuestion || selectedAnswer !== null) return;
    processAnswer(null, false, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, selectedAnswer]);

  function processAnswer(
    selected: string | null,
    correct: boolean,
    time: number
  ) {
    if (timerRef.current) clearInterval(timerRef.current);

    const newStreak = correct ? streak + 1 : 0;
    const earned = calculatePoints(correct, time, correct ? newStreak : 0);

    setSelectedAnswer(selected);
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    if (correct) {
      setScore((s) => s + 1);
      setPoints((p) => p + earned);
      setPointsPopup(earned);
      setTimeout(() => setPointsPopup(null), 600);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    } else {
      setShowExplanation(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
    }

    setAnswers((a) => [
      ...a,
      {
        questionId: currentQuestion.id,
        selectedAnswer: selected,
        correct,
        timeRemaining: time,
        pointsEarned: earned,
      },
    ]);

    const delay = correct ? ADVANCE_DELAY : WRONG_DELAY;
    advanceRef.current = setTimeout(() => advance(), delay);
  }

  function handleSelectAnswer(choice: string) {
    if (selectedAnswer !== null || !currentQuestion) return;
    const correct = choice === currentQuestion.answer;
    processAnswer(choice, correct, timeRemaining);
  }

  function advance() {
    if (currentIndex + 1 >= questions.length) {
      finishQuiz();
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShuffledChoices(shuffleArray(questions[nextIndex].choices));
  }

  function finishQuiz() {
    setIsFinished(true);

    const prevXp = session?.user?.xp || 0;
    const prevLevel = getCareerLevel(prevXp);
    const xpResult = calculateXp(points, "speed", score, questions.length, 0);

    // Submit results to API
    const submitAnswers = answers.concat([]).map((a) => ({
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
        section: sectionId,
        sectionName,
        mode: "speed",
      }),
    });

    const newLevel = getCareerLevel(prevXp + xpResult.totalXp);
    const leveledUp = newLevel.level > prevLevel.level;

    const resultParams = new URLSearchParams({
      score: score.toString(),
      total: questions.length.toString(),
      points: points.toString(),
      bestStreak: bestStreak.toString(),
      section: sectionId,
      sectionName,
      mode: "speed",
      xp: xpResult.totalXp.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      leveledUp: leveledUp ? newLevel.level.toString() : "",
    });
    router.push(`/results?${resultParams.toString()}`);
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-secondary">
        Loading...
      </div>
    );
  }

  if (!currentQuestion) return null;

  function getChoiceState(choice: string) {
    if (selectedAnswer === null) return "idle" as const;
    if (choice === currentQuestion.answer) {
      return choice === selectedAnswer
        ? ("selected-correct" as const)
        : ("reveal-correct" as const);
    }
    if (choice === selectedAnswer) return "selected-wrong" as const;
    return "disabled" as const;
  }

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{sectionInfo?.icon || "⚡"}</span>
          <span className="text-sm font-bold text-text-primary uppercase tracking-wider">{sectionName}</span>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={streak} />
          <div className="font-mono text-sm font-bold text-bauhaus-blue">{points}</div>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar
        progress={((currentIndex + 1) / questions.length) * 100}
        color={sectionColor}
      />

      {/* Timer & Score */}
      <div className="flex items-center justify-between mt-4 mb-6">
        <TimerRing timeRemaining={timeRemaining} totalTime={TIMER_SECONDS} />
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-text-primary">
            {score}/{currentIndex + (selectedAnswer !== null ? 1 : 0)}
          </div>
          <div className="text-text-dim text-xs font-mono">
            {currentIndex + 1}/{questions.length}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="relative mb-6">
        <QuestionCard
          question={currentQuestion.question}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
        />
        {pointsPopup && (
          <div className="absolute -top-2 right-0 animate-points-fly font-mono font-bold text-bauhaus-blue text-lg">
            +{pointsPopup}
          </div>
        )}
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        {shuffledChoices.map((choice) => (
          <ChoiceButton
            key={choice}
            text={choice}
            state={getChoiceState(choice)}
            onClick={() => handleSelectAnswer(choice)}
            sectionColor={sectionColor}
          />
        ))}
      </div>

      {/* Explanation */}
      {showExplanation && selectedAnswer !== null && (
        <ExplanationCard
          explanation={currentQuestion.explanation}
          correct={selectedAnswer === currentQuestion.answer}
          correctAnswer={currentQuestion.answer}
        />
      )}
      {selectedAnswer !== null && selectedAnswer === currentQuestion.answer && (
        <ExplanationCard
          explanation={currentQuestion.explanation}
          correct={true}
          correctAnswer={currentQuestion.answer}
        />
      )}
    </main>
  );
}
