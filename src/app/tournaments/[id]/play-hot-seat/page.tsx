"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  HOT_SEAT_PRIZE_LADDER,
  HOT_SEAT_SAFE_HAVENS,
  calculateHotSeatScore,
} from "@/lib/scoring";
import type { DbQuestion, DbTournament } from "@/lib/types";
import { generateAudiencePoll, generatePhoneResult, type AudiencePoll } from "@/lib/hot-seat-lifelines";
import TimerRing from "@/components/TimerRing";
import ChoiceButton from "@/components/ChoiceButton";
import QuestionCard from "@/components/QuestionCard";

const TOTAL_QUESTIONS = 15;
const ADVANCE_DELAY = 800;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatPrize(amount: number): string {
  if (amount >= 1000000) return "$1,000,000";
  if (amount >= 1000) return `$${(amount / 1000).toLocaleString()}k`;
  return `$${amount}`;
}

type GamePhase = "loading" | "ready" | "playing" | "walked" | "lost" | "won";
type Lifeline = "fifty-fifty" | "phone-a-friend" | "ask-the-audience";


interface RoundResult {
  points_earned: number;
  fire_multiplier: number;
  fire_streak: number;
  berserk_bonus: boolean;
  accuracy: number;
  score: number;
  total: number;
}

export default function TournamentHotSeatPage({
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
  const [answersLog, setAnswersLog] = useState<{ questionId: string; selectedAnswer: string | null; timeRemaining: number }[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [roundLimitError, setRoundLimitError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lifeline state
  const [usedLifelines, setUsedLifelines] = useState<Set<Lifeline>>(new Set());
  const [eliminatedChoices, setEliminatedChoices] = useState<Set<string>>(new Set());
  const [phoneExplanation, setPhoneExplanation] = useState<string | null>(null);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [audiencePoll, setAudiencePoll] = useState<AudiencePoll | null>(null);

  // Walk-away state
  const [walkedAway, setWalkedAway] = useState(false);
  const [wrongAnswerIndex, setWrongAnswerIndex] = useState<number | null>(null);
  const [finalPrize, setFinalPrize] = useState(0);

  // Determine timer from tournament config
  const configObj = tournament?.config as Record<string, number> | null;
  const baseTimer = configObj?.timerSeconds || 30;
  const timerTotal = berserk ? Math.ceil(baseTimer / 2) : baseTimer;

  // Fetch tournament info + round-limit check
  useEffect(() => {
    fetch(`/api/tournaments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tournament) setTournament(data.tournament);
        if (data.userRecord && data.userRecord.rounds_played >= 2 && !data.tiebreakerEligible) {
          setRoundLimitError("Round limit reached: you have played 2 rounds");
        } else if (data.userRecord && data.userRecord.rounds_played >= 3) {
          setRoundLimitError("Round limit reached: maximum 3 rounds played");
        }
      });
  }, [id]);

  // Fetch questions in 3 difficulty tiers
  const fetchQuestions = useCallback(async () => {
    const [easyRes, medRes, hardRes] = await Promise.all([
      fetch(`/api/questions?shuffle=true&limit=5&minDifficulty=1&maxDifficulty=4`),
      fetch(`/api/questions?shuffle=true&limit=5&minDifficulty=5&maxDifficulty=7`),
      fetch(`/api/questions?shuffle=true&limit=5&minDifficulty=8&maxDifficulty=10`),
    ]);

    let easy: DbQuestion[] = await easyRes.json();
    let medium: DbQuestion[] = await medRes.json();
    let hard: DbQuestion[] = await hardRes.json();

    // Fallback if not enough in a tier
    if (easy.length < 5) {
      const fallback = await fetch(`/api/questions?shuffle=true&limit=5`);
      const extra: DbQuestion[] = await fallback.json();
      const existingIds = new Set([...easy, ...medium, ...hard].map((q) => q.id));
      easy = [...easy, ...extra.filter((q) => !existingIds.has(q.id))].slice(0, 5);
    }
    if (medium.length < 5) {
      const fallback = await fetch(`/api/questions?shuffle=true&limit=5`);
      const extra: DbQuestion[] = await fallback.json();
      const existingIds = new Set([...easy, ...medium, ...hard].map((q) => q.id));
      medium = [...medium, ...extra.filter((q) => !existingIds.has(q.id))].slice(0, 5);
    }
    if (hard.length < 5) {
      const fallback = await fetch(`/api/questions?shuffle=true&limit=5`);
      const extra: DbQuestion[] = await fallback.json();
      const existingIds = new Set([...easy, ...medium, ...hard].map((q) => q.id));
      hard = [...hard, ...extra.filter((q) => !existingIds.has(q.id))].slice(0, 5);
    }

    const combined = [...easy.slice(0, 5), ...medium.slice(0, 5), ...hard.slice(0, 5)];
    setQuestions(combined);
    if (combined.length > 0) setShuffledChoices(shuffleArray(combined[0].choices));
    return combined;
  }, []);

  useEffect(() => {
    fetchQuestions().then(() => setPhase("ready"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentQuestion = questions[currentIndex];
  const correctCount = answersLog.filter((a) => {
    const q = questions.find((qu) => qu.id === a.questionId);
    return q && a.selectedAnswer === q.answer;
  }).length;

  // Timer
  useEffect(() => {
    if (phase !== "playing" || !currentQuestion || selectedAnswer !== null) return;

    setTimeRemaining(timerTotal);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current!);
          // Timeout = wrong answer
          handleWrongAnswer(currentIndex);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, phase, currentQuestion, timerTotal]);

  // Phone-a-friend countdown
  useEffect(() => {
    if (phoneCountdown <= 0) return;
    const iv = setInterval(() => {
      setPhoneCountdown((c) => {
        if (c <= 1) {
          setPhoneExplanation(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phoneCountdown]);

  const handleWrongAnswer = useCallback((questionIdx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
    setWrongAnswerIndex(questionIdx);
    const prize = calculateHotSeatScore(questionIdx - 1, false, questionIdx);
    setFinalPrize(prize);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([50, 100, 50, 100, 50]);
    }
    setPhase("lost");
  }, []);

  function handleSelectAnswer(choice: string) {
    if (selectedAnswer !== null || !currentQuestion || phase !== "playing") return;
    if (eliminatedChoices.has(choice)) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const correct = choice === currentQuestion.answer;
    setSelectedAnswer(choice);

    setAnswersLog((a) => [
      ...a,
      { questionId: currentQuestion.id, selectedAnswer: choice, timeRemaining },
    ]);

    if (!correct) {
      handleWrongAnswer(currentIndex);
      return;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }

    // Check if won all 15
    if (currentIndex + 1 >= TOTAL_QUESTIONS) {
      const prize = HOT_SEAT_PRIZE_LADDER[14];
      setFinalPrize(prize);
      setPhase("won");
      return;
    }

    advanceRef.current = setTimeout(() => advance(), ADVANCE_DELAY);
  }

  function advance() {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setEliminatedChoices(new Set());
    setPhoneExplanation(null);
    setAudiencePoll(null);
    if (questions[nextIndex]) {
      setShuffledChoices(shuffleArray(questions[nextIndex].choices));
    }
  }

  function handleWalkAway() {
    if (phase !== "playing" || selectedAnswer !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setWalkedAway(true);
    const prize = calculateHotSeatScore(currentIndex - 1, true, null);
    setFinalPrize(prize);
    setAnswersLog((a) => [
      ...a,
      { questionId: currentQuestion!.id, selectedAnswer: null, timeRemaining },
    ]);
    setPhase("walked");
  }

  // Lifeline handlers
  function useFiftyFifty() {
    if (usedLifelines.has("fifty-fifty") || !currentQuestion || selectedAnswer !== null) return;
    setUsedLifelines((s) => new Set(s).add("fifty-fifty"));

    const wrongChoices = shuffledChoices.filter((c) => c !== currentQuestion.answer && !eliminatedChoices.has(c));
    const toEliminate = shuffleArray(wrongChoices).slice(0, 2);
    setEliminatedChoices(new Set(toEliminate));
  }

  function usePhoneAFriend() {
    if (usedLifelines.has("phone-a-friend") || !currentQuestion || selectedAnswer !== null) return;
    setUsedLifelines((s) => new Set(s).add("phone-a-friend"));
    const result = generatePhoneResult(
      currentQuestion.answer,
      currentQuestion.explanation || "",
      shuffledChoices.filter((c) => !eliminatedChoices.has(c)),
      currentIndex
    );
    setPhoneExplanation(result.text);
    setPhoneCountdown(10);
  }

  function useAskTheAudience() {
    if (usedLifelines.has("ask-the-audience") || !currentQuestion || selectedAnswer !== null) return;
    setUsedLifelines((s) => new Set(s).add("ask-the-audience"));
    const available = shuffledChoices.filter((c) => !eliminatedChoices.has(c));
    const poll = generateAudiencePoll(currentQuestion.answer, available, currentIndex);
    setAudiencePoll(poll);
  }

  async function startGame() {
    // Check round limit before starting
    const detailRes = await fetch(`/api/tournaments/${id}`);
    const detail = await detailRes.json();
    if (detail.userRecord && detail.userRecord.rounds_played >= 2 && !detail.tiebreakerEligible) {
      setRoundLimitError("Round limit reached: you have played 2 rounds");
      return;
    }
    if (detail.userRecord && detail.userRecord.rounds_played >= 3) {
      setRoundLimitError("Round limit reached: maximum 3 rounds played");
      return;
    }

    setCurrentIndex(0);
    setAnswersLog([]);
    setSelectedAnswer(null);
    setRoundResult(null);
    setSubmitting(false);
    setUsedLifelines(new Set());
    setEliminatedChoices(new Set());
    setPhoneExplanation(null);
    setPhoneCountdown(0);
    setAudiencePoll(null);
    setWalkedAway(false);
    setWrongAnswerIndex(null);
    setFinalPrize(0);
    const qs = await fetchQuestions();
    if (qs.length > 0) setShuffledChoices(shuffleArray(qs[0].choices));
    setPhase("playing");
  }

  async function submitRound() {
    if (submitting) return;
    setSubmitting(true);

    const res = await fetch(`/api/tournaments/${id}/hot-seat-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        berserk,
        answers: answersLog,
        walkedAway,
        lifelinesUsed: Array.from(usedLifelines),
      }),
    });

    const data = await res.json();
    if (data.error) {
      setRoundLimitError(data.error);
      setSubmitting(false);
      return;
    }
    setRoundResult(data);
    setSubmitting(false);
  }

  // Auto-submit when game ends
  useEffect(() => {
    if ((phase === "lost" || phase === "walked" || phase === "won") && !roundResult && !submitting) {
      submitRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!session) return null;

  if (roundLimitError && phase !== "lost" && phase !== "walked" && phase !== "won") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-text-secondary text-sm mb-4">{roundLimitError}</div>
        <button
          onClick={() => router.push(`/tournaments/${id}`)}
          className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary"
        >
          Back to Tournament
        </button>
      </main>
    );
  }

  if (phase === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-secondary">
        Loading...
      </div>
    );
  }

  const accentColor = "#d97706";

  // Results screen (lost / walked / won)
  if (phase === "lost" || phase === "walked" || phase === "won") {
    const icon = phase === "won" ? "👑" : phase === "walked" ? "🚶" : "💔";
    const title = phase === "won" ? "CHAMPION!" : phase === "walked" ? "WALKED AWAY" : "WRONG ANSWER";
    const titleColor = phase === "won" ? "text-amber-400" : phase === "walked" ? "text-amber-600" : "text-red-500";

    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-8xl mb-4">{icon}</span>
        <h1 className={`text-4xl font-black ${titleColor} mb-2`}>{title}</h1>
        <div className="w-16 h-1 bg-amber-600 mx-auto mb-4" />

        <div className="text-3xl font-black text-amber-400 mb-2 font-mono">
          {formatPrize(finalPrize)}
        </div>
        <div className="text-text-secondary text-sm mb-1">
          {correctCount} of {TOTAL_QUESTIONS} correct
        </div>
        <div className="text-text-dim text-xs mb-4">
          Lifelines used: {usedLifelines.size}/3
        </div>

        {submitting ? (
          <div className="text-text-dim text-sm mb-6">Submitting round...</div>
        ) : roundResult ? (
          <div className="w-full max-w-xs p-4 border-2 border-surface-border bg-surface mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Points earned</span>
              <span className="font-mono font-bold text-amber-600">{roundResult.points_earned}</span>
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
                <span className={`font-mono font-bold ${roundResult.berserk_bonus ? "text-success" : "text-red-500"}`}>
                  {roundResult.berserk_bonus ? "1.5x applied" : "Failed"}
                </span>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/tournaments/${id}`)}
            className="px-6 py-3 rounded-none font-bold text-white bg-amber-600 hover:opacity-90 active:scale-95 transition-all"
          >
            Back to Tournament
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
          <span className="text-7xl mb-6">💰</span>
          <h1 className="text-4xl font-black text-amber-500 mb-2">HOT SEAT</h1>
          <div className="w-16 h-1 bg-amber-600 mx-auto mb-4" />
          <p className="text-text-secondary text-sm font-light mb-4 max-w-xs">
            Answer 15 escalating questions to win $1,000,000. Use lifelines wisely. Walk away to keep your prize.
          </p>
          {berserk && (
            <div className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-600 px-3 py-1">
              💀 Berserk Mode — {timerTotal}s timer
            </div>
          )}
          <div className="flex flex-col gap-2 text-xs text-text-dim mb-8">
            <div>{timerTotal}s per question · 3 lifelines · Safe havens at Q5 & Q10</div>
            <div className="text-amber-600/70">50:50 · Phone a Friend · Ask the Audience</div>
          </div>
          <button
            onClick={startGame}
            disabled={questions.length === 0}
            className="px-8 py-3.5 rounded-none font-bold text-white bg-amber-600 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {questions.length === 0 ? "Loading..." : "Let's Play"}
          </button>
        </div>
      </main>
    );
  }

  // Playing phase
  if (!currentQuestion) return null;

  function getChoiceState(choice: string) {
    if (eliminatedChoices.has(choice)) return "disabled" as const;
    if (selectedAnswer === null) return "idle" as const;
    if (choice === currentQuestion!.answer) {
      return choice === selectedAnswer
        ? ("selected-correct" as const)
        : ("reveal-correct" as const);
    }
    if (choice === selectedAnswer) return "selected-wrong" as const;
    return "disabled" as const;
  }

  const currentPrize = currentIndex > 0 ? HOT_SEAT_PRIZE_LADDER[currentIndex - 1] : 0;

  return (
    <main
      className="min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto"
      style={{ background: `rgba(217, 119, 6, ${Math.min(0.02 + currentIndex * 0.006, 0.1)})` }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <span className="text-sm font-bold text-amber-600 uppercase tracking-wider">
            Hot Seat
          </span>
          {berserk && (
            <span className="text-xs font-bold text-amber-600 border border-amber-600 px-1.5 py-0.5 uppercase tracking-wider">
              Berserk
            </span>
          )}
        </div>
        <div className="font-mono text-sm font-bold text-amber-500">
          {formatPrize(currentPrize)}
        </div>
      </div>

      {/* Prize ladder (compact) */}
      <div className="mb-3 p-2 border border-surface-border bg-surface/50 rounded-none">
        <div className="flex flex-wrap gap-1 justify-center">
          {HOT_SEAT_PRIZE_LADDER.map((prize, i) => {
            const isCurrent = i === currentIndex;
            const isPast = i < currentIndex;
            const isSafeHaven = HOT_SEAT_SAFE_HAVENS.includes(i);
            return (
              <div
                key={i}
                className={`text-[10px] font-mono px-1.5 py-0.5 transition-all ${
                  isCurrent
                    ? "bg-amber-600 text-white font-bold scale-110"
                    : isPast
                      ? "bg-amber-600/20 text-amber-600"
                      : "text-text-dim"
                } ${isSafeHaven && !isCurrent ? "border-b-2 border-amber-400" : ""}`}
              >
                {isSafeHaven ? "★" : ""}{formatPrize(prize)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lifelines */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          onClick={useFiftyFifty}
          disabled={usedLifelines.has("fifty-fifty") || selectedAnswer !== null}
          className={`px-3 py-1.5 text-xs font-bold rounded-none border transition-all ${
            usedLifelines.has("fifty-fifty")
              ? "border-surface-border text-text-dim line-through opacity-40"
              : "border-amber-600 text-amber-600 hover:bg-amber-600/10 active:scale-95"
          }`}
        >
          50:50
        </button>
        <button
          onClick={usePhoneAFriend}
          disabled={usedLifelines.has("phone-a-friend") || selectedAnswer !== null}
          className={`px-3 py-1.5 text-xs font-bold rounded-none border transition-all ${
            usedLifelines.has("phone-a-friend")
              ? "border-surface-border text-text-dim line-through opacity-40"
              : "border-amber-600 text-amber-600 hover:bg-amber-600/10 active:scale-95"
          }`}
        >
          📞 Phone
        </button>
        <button
          onClick={useAskTheAudience}
          disabled={usedLifelines.has("ask-the-audience") || selectedAnswer !== null}
          className={`px-3 py-1.5 text-xs font-bold rounded-none border transition-all ${
            usedLifelines.has("ask-the-audience")
              ? "border-surface-border text-text-dim line-through opacity-40"
              : "border-amber-600 text-amber-600 hover:bg-amber-600/10 active:scale-95"
          }`}
        >
          👥 Audience
        </button>
        <button
          onClick={handleWalkAway}
          disabled={selectedAnswer !== null}
          className="px-3 py-1.5 text-xs font-bold rounded-none border border-text-dim text-text-secondary hover:border-red-500 hover:text-red-500 transition-all active:scale-95 disabled:opacity-40"
        >
          🚶 Walk Away
        </button>
      </div>

      {/* Phone a Friend overlay */}
      {phoneExplanation && (
        <div className="mb-3 p-3 border-2 border-amber-600 bg-amber-600/10 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-amber-600 text-xs uppercase tracking-wider">📞 Friend says:</span>
            <span className="font-mono text-xs text-amber-600">{phoneCountdown}s</span>
          </div>
          <div className="text-text-secondary text-xs italic">&ldquo;{phoneExplanation}&rdquo;</div>
        </div>
      )}

      {/* Ask the Audience chart */}
      {audiencePoll && (
        <div className="mb-3 p-3 border-2 border-amber-600 bg-amber-600/10">
          <div className="font-bold text-amber-600 text-xs uppercase tracking-wider mb-2">👥 Audience Poll</div>
          <div className="space-y-1">
            {shuffledChoices
              .filter((c) => !eliminatedChoices.has(c))
              .map((choice) => (
                <div key={choice} className="flex items-center gap-2">
                  <div className="text-[10px] text-text-secondary truncate w-24">{choice.slice(0, 20)}</div>
                  <div className="flex-1 h-3 bg-surface rounded-none overflow-hidden">
                    <div
                      className="h-full bg-amber-600 transition-all"
                      style={{ width: `${audiencePoll[choice] || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-text-dim w-8 text-right">
                    {audiencePoll[choice] || 0}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Timer & current question value */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <TimerRing timeRemaining={timeRemaining} totalTime={timerTotal} />
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-amber-500">
            {formatPrize(HOT_SEAT_PRIZE_LADDER[currentIndex])}
          </div>
          <div className="text-text-dim text-xs font-mono">Q{currentIndex + 1} of {TOTAL_QUESTIONS}</div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-4">
        <QuestionCard
          question={currentQuestion.question}
          questionNumber={currentIndex + 1}
          totalQuestions={TOTAL_QUESTIONS}
        />
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 gap-3">
        {shuffledChoices.map((choice) => {
          const isEliminated = eliminatedChoices.has(choice);
          return (
            <div key={choice} className={isEliminated ? "opacity-20 pointer-events-none" : ""}>
              <ChoiceButton
                text={choice}
                state={getChoiceState(choice)}
                onClick={() => handleSelectAnswer(choice)}
                sectionColor={accentColor}
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
