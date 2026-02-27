"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  calculateSuddenDeathPoints,
  getAdaptiveTimer,
  getStreakMultiplier,
} from "@/lib/scoring";
import type { DbQuestion, DbTournament } from "@/lib/types";
import TimerRing from "@/components/TimerRing";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";
import StreakBadge from "@/components/StreakBadge";

const BASE_TIMER = 8;
const VICTORY_THRESHOLD = 25;
const GAUNTLET_START = 21;
const ADVANCE_DELAY = 600;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type GamePhase = "loading" | "ready" | "playing" | "dead" | "victory";

const TAUNTS = [
  "That's it? Really?",
  "My grandmother knows more physics than you.",
  "Were you even trying?",
  "The linac has more brain cells.",
  "Pathetic. Go read a textbook.",
  "You call yourself a physicist?",
  "Even the phantom scored better.",
  "I've seen better from a first-year.",
  "The ion chamber is embarrassed for you.",
  "Cobalt-60 decayed faster than your run.",
  "Did you study or just guess?",
  "Your dose distribution is as flat as your score.",
  "The QA test failed. YOU failed.",
  "Not even ALARA can save that performance.",
  "Your career just got a negative weighting factor.",
  "That was statistically worse than random.",
  "The ICRP recommends you stop playing.",
  "Bragg peak? More like bragging about nothing.",
];

const VICTORY_TAUNTS = [
  "Fine. You survived. Don't let it go to your head.",
  "Lucky. Do it again, I dare you.",
  "The reaper let you off easy this time.",
  "Acceptable. Barely.",
  "You beat death. Death wants a rematch.",
];

function getTaunt(score: number): string {
  if (score === 0) return "You didn't even answer one. Wow.";
  if (score <= 3) return TAUNTS[Math.floor(Math.random() * 6)];
  if (score <= 10) return TAUNTS[6 + Math.floor(Math.random() * 6)];
  return TAUNTS[12 + Math.floor(Math.random() * (TAUNTS.length - 12))];
}

function getVictoryTaunt(): string {
  return VICTORY_TAUNTS[Math.floor(Math.random() * VICTORY_TAUNTS.length)];
}

interface RoundResult {
  points_earned: number;
  fire_multiplier: number;
  fire_streak: number;
  berserk_bonus: boolean;
  accuracy: number;
  score: number;
  total: number;
  survived: boolean;
}

