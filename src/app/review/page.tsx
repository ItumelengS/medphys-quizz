"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAllQuestions, shuffleArray } from "@/lib/questions";
import { getDueQuestions } from "@/lib/spaced-repetition";
import { storage } from "@/lib/storage";
import {
  calculateXp,
  getCareerLevel,
} from "@/lib/scoring";
import {
  updateQuestionRecord,
  createQuestionRecord,
} from "@/lib/spaced-repetition";
import Link from "next/link";
import type { Question } from "@/lib/types";
import TimerRing from "@/components/TimerRing";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";
import ExplanationCard from "@/components/ExplanationCard";
import ProgressBar from "@/components/ProgressBar";

const TIMER_SECONDS = 30;
const ADVANCE_DELAY = 2500; // Longer in review since we always show explanation
const MAX_REVIEW = 20;

export default function ReviewPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [noQuestions, setNoQuestions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const state = storage.getState();
    const allQuestions = getAllQuestions();
    const allIds = allQuestions.map((q) => q.id);
    const dueIds = getDueQuestions(state.questionHistory, allIds).slice(0, MAX_REVIEW);

    if (dueIds.length === 0) {
      setNoQuestions(true);
      return;
    }

    const dueQuestions = dueIds
      .map((id) => allQuestions.find((q) => q.id === id))
      .filter(Boolean) as Question[];

    setQuestions(dueQuestions);
    if (dueQuestions.length > 0) setShuffledChoices(shuffleArray(dueQuestions[0].c));
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

    const state = storage.getState();
    const qId = currentQuestion.id;
    const record = state.questionHistory[qId] || createQuestionRecord(qId);
    const updated = updateQuestionRecord(record, correct);
    storage.updateState((s) => ({
      ...s,
      questionHistory: { ...s.questionHistory, [qId]: updated },
    }));

    setTimeout(() => advance(), ADVANCE_DELAY);
  }

  function handleSelectAnswer(choice: string) {
    if (selectedAnswer !== null || !currentQuestion) return;
    processAnswer(choice, choice === currentQuestion.a);
  }

  function advance() {
    if (currentIndex + 1 >= questions.length) {
      finishReview();
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setShuffledChoices(shuffleArray(questions[nextIndex].c));
  }

  function finishReview() {
    const state = storage.getState();
    const prevLevel = getCareerLevel(state.player.xp);
    const xpResult = calculateXp(0, "review", score, questions.length, state.stats.dailyStreak);

    const newState = storage.updateState((s) => ({
      ...s,
      player: { ...s.player, xp: s.player.xp + xpResult.totalXp },
      stats: {
        ...s.stats,
        totalAnswered: s.stats.totalAnswered + questions.length,
        totalCorrect: s.stats.totalCorrect + score,
      },
    }));

    const newLevel = getCareerLevel(newState.player.xp);
    const leveledUp = newLevel.level > prevLevel.level;

    const params = new URLSearchParams({
      score: score.toString(),
      total: questions.length.toString(),
      points: "0",
      bestStreak: "0",
      section: "review",
      sectionName: "Spaced Review",
      mode: "review",
      xp: xpResult.totalXp.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      leveledUp: leveledUp ? newLevel.level.toString() : "",
    });
    router.push(`/results?${params.toString()}`);
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
    if (choice === currentQuestion.a) {
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
        <QuestionCard question={currentQuestion.q} questionNumber={currentIndex + 1} totalQuestions={questions.length} />
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        {shuffledChoices.map((choice) => (
          <ChoiceButton key={choice} text={choice} state={getChoiceState(choice)} onClick={() => handleSelectAnswer(choice)} />
        ))}
      </div>

      {/* Always show explanation in review mode */}
      {selectedAnswer !== null && (
        <ExplanationCard
          explanation={currentQuestion.e}
          correct={selectedAnswer === currentQuestion.a}
          correctAnswer={currentQuestion.a}
          alwaysShow
        />
      )}
    </main>
  );
}
