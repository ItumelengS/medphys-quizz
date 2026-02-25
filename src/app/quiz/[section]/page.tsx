"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { pickQuestions, getSection, shuffleArray } from "@/lib/questions";
import { storage } from "@/lib/storage";
import {
  calculatePoints,
  calculateXp,
  getCareerLevel,
} from "@/lib/scoring";
import {
  updateQuestionRecord,
  createQuestionRecord,
} from "@/lib/spaced-repetition";
import type { Question, AnswerRecord } from "@/lib/types";
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

export default function QuizPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionId } = use(params);
  const router = useRouter();
  const section = sectionId === "all" ? null : getSection(sectionId);
  const sectionColor = section?.color || "#00e5a0";
  const sectionName = section?.name || "All Topics";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [, setAnswers] = useState<AnswerRecord[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [pointsPopup, setPointsPopup] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize questions
  useEffect(() => {
    const qs = pickQuestions(sectionId, QUESTIONS_PER_ROUND);
    setQuestions(qs);
    if (qs.length > 0) {
      setShuffledChoices(shuffleArray(qs[0].c));
    }
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
      // Haptic
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    } else {
      setShowExplanation(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
    }

    // Update spaced repetition
    const state = storage.getState();
    const qId = currentQuestion.id;
    const record = state.questionHistory[qId] || createQuestionRecord(qId);
    const updated = updateQuestionRecord(record, correct);
    storage.updateState((s) => ({
      ...s,
      questionHistory: { ...s.questionHistory, [qId]: updated },
    }));

    setAnswers((a) => [
      ...a,
      {
        questionId: qId,
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
    const correct = choice === currentQuestion.a;
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
    setShuffledChoices(shuffleArray(questions[nextIndex].c));
  }

  function finishQuiz() {
    setIsFinished(true);

    const state = storage.getState();
    const prevLevel = getCareerLevel(state.player.xp);
    const xpResult = calculateXp(points, "speed", score, questions.length, state.stats.dailyStreak);

    const newState = storage.updateState((s) => ({
      ...s,
      player: { ...s.player, xp: s.player.xp + xpResult.totalXp },
      stats: {
        ...s.stats,
        totalAnswered: s.stats.totalAnswered + questions.length,
        totalCorrect: s.stats.totalCorrect + score,
        gamesPlayed: s.stats.gamesPlayed + 1,
        bestScore:
          s.stats.bestScore === null
            ? score
            : Math.max(s.stats.bestScore, score),
        bestStreak: Math.max(s.stats.bestStreak, bestStreak),
      },
    }));

    // Add leaderboard entry
    storage.addLeaderboardEntry({
      id: Date.now().toString(),
      playerName: newState.player.name,
      score,
      total: questions.length,
      points,
      bestStreak,
      section: sectionId,
      sectionName,
      date: new Date().toISOString(),
      mode: "speed",
    });

    const newLevel = getCareerLevel(newState.player.xp);
    const leveledUp = newLevel.level > prevLevel.level;

    // Navigate to results
    const params = new URLSearchParams({
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
    router.push(`/results?${params.toString()}`);
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
    if (choice === currentQuestion.a) {
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
          <span className="text-lg">{section?.icon || "⚡"}</span>
          <span className="text-sm font-semibold text-text-primary">{sectionName}</span>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={streak} />
          <div className="font-mono text-sm font-bold text-accent">{points}</div>
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
          question={currentQuestion.q}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
        />
        {/* Points popup */}
        {pointsPopup && (
          <div className="absolute -top-2 right-0 animate-points-fly font-mono font-bold text-accent text-lg">
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
          explanation={currentQuestion.e}
          correct={selectedAnswer === currentQuestion.a}
          correctAnswer={currentQuestion.a}
        />
      )}
      {selectedAnswer !== null && selectedAnswer === currentQuestion.a && (
        <ExplanationCard
          explanation={currentQuestion.e}
          correct={true}
          correctAnswer={currentQuestion.a}
        />
      )}
    </main>
  );
}