export default function TournamentSuddenDeathPage({
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
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [answersLog, setAnswersLog] = useState<{ questionId: string; selectedAnswer: string | null; timeRemaining: number }[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(BASE_TIMER);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [pointsPopup, setPointsPopup] = useState<number | null>(null);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timerBase = berserk ? Math.ceil(BASE_TIMER / 2) : BASE_TIMER;

  // Fetch tournament info
  useEffect(() => {
    fetch(`/api/tournaments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tournament) {
          setTournament(data.tournament);
        }
      });
  }, [id]);

  async function fetchQuestions() {
    const normalRes = await fetch(`/api/questions?shuffle=true&limit=50`);
    const normalQs: DbQuestion[] = await normalRes.json();
    const normalPool = normalQs.slice(0, GAUNTLET_START - 1);
    const normalIds = normalPool.map((q) => q.id);

    const hardRes = await fetch(
      `/api/questions/hard?limit=${VICTORY_THRESHOLD - GAUNTLET_START + 1}&exclude=${normalIds.join(",")}`
    );
    const hardQs: DbQuestion[] = await hardRes.json();

    const combined = [...normalPool, ...hardQs];
    setQuestions(combined);
    if (combined.length > 0) setShuffledChoices(shuffleArray(combined[0].choices));
    return combined;
  }

  useEffect(() => {
    fetchQuestions().then(() => setPhase("ready"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentQuestion = questions[currentIndex];
  const correctCount = answersLog.filter((a) => {
    const q = questions.find((q) => q.id === a.questionId);
    return q && a.selectedAnswer === q.answer;
  }).length;

  const currentTimerTotal = currentQuestion
    ? getAdaptiveTimer(timerBase, correctCount, false)
    : timerBase;

  // Timer
  useEffect(() => {
    if (phase !== "playing" || !currentQuestion || selectedAnswer !== null) return;

    setTimeRemaining(currentTimerTotal);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current!);
          handleDeath();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, phase, currentQuestion, currentTimerTotal]);

  const handleDeath = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
    setShakeScreen(true);
    setTimeout(() => setShakeScreen(false), 500);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([50, 100, 50, 100, 50]);
    }
    setPhase("dead");
  }, []);

  function handleSelectAnswer(choice: string) {
    if (selectedAnswer !== null || !currentQuestion || phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const correct = choice === currentQuestion.answer;
    const newStreak = correct ? streak + 1 : 0;
    const earned = calculateSuddenDeathPoints(correct, correct ? newStreak : 0);

    setSelectedAnswer(choice);
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);

    setAnswersLog((a) => [
      ...a,
      { questionId: currentQuestion.id, selectedAnswer: choice, timeRemaining },
    ]);

    if (!correct) {
      handleDeath();
      return;
    }

    setPoints((p) => p + earned);
    setPointsPopup(earned);
    setTimeout(() => setPointsPopup(null), 600);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }

    if (correctCount + 1 >= VICTORY_THRESHOLD) {
      setPhase("victory");
      return;
    }

    advanceRef.current = setTimeout(() => advance(), ADVANCE_DELAY);
  }

  function advance() {
    if (currentIndex + 1 >= questions.length) {
      setPhase("victory");
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setShuffledChoices(shuffleArray(questions[nextIndex].choices));
  }

  async function startGame() {
    setCurrentIndex(0);
    setStreak(0);
    setBestStreak(0);
    setPoints(0);
    setAnswersLog([]);
    setSelectedAnswer(null);
    setRoundResult(null);
    setSubmitting(false);
    const qs = await fetchQuestions();
    if (qs.length > 0) setShuffledChoices(shuffleArray(qs[0].choices));
    setPhase("playing");
  }

  async function submitRound() {
    if (submitting) return;
    setSubmitting(true);

    const res = await fetch(`/api/tournaments/${id}/sudden-death-round`, {
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

  // Auto-submit when game ends
  useEffect(() => {
    if ((phase === "dead" || phase === "victory") && !roundResult && !submitting) {
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

  const typeColor = "#991b1b";

  // Death screen
  if (phase === "dead") {
    const finalScore = correctCount;
    return (
      <main className={`min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center ${shakeScreen ? "animate-shake" : ""}`}>
        <span className="text-8xl mb-4">💀</span>
        <h1 className="text-4xl font-black text-bauhaus-red mb-2">DEAD</h1>
        <div className="w-16 h-1 bg-bauhaus-red mx-auto mb-4" />
        <div className="text-bauhaus-red/80 text-sm italic text-center mb-4 max-w-xs">
          &ldquo;{getTaunt(finalScore)}&rdquo;
        </div>
        <div className="text-text-secondary text-sm mb-2">
          You survived <span className="font-bold text-text-primary">{finalScore}</span> question{finalScore !== 1 ? "s" : ""}
        </div>

        {submitting ? (
          <div className="text-text-dim text-sm mb-6">Submitting round...</div>
        ) : roundResult ? (
          <div className="w-full max-w-xs p-4 border-2 border-surface-border bg-surface mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Points earned</span>
              <span className="font-mono font-bold text-bauhaus-red">{roundResult.points_earned}</span>
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
                  {roundResult.berserk_bonus ? "1.5x applied" : "Failed (<15 survived)"}
                </span>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="px-6 py-3 rounded-none font-bold text-white bg-bauhaus-red hover:opacity-90 active:scale-95 transition-all"
          >
            Try Again
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

  // Victory screen
  if (phase === "victory") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-8xl mb-4">👑</span>
        <h1 className="text-4xl font-black text-bauhaus-yellow mb-2">SURVIVED</h1>
        <div className="w-16 h-1 bg-bauhaus-yellow mx-auto mb-4" />
        <div className="text-bauhaus-yellow/70 text-sm italic text-center mb-3 max-w-xs">
          &ldquo;{getVictoryTaunt()}&rdquo;
        </div>

        {submitting ? (
          <div className="text-text-dim text-sm mb-6">Submitting round...</div>
        ) : roundResult ? (
          <div className="w-full max-w-xs p-4 border-2 border-surface-border bg-surface mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Points earned</span>
              <span className="font-mono font-bold text-bauhaus-yellow">{roundResult.points_earned}</span>
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
                  {roundResult.berserk_bonus ? "1.5x applied" : "Failed (<15 survived)"}
                </span>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="px-6 py-3 rounded-none font-bold text-black bg-bauhaus-yellow hover:opacity-90 active:scale-95 transition-all"
          >
            Play Again
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

  // Ready screen
  if (phase === "ready") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col">
        <button onClick={() => router.push(`/tournaments/${id}`)} className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary mb-6 text-left">
          ← Back to Tournament
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-7xl mb-6">💀</span>
          <h1 className="text-4xl font-black text-bauhaus-red mb-2">SUDDEN DEATH</h1>
          <div className="w-16 h-1 bg-bauhaus-red mx-auto mb-4" />
          <p className="text-text-secondary text-sm font-light mb-4 max-w-xs">
            One wrong answer and you&apos;re dead. Survive {VICTORY_THRESHOLD} questions to win.
          </p>
          {berserk && (
            <div className="text-bauhaus-red text-xs font-bold uppercase tracking-wider mb-4 border border-bauhaus-red px-3 py-1">
              💀 Berserk Mode — {timerBase}s timer
            </div>
          )}
          <div className="flex flex-col gap-2 text-xs text-text-dim mb-8">
            <div>1 life · {timerBase}s adaptive timer · Tournament round</div>
            <div className="text-bauhaus-red/70">Last 5 questions are your hardest — the gauntlet.</div>
          </div>
          <button
            onClick={startGame}
            disabled={questions.length === 0}
            className="px-8 py-3.5 rounded-none font-bold text-white bg-bauhaus-red hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {questions.length === 0 ? "Loading..." : "Enter the Arena"}
          </button>
        </div>
      </main>
    );
  }

  // Playing
  if (!currentQuestion) return null;

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

  const streakMult = getStreakMultiplier(streak);

  return (
    <main
      className={`min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto ${shakeScreen ? "animate-shake" : ""}`}
      style={{ background: `rgba(220, 38, 38, ${Math.min(0.03 + correctCount * 0.005, 0.12)})` }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">💀</span>
          <span className="text-sm font-bold text-bauhaus-red uppercase tracking-wider">
            Sudden Death
          </span>
          {berserk && (
            <span className="text-xs font-bold text-bauhaus-red border border-bauhaus-red px-1.5 py-0.5 uppercase tracking-wider">
              Berserk
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={streak} />
          <div className="font-mono text-sm font-bold text-bauhaus-red">{points}</div>
        </div>
      </div>

      {/* Progress toward 25 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-text-dim mb-1">
          <span>{correctCount}/{VICTORY_THRESHOLD} to survive</span>
          {correctCount >= GAUNTLET_START - 1 ? (
            <span className="text-bauhaus-red font-bold uppercase tracking-wider animate-pulse">
              ⚠ Gauntlet
            </span>
          ) : streakMult > 1 ? (
            <span className="text-bauhaus-red font-mono">{streakMult}x multiplier</span>
          ) : null}
        </div>
        <div className="w-full h-1.5 bg-surface rounded-none overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(correctCount / VICTORY_THRESHOLD) * 100}%`,
              background: correctCount >= GAUNTLET_START - 1 ? "#7f1d1d" : "#dc2626",
            }}
          />
        </div>
      </div>

      {/* Timer & Score */}
      <div className="flex items-center justify-between mt-2 mb-6">
        <TimerRing timeRemaining={timeRemaining} totalTime={currentTimerTotal} />
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-text-primary">
            {correctCount}
          </div>
          <div className="text-text-dim text-xs font-mono">survived</div>
        </div>
      </div>

      {/* Question */}
      <div className="relative mb-6">
        <QuestionCard
          question={currentQuestion.question}
          questionNumber={correctCount + 1}
          totalQuestions={VICTORY_THRESHOLD}
        />
        {pointsPopup && (
          <div className="absolute -top-2 right-0 animate-points-fly font-mono font-bold text-bauhaus-red text-lg">
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
            sectionColor="#dc2626"
          />
        ))}
      </div>
    </main>
  );
}
