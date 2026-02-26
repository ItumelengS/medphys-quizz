"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import type { DbQuestion, DbTournament } from "@/lib/types";
import TimerRing from "@/components/TimerRing";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";
import ExplanationCard from "@/components/ExplanationCard";
import StreakBadge from "@/components/StreakBadge";
import ProgressBar from "@/components/ProgressBar";

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

interface AnswerEntry {
  questionId: string;
  selectedAnswer: string | null;
  timeRemaining: number;
}

interface RoundResult {
  points_earned: number;
  fire_multiplier: number;
  fire_streak: number;
  berserk_bonus: boolean;
  accuracy: number;
  score: number;
  total: number;
}

export default function TournamentPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const berserk = searchParams.get("berserk") === "true";

  const [tournament, setTournament] = useState<DbTournament | null>(null);
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answersLog, setAnswersLog] = useState<AnswerEntry[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [pointsPopup, setPointsPopup] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = tournament ? TOURNAMENT_TYPES[tournament.type] : null;
  const timerSeconds = config
    ? berserk
      ? Math.ceil(config.timerSeconds / 2)
      : config.timerSeconds
    : 15;

  // Fetch tournament + questions
  useEffect(() => {
    fetch(`/api/tournaments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tournament) setTournament(data.tournament);
      });

    fetch(`/api/tournaments/${id}/questions`)
      .then((r) => r.json())
      .then((qs) => {
        if (Array.isArray(qs)) {
          setQuestions(qs);
          if (qs.length > 0) setShuffledChoices(shuffleArray(qs[0].choices));
        }
      });
  }, [id]);

  const currentQuestion = questions[currentIndex];

  // Timer
  useEffect(() => {
    if (!currentQuestion || selectedAnswer !== null || isFinished) return;

    setTimeRemaining(timerSeconds);
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
  }, [currentIndex, currentQuestion, isFinished, timerSeconds]);

  const handleTimeout = useCallback(() => {
    if (!currentQuestion || selectedAnswer !== null) return;
    processAnswer(null, false, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, selectedAnswer]);

  function processAnswer(selected: string | null, correct: boolean, time: number) {
    if (timerRef.current) clearInterval(timerRef.current);

    const newStreak = correct ? streak + 1 : 0;

    setSelectedAnswer(selected);
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    if (correct) {
      setScore((s) => s + 1);
      const tb = Math.floor(time) * 10;
      setPointsPopup(100 + tb);
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

    setAnswersLog((a) => [
      ...a,
      { questionId: currentQuestion.id, selectedAnswer: selected, timeRemaining: time },
    ]);

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
      finishRound();
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShuffledChoices(shuffleArray(questions[nextIndex].choices));
  }

  async function finishRound() {
    setIsFinished(true);
    setSubmitting(true);

    // Send selected answers — server re-validates correctness & caps time bonus
    const res = await fetch(`/api/tournaments/${id}/round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        berserk,
        answers: answersLog,
      }),
    });

    const data = await res.json();
    setRoundResult(data);
    setSubmitting(false);
  }

  function resetForNewRound() {
    setIsFinished(false);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setAnswersLog([]);
    setRoundResult(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setSubmitting(false);

    fetch(`/api/tournaments/${id}/questions`)
      .then((r) => r.json())
      .then((qs) => {
        if (Array.isArray(qs)) {
          setQuestions(qs);
          if (qs.length > 0) setShuffledChoices(shuffleArray(qs[0].choices));
        }
      });
  }

  if (!session) return null;

  if (questions.length === 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-secondary">
        Loading...
      </div>
    );
  }

  const typeColor = config
    ? tournament?.type === "blitz"
      ? "#dc2626"
      : tournament?.type === "rapid"
        ? "#2563eb"
        : "#eab308"
    : "#dc2626";

  // Round finished — show server-validated summary
  if (isFinished) {
    const serverScore = roundResult?.score ?? score;
    const serverTotal = roundResult?.total ?? questions.length;
    const accuracy = roundResult?.accuracy ?? (serverTotal > 0 ? Math.round((serverScore / serverTotal) * 100) : 0);

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto">
        <div className="animate-fade-up text-center mb-8">
          <h1 className="text-3xl font-black text-text-primary mb-2">Round Complete</h1>
          <div className="w-12 h-1 mx-auto" style={{ background: typeColor }} />
        </div>

        <div className="animate-fade-up stagger-1 p-6 rounded-none border-2 border-surface-border bg-surface mb-6">
          {submitting ? (
            <div className="text-text-dim text-center text-sm py-4">Submitting...</div>
          ) : roundResult ? (
            <>
              <div className="text-center mb-4">
                <div className="text-4xl font-mono font-black text-text-primary">
                  {serverScore}/{serverTotal}
                </div>
                <div className="text-text-secondary text-sm">{accuracy}% accuracy</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Points earned</span>
                  <span className="font-mono font-bold text-bauhaus-blue">{roundResult.points_earned}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Fire multiplier</span>
                  <span className="font-mono font-bold text-bauhaus-red">{roundResult.fire_multiplier}x</span>
                </div>
                {roundResult.fire_streak > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">🔥 Fire streak</span>
                    <span className="font-mono font-bold">{roundResult.fire_streak}</span>
                  </div>
                )}
                {berserk && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">💀 Berserk bonus</span>
                    <span className={`font-mono font-bold ${roundResult.berserk_bonus ? "text-success" : "text-bauhaus-red"}`}>
                      {roundResult.berserk_bonus ? "1.5x applied" : "Failed (<60%)"}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="animate-fade-up stagger-2 space-y-3">
          <button
            onClick={resetForNewRound}
            className="w-full py-3 rounded-none border-2 font-black text-sm uppercase tracking-widest"
            style={{ borderColor: typeColor, background: `${typeColor}14` }}
          >
            Play Another Round
          </button>
          <button
            onClick={() => router.push(`/tournaments/${id}`)}
            className="w-full py-3 rounded-none border-2 border-surface-border font-bold text-sm uppercase tracking-widest text-text-secondary"
          >
            Back to Leaderboard
          </button>
        </div>
      </main>
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
          <span className="text-lg">{config?.icon || "⚡"}</span>
          <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
            {config?.label || "Arena"}
          </span>
          {berserk && (
            <span className="text-xs font-bold text-bauhaus-red border border-bauhaus-red px-1.5 py-0.5 uppercase tracking-wider">
              💀 Berserk
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={streak} />
          <div className="font-mono text-sm font-bold" style={{ color: typeColor }}>
            {score}/{currentIndex + (selectedAnswer !== null ? 1 : 0)}
          </div>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar
        progress={((currentIndex + 1) / questions.length) * 100}
        color={typeColor}
      />

      {/* Timer & Score */}
      <div className="flex items-center justify-between mt-4 mb-6">
        <TimerRing timeRemaining={timeRemaining} totalTime={timerSeconds} />
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
          <div className="absolute -top-2 right-0 animate-points-fly font-mono font-bold text-lg" style={{ color: typeColor }}>
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
            sectionColor={typeColor}
          />
        ))}
      </div>

      {/* Explanation on wrong answer */}
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
