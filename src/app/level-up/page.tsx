"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getCareerLevel, getConfirmedCareerLevel, CAREER_LEVELS } from "@/lib/scoring";
import { parseInventory } from "@/lib/powerups";
import type { DbQuestion, PowerUpInventory, CareerLevel } from "@/lib/types";
import { POWERUP_INFO } from "@/lib/types";
import TimerRing from "@/components/TimerRing";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar from "@/components/ProgressBar";
import LevelUpModal from "@/components/LevelUpModal";

const TIMER_SECONDS = 12;
const TIME_FREEZE_DURATION = 5;

type ExamPhase = "loading" | "pre-exam" | "quiz" | "success" | "fail";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function LevelUpExamPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [phase, setPhase] = useState<ExamPhase>("loading");
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [inventory, setInventory] = useState<PowerUpInventory>({ fifty_fifty: 0, time_freeze: 0 });
  const [powerupsUsed, setPowerupsUsed] = useState<PowerUpInventory>({ fifty_fifty: 0, time_freeze: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [eliminatedChoices, setEliminatedChoices] = useState<Set<string>>(new Set());
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<{ question: DbQuestion; selected: string | null } | null>(null);
  const [targetLevel, setTargetLevel] = useState<CareerLevel | null>(null);
  const [userXp, setUserXp] = useState(0);
  const [fiftyFiftyUsedThisExam, setFiftyFiftyUsedThisExam] = useState(false);
  const [timeFreezeUsedThisExam, setTimeFreezeUsedThisExam] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch exam data
  useEffect(() => {
    if (!session) return;
    fetch("/api/level-up/questions")
      .then((r) => r.json())
      .then((data) => {
        if (data.questions?.length > 0) {
          setQuestions(data.questions);
          setInventory(parseInventory(data.powerups));
          setUserXp(data.xp || 0);
          const confirmed = session.user?.xp !== undefined
            ? getCareerLevel(data.xp)
            : CAREER_LEVELS[0];
          // Target is the next level after confirmed
          // We need confirmed_level from the API — for now derive from the context
          setPhase("pre-exam");
        }
      });
  }, [session]);

  // Determine target level
  useEffect(() => {
    if (!session) return;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        const confirmedLevel = data.profile?.confirmed_level || 1;
        const next = CAREER_LEVELS.find((l) => l.level === confirmedLevel + 1);
        if (next) setTargetLevel(next);
      });
  }, [session]);

  const currentQuestion = questions[currentIndex];

  // Timer
  useEffect(() => {
    if (phase !== "quiz" || !currentQuestion || selectedAnswer !== null) return;

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
  }, [currentIndex, phase, currentQuestion]);

  const handleTimeout = useCallback(() => {
    if (!currentQuestion || selectedAnswer !== null) return;
    failExam(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, selectedAnswer]);

  function failExam(selected: string | null) {
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedAnswer(selected);
    setFailedQuestion({ question: currentQuestion, selected });
    // Submit failure
    fetch("/api/level-up/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passed: false, powerupsUsed }),
    });
    setTimeout(() => setPhase("fail"), 1500);
  }

  function handleSelectAnswer(choice: string) {
    if (selectedAnswer !== null || !currentQuestion || phase !== "quiz") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const correct = choice === currentQuestion.answer;
    setSelectedAnswer(choice);

    if (!correct) {
      failExam(choice);
      return;
    }

    setScore((s) => s + 1);

    // Advance after delay
    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        // All 10 correct!
        handleExamPassed();
      } else {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setSelectedAnswer(null);
        setShuffledChoices(shuffleArray(questions[nextIdx].choices));
        setEliminatedChoices(new Set());
        setTimeFrozen(false);
      }
    }, 800);
  }

  function handleExamPassed() {
    fetch("/api/level-up/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passed: true, powerupsUsed }),
    });
    setPhase("success");
  }

  function useFiftyFifty() {
    if (fiftyFiftyUsedThisExam || inventory.fifty_fifty <= 0 || !currentQuestion || selectedAnswer !== null) return;

    const wrongChoices = shuffledChoices.filter((c) => c !== currentQuestion.answer && !eliminatedChoices.has(c));
    // Eliminate 2 wrong answers
    const toEliminate = shuffleArray(wrongChoices).slice(0, 2);
    setEliminatedChoices(new Set(toEliminate));
    setFiftyFiftyUsedThisExam(true);
    setPowerupsUsed((prev) => ({ ...prev, fifty_fifty: prev.fifty_fifty + 1 }));
    setInventory((prev) => ({ ...prev, fifty_fifty: prev.fifty_fifty - 1 }));
  }

  function useTimeFreeze() {
    if (timeFreezeUsedThisExam || inventory.time_freeze <= 0 || !currentQuestion || selectedAnswer !== null || timeFrozen) return;

    // Pause the timer
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeFrozen(true);
    setTimeFreezeUsedThisExam(true);
    setPowerupsUsed((prev) => ({ ...prev, time_freeze: prev.time_freeze + 1 }));
    setInventory((prev) => ({ ...prev, time_freeze: prev.time_freeze - 1 }));

    // Resume after 5 seconds
    freezeTimerRef.current = setTimeout(() => {
      setTimeFrozen(false);
      // Restart timer from where it was
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
    }, TIME_FREEZE_DURATION * 1000);
  }

  function startExam() {
    setPhase("quiz");
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setPowerupsUsed({ fifty_fifty: 0, time_freeze: 0 });
    setFiftyFiftyUsedThisExam(false);
    setTimeFreezeUsedThisExam(false);
    setEliminatedChoices(new Set());
    setTimeFrozen(false);
    if (questions.length > 0) {
      setShuffledChoices(shuffleArray(questions[0].choices));
    }
  }

  function retryExam() {
    // Re-fetch questions for a fresh attempt
    fetch("/api/level-up/questions")
      .then((r) => r.json())
      .then((data) => {
        if (data.questions?.length > 0) {
          setQuestions(data.questions);
          setInventory(parseInventory(data.powerups));
          setPhase("pre-exam");
          setFailedQuestion(null);
        }
      });
  }

  // Loading
  if (phase === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-secondary">
        Loading...
      </div>
    );
  }

  // Pre-Exam Screen
  if (phase === "pre-exam") {
    return (
      <main className="min-h-dvh px-4 pt-8 pb-8 max-w-lg mx-auto">
        <div className="animate-fade-up text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 border-4 border-bauhaus-yellow rounded-full mb-4">
            <span className="text-4xl">{targetLevel?.icon || "🎯"}</span>
          </div>
          <h1 className="text-3xl font-black text-bauhaus-yellow mb-2 uppercase tracking-widest">
            Level-Up Exam
          </h1>
          <p className="text-text-secondary font-light mb-1">
            Prove you&apos;re ready to become
          </p>
          <p className="text-2xl font-black text-bauhaus-blue">
            {targetLevel?.title || "Next Level"}
          </p>
        </div>

        {/* Rules */}
        <div className="animate-fade-up stagger-1 bg-surface border-2 border-surface-border border-l-4 border-l-bauhaus-red p-4 mb-6">
          <div className="text-sm font-bold text-text-primary mb-2 uppercase tracking-wider">Rules</div>
          <ul className="text-sm text-text-secondary space-y-1 font-light">
            <li>10 challenging questions</li>
            <li>12 second timer per question</li>
            <li>100% accuracy required — one wrong = fail</li>
            <li>Power-ups only consumed if used</li>
          </ul>
        </div>

        {/* Power-ups */}
        <div className="animate-fade-up stagger-2 bg-surface border-2 border-surface-border border-l-4 border-l-bauhaus-blue p-4 mb-8">
          <div className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Your Power-Ups</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border-2 border-surface-border text-center">
              <div className="text-2xl mb-1">{POWERUP_INFO.fifty_fifty.icon}</div>
              <div className="text-xs font-bold text-text-primary">{POWERUP_INFO.fifty_fifty.name}</div>
              <div className="text-xs text-text-dim mt-1">{POWERUP_INFO.fifty_fifty.description}</div>
              <div className="font-mono text-lg font-bold text-bauhaus-blue mt-1">
                {inventory.fifty_fifty}
              </div>
            </div>
            <div className="p-3 border-2 border-surface-border text-center">
              <div className="text-2xl mb-1">{POWERUP_INFO.time_freeze.icon}</div>
              <div className="text-xs font-bold text-text-primary">{POWERUP_INFO.time_freeze.name}</div>
              <div className="text-xs text-text-dim mt-1">{POWERUP_INFO.time_freeze.description}</div>
              <div className="font-mono text-lg font-bold text-bauhaus-blue mt-1">
                {inventory.time_freeze}
              </div>
            </div>
          </div>
        </div>

        {/* Begin Button */}
        <div className="animate-fade-up stagger-3">
          <button
            onClick={startExam}
            className="w-full py-4 rounded-none font-bold text-white text-lg uppercase tracking-wider transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#eab308" }}
          >
            Begin Exam
          </button>
        </div>
      </main>
    );
  }

  // Quiz Phase
  if (phase === "quiz" && currentQuestion) {
    function getChoiceState(choice: string) {
      if (eliminatedChoices.has(choice)) return "disabled" as const;
      if (selectedAnswer === null) return "idle" as const;
      if (choice === currentQuestion.answer) {
        return choice === selectedAnswer ? "selected-correct" as const : "reveal-correct" as const;
      }
      if (choice === selectedAnswer) return "selected-wrong" as const;
      return "disabled" as const;
    }

    return (
      <main className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span className="text-sm font-bold text-bauhaus-yellow uppercase tracking-wider">Level-Up Exam</span>
          </div>
          <div className="font-mono text-sm font-bold text-bauhaus-blue">
            {score}/{currentIndex + (selectedAnswer !== null ? 1 : 0)}
          </div>
        </div>

        <ProgressBar progress={((currentIndex + 1) / questions.length) * 100} color="#eab308" />

        {/* Timer & Power-ups */}
        <div className="flex items-center justify-between mt-4 mb-4">
          <div className="relative">
            <TimerRing timeRemaining={timeRemaining} totalTime={TIMER_SECONDS} />
            {timeFrozen && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-bauhaus-blue uppercase tracking-wider animate-pulse">
                frozen
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={useFiftyFifty}
              disabled={fiftyFiftyUsedThisExam || inventory.fifty_fifty <= 0 || selectedAnswer !== null}
              className={`px-3 py-2 border-2 rounded-none text-sm font-bold transition-all ${
                fiftyFiftyUsedThisExam || inventory.fifty_fifty <= 0
                  ? "border-surface-border text-text-dim opacity-40"
                  : "border-bauhaus-yellow text-bauhaus-yellow hover:bg-bauhaus-yellow/10"
              }`}
            >
              {POWERUP_INFO.fifty_fifty.icon} {inventory.fifty_fifty}
            </button>
            <button
              onClick={useTimeFreeze}
              disabled={timeFreezeUsedThisExam || inventory.time_freeze <= 0 || selectedAnswer !== null || timeFrozen}
              className={`px-3 py-2 border-2 rounded-none text-sm font-bold transition-all ${
                timeFreezeUsedThisExam || inventory.time_freeze <= 0
                  ? "border-surface-border text-text-dim opacity-40"
                  : "border-bauhaus-blue text-bauhaus-blue hover:bg-bauhaus-blue/10"
              }`}
            >
              {POWERUP_INFO.time_freeze.icon} {inventory.time_freeze}
            </button>
          </div>
        </div>

        {/* Must get all correct indicator */}
        <div className="text-center mb-4">
          <span className="text-xs font-mono text-bauhaus-red uppercase tracking-wider">
            {currentIndex + 1}/{questions.length} — 100% required
          </span>
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
        <div className="grid grid-cols-1 gap-3 mb-4">
          {shuffledChoices.map((choice) => (
            <ChoiceButton
              key={choice}
              text={choice}
              state={getChoiceState(choice)}
              onClick={() => {
                if (!eliminatedChoices.has(choice)) handleSelectAnswer(choice);
              }}
              sectionColor="#eab308"
            />
          ))}
        </div>
      </main>
    );
  }

  // Success Screen
  if (phase === "success") {
    return (
      <LevelUpModal
        level={targetLevel || CAREER_LEVELS[0]}
        onClose={() => router.push("/")}
      />
    );
  }

  // Fail Screen
  if (phase === "fail" && failedQuestion) {
    return (
      <main className="min-h-dvh px-4 pt-8 pb-8 max-w-lg mx-auto">
        <div className="animate-fade-up text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 border-4 border-bauhaus-red rounded-full mb-4">
            <span className="text-4xl">💪</span>
          </div>
          <h1 className="text-2xl font-black text-bauhaus-red mb-2 uppercase tracking-widest">
            Not Quite!
          </h1>
          <p className="text-text-secondary font-light">
            You got {score} out of {questions.length} before failing.
          </p>
          <p className="text-text-dim text-sm mt-1">Keep practicing and try again!</p>
        </div>

        {/* Failed question details */}
        <div className="animate-fade-up stagger-1 bg-surface border-2 border-surface-border border-l-4 border-l-bauhaus-red p-4 mb-6">
          <div className="text-sm font-bold text-bauhaus-red mb-2 uppercase tracking-wider">
            Question {currentIndex + 1} — Failed
          </div>
          <p className="text-text-primary text-sm mb-3">{failedQuestion.question.question}</p>
          {failedQuestion.selected && (
            <div className="text-sm mb-2">
              <span className="text-text-dim">Your answer: </span>
              <span className="text-bauhaus-red font-medium">{failedQuestion.selected}</span>
            </div>
          )}
          {!failedQuestion.selected && (
            <div className="text-sm mb-2 text-bauhaus-red">Time ran out!</div>
          )}
          <div className="text-sm mb-3">
            <span className="text-text-dim">Correct answer: </span>
            <span className="text-success font-medium">{failedQuestion.question.answer}</span>
          </div>
          <div className="text-sm text-text-secondary font-light border-t-2 border-surface-border pt-3">
            {failedQuestion.question.explanation}
          </div>
        </div>

        <div className="animate-fade-up stagger-2 flex flex-col gap-3">
          <button
            onClick={retryExam}
            className="w-full py-3.5 rounded-none font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#eab308" }}
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3.5 rounded-none font-bold text-text-primary border-2 border-surface-border hover:bg-surface transition-all active:scale-95"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  return null;
}
