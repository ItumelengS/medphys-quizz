"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDailyQuestions, getTodayDateString, getNextDailyReset, formatCountdown } from "@/lib/daily-seed";
import { shuffleArray } from "@/lib/questions";
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

const TIMER_SECONDS = 12;
const ADVANCE_DELAY = 800;
const WRONG_DELAY = 2000;

export default function DailyPage() {
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  const [countdown, setCountdown] = useState("");
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const state = storage.getState();
    const today = getTodayDateString();
    if (state.dailyChallenge.lastCompletedDate === today) {
      setLocked(true);
      setCountdown(formatCountdown(getNextDailyReset()));
      return;
    }
    const qs = getDailyQuestions();
    setQuestions(qs);
    if (qs.length > 0) setShuffledChoices(shuffleArray(qs[0].c));
  }, []);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (!currentQuestion || selectedAnswer !== null || locked) return;
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
  }, [currentIndex, currentQuestion, locked]);

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
      setPointsPopup(earned);
      setTimeout(() => setPointsPopup(null), 600);
    } else {
      setShowExplanation(true);
    }

    const state = storage.getState();
    const qId = currentQuestion.id;
    const record = state.questionHistory[qId] || createQuestionRecord(qId);
    const updated = updateQuestionRecord(record, correct);
    storage.updateState((s) => ({
      ...s,
      questionHistory: { ...s.questionHistory, [qId]: updated },
    }));

    setAnswers((a) => [...a, { questionId: qId, selectedAnswer: selected, correct, timeRemaining: time, pointsEarned: earned }]);

    const delay = correct ? ADVANCE_DELAY : WRONG_DELAY;
    setTimeout(() => advance(), delay);
  }

  function handleSelectAnswer(choice: string) {
    if (selectedAnswer !== null || !currentQuestion) return;
    const correct = choice === currentQuestion.a;
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
    setShuffledChoices(shuffleArray(questions[nextIndex].c));
  }

  function finishDaily() {
    const today = getTodayDateString();
    const state = storage.getState();
    const prevLevel = getCareerLevel(state.player.xp);

    // Calculate daily streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const wasYesterday = state.dailyChallenge.lastCompletedDate === yesterdayStr;
    const newDailyStreak = wasYesterday ? state.stats.dailyStreak + 1 : 1;

    const xpResult = calculateXp(points, "daily", score, questions.length, newDailyStreak);

    const newState = storage.updateState((s) => ({
      ...s,
      player: { ...s.player, xp: s.player.xp + xpResult.totalXp },
      stats: {
        ...s.stats,
        totalAnswered: s.stats.totalAnswered + questions.length,
        totalCorrect: s.stats.totalCorrect + score,
        gamesPlayed: s.stats.gamesPlayed + 1,
        dailyStreak: newDailyStreak,
        lastDailyDate: today,
        bestStreak: Math.max(s.stats.bestStreak, bestStreak),
      },
      dailyChallenge: { lastCompletedDate: today, score },
    }));

    storage.addLeaderboardEntry({
      id: Date.now().toString(),
      playerName: newState.player.name,
      score,
      total: questions.length,
      points,
      bestStreak,
      section: "daily",
      sectionName: "Daily Challenge",
      date: new Date().toISOString(),
      mode: "daily",
    });

    const newLevel = getCareerLevel(newState.player.xp);
    const leveledUp = newLevel.level > prevLevel.level;

    const params = new URLSearchParams({
      score: score.toString(),
      total: questions.length.toString(),
      points: points.toString(),
      bestStreak: bestStreak.toString(),
      section: "daily",
      sectionName: "Daily Challenge",
      mode: "daily",
      xp: xpResult.totalXp.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      leveledUp: leveledUp ? newLevel.level.toString() : "",
    });
    router.push(`/results?${params.toString()}`);
  }

  if (locked) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4 max-w-lg mx-auto text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-2xl font-black text-gold mb-2">Challenge Complete!</h1>
        <p className="text-text-secondary mb-4">Come back tomorrow for a new challenge.</p>
        <p className="font-mono text-gold text-lg mb-8">Next in {countdown}</p>
        <Link href="/" className="px-8 py-3 rounded-xl font-bold border border-gold/30 text-gold hover:bg-gold-dim transition-all">
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
    if (choice === currentQuestion.a) {
      return choice === selectedAnswer ? "selected-correct" as const : "reveal-correct" as const;
    }
    if (choice === selectedAnswer) return "selected-wrong" as const;
    return "disabled" as const;
  }

  return (
    <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
      {/* Top bar - gold themed */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="text-sm font-semibold text-gold">Daily Challenge</span>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={streak} />
          <div className="font-mono text-sm font-bold text-gold">{points}</div>
        </div>
      </div>

      <ProgressBar progress={((currentIndex + 1) / questions.length) * 100} color="#f59e0b" />

      <div className="flex items-center justify-between mt-4 mb-6">
        <TimerRing timeRemaining={timeRemaining} totalTime={TIMER_SECONDS} />
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-text-primary">
            {score}/{currentIndex + (selectedAnswer !== null ? 1 : 0)}
          </div>
          <div className="text-text-dim text-xs font-mono">{currentIndex + 1}/{questions.length}</div>
        </div>
      </div>

      <div className="relative mb-6">
        <QuestionCard question={currentQuestion.q} questionNumber={currentIndex + 1} totalQuestions={questions.length} />
        {pointsPopup && (
          <div className="absolute -top-2 right-0 animate-points-fly font-mono font-bold text-gold text-lg">+{pointsPopup}</div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        {shuffledChoices.map((choice) => (
          <ChoiceButton key={choice} text={choice} state={getChoiceState(choice)} onClick={() => handleSelectAnswer(choice)} sectionColor="#f59e0b" />
        ))}
      </div>

      {showExplanation && selectedAnswer !== null && (
        <ExplanationCard explanation={currentQuestion.e} correct={false} correctAnswer={currentQuestion.a} />
      )}
      {selectedAnswer !== null && selectedAnswer === currentQuestion.a && (
        <ExplanationCard explanation={currentQuestion.e} correct={true} correctAnswer={currentQuestion.a} />
      )}
    </main>
  );
}
