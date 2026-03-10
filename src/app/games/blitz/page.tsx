"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { calculateBlitzScore, calculateXp, getStreakMultiplier } from "@/lib/scoring";
import type { DbQuestion, AnswerRecord } from "@/lib/types";

const QUESTION_TIME = 3;
const TOTAL_QUESTIONS = 30;
const ADVANCE_DELAY = 200;

interface BlitzStatement {
  questionId: string;
  questionText: string;
  claim: string;
  isTrue: boolean;
}

function generateStatements(questions: DbQuestion[]): BlitzStatement[] {
  return questions.map((q) => {
    const showCorrect = Math.random() < 0.5;
    if (showCorrect) {
      return {
        questionId: q.id,
        questionText: q.question,
        claim: q.answer,
        isTrue: true,
      };
    }
    const wrongChoices = q.choices.filter((c) => c !== q.answer);
    const randomWrong = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
    return {
      questionId: q.id,
      questionText: q.question,
      claim: randomWrong,
      isTrue: false,
    };
  });
}

type Phase = "ready" | "playing" | "finished";

export default function BlitzPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [phase, setPhase] = useState<Phase>("ready");
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [statements, setStatements] = useState<BlitzStatement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [questionTime, setQuestionTime] = useState(QUESTION_TIME);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [flashWrong, setFlashWrong] = useState(false);
  const [streakMilestone, setStreakMilestone] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeRef = useRef(QUESTION_TIME);
  const startTimeRef = useRef(0);

  useEffect(() => {
    fetch(`/api/questions?shuffle=true&limit=${TOTAL_QUESTIONS}`)
      .then((r) => r.json())
      .then((qs: DbQuestion[]) => {
        setQuestions(qs);
        setStatements(generateStatements(qs));
      });
  }, []);

  const currentStatement = statements[currentIndex];

  const advanceToNext = useCallback(() => {
    if (currentIndex + 1 >= statements.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("finished");
      return;
    }
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setSelectedAnswer(null);
    timeRef.current = QUESTION_TIME;
    setQuestionTime(QUESTION_TIME);
  }, [currentIndex, statements.length]);

  const handleAnswer = useCallback(
    (answer: boolean) => {
      if (selectedAnswer !== null || !currentStatement || phase !== "playing") return;

      const isCorrect = answer === currentStatement.isTrue;
      setSelectedAnswer(answer);

      if (timerRef.current) clearInterval(timerRef.current);

      if (isCorrect) {
        setCorrect((c) => c + 1);
        setStreak((s) => {
          const newStreak = s + 1;
          setBestStreak((b) => Math.max(b, newStreak));
          // Streak milestones
          if ([3, 7, 10].includes(newStreak)) {
            setStreakMilestone(newStreak);
            setTimeout(() => setStreakMilestone(null), 800);
          }
          return newStreak;
        });
      } else {
        setWrong((w) => w + 1);
        setStreak(0);
        setFlashWrong(true);
        setTimeout(() => setFlashWrong(false), 300);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([10, 50, 10]);
        }
      }

      setAnswers((a) => [
        ...a,
        {
          questionId: currentStatement.questionId,
          selectedAnswer: answer ? "TRUE" : "FALSE",
          correct: isCorrect,
          timeRemaining: timeRef.current,
          pointsEarned: isCorrect ? 15 : -3,
        },
      ]);

      advanceRef.current = setTimeout(() => {
        advanceToNext();
      }, ADVANCE_DELAY);
    },
    [selectedAnswer, currentStatement, phase, advanceToNext]
  );

  // Timeout handler
  const handleTimeout = useCallback(() => {
    if (selectedAnswer !== null) return;

    setWrong((w) => w + 1);
    setStreak(0);
    setFlashWrong(true);
    setTimeout(() => setFlashWrong(false), 300);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([10, 50, 10]);
    }

    if (currentStatement) {
      setAnswers((a) => [
        ...a,
        {
          questionId: currentStatement.questionId,
          selectedAnswer: null,
          correct: false,
          timeRemaining: 0,
          pointsEarned: -3,
        },
      ]);
    }

    setSelectedAnswer(false); // mark as answered to prevent double-fire
    advanceRef.current = setTimeout(() => {
      advanceToNext();
    }, ADVANCE_DELAY);
  }, [selectedAnswer, currentStatement, advanceToNext]);

  // Per-question timer
  useEffect(() => {
    if (phase !== "playing" || selectedAnswer !== null) return;

    timeRef.current = QUESTION_TIME;
    setQuestionTime(QUESTION_TIME);

    timerRef.current = setInterval(() => {
      timeRef.current -= 0.05;
      const t = timeRef.current;
      setQuestionTime(t);
      if (t <= 0) {
        timeRef.current = 0;
        setQuestionTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
        handleTimeout();
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIndex, selectedAnswer, handleTimeout]);

  function startGame() {
    const stmts = generateStatements(questions);
    setStatements(stmts);
    setPhase("playing");
    setCurrentIndex(0);
    setCorrect(0);
    setWrong(0);
    setStreak(0);
    setBestStreak(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setFlashWrong(false);
    timeRef.current = QUESTION_TIME;
    setQuestionTime(QUESTION_TIME);
    startTimeRef.current = Date.now();
  }

  async function submitAndNavigate() {
    if (submitting) return;
    setSubmitting(true);

    const finalPoints = Math.max(0, calculateBlitzScore(correct, wrong, bestStreak));
    const xpResult = calculateXp(finalPoints, "blitz", correct, correct + wrong, 0);

    let responseData: { xpChange?: number; penalized?: boolean; ratingUpdate?: { newRating: number; ratingDelta: number } } | undefined;
    if (session?.user?.id) {
      const res = await fetch("/api/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: "blitz",
          answers: answers.map((a) => ({
            questionId: a.questionId,
            correct: a.correct,
            timeRemaining: a.timeRemaining,
            pointsEarned: a.pointsEarned,
          })),
          score: correct,
          total: correct + wrong,
          points: finalPoints,
          bestStreak,
          section: "all",
          sectionName: "Blitz",
          durationSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
          metadata: { correct, wrong, bestStreak },
        }),
      });
      try { responseData = await res.json(); } catch {}
    }

    const blitzTotal = correct + wrong;
    // Use server response for accurate XP (includes ELO-weighted penalties)
    const blitzXpChange = responseData?.xpChange ?? xpResult.totalXp;
    const blitzPenalized = responseData?.penalized ?? false;

    const resultParams = new URLSearchParams({
      score: correct.toString(),
      total: blitzTotal.toString(),
      points: finalPoints.toString(),
      bestStreak: bestStreak.toString(),
      section: "all",
      sectionName: "Blitz",
      mode: "blitz",
      xp: blitzXpChange.toString(),
      baseXp: xpResult.baseXp.toString(),
      bonusXp: xpResult.bonusXp.toString(),
      perfectBonus: xpResult.perfectBonusXp.toString(),
      penalized: blitzPenalized ? "1" : "0",
    });
    if (responseData?.ratingUpdate) {
      resultParams.set("ratingNew", responseData.ratingUpdate.newRating.toString());
      resultParams.set("ratingDelta", responseData.ratingUpdate.ratingDelta.toString());
    }
    router.push(`/results?${resultParams.toString()}`);
  }

  // ─── Ready screen ──────────────────────────────────────
  if (phase === "ready") {
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col">
        <Link href="/games" className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary mb-6">
          &larr; Game Variants
        </Link>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-7xl mb-6">⚡</span>
          <h1 className="text-4xl font-black mb-2" style={{ color: "#06b6d4" }}>BLITZ</h1>
          <div className="w-16 h-1 mx-auto mb-4" style={{ background: "#06b6d4" }} />
          <p className="text-text-secondary text-sm font-light mb-8 max-w-xs">
            Rapid-fire true/false. 3 seconds per question. Timeout = wrong.
            Build streaks for massive multipliers.
          </p>
          <div className="flex flex-col gap-2 text-xs text-text-dim mb-8">
            <div>30 questions · 3s each · TRUE or FALSE</div>
            <div>+15 correct · -3 wrong · streak bonuses</div>
          </div>
          <button
            onClick={startGame}
            disabled={questions.length === 0}
            className="px-8 py-3.5 rounded-none font-bold text-black hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            style={{ background: "#06b6d4" }}
          >
            {questions.length === 0 ? "Loading..." : "GO!"}
          </button>
        </div>
      </main>
    );
  }

  // ─── Finished screen ───────────────────────────────────
  if (phase === "finished") {
    const finalPoints = Math.max(0, calculateBlitzScore(correct, wrong, bestStreak));
    return (
      <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto flex flex-col items-center justify-center">
        <span className="text-7xl mb-4">⚡</span>
        <h1 className="text-4xl font-black mb-2" style={{ color: "#06b6d4" }}>BLITZ OVER</h1>
        <div className="w-16 h-1 mx-auto mb-6" style={{ background: "#06b6d4" }} />

        <div className="grid grid-cols-4 gap-4 mb-6 text-center">
          <div>
            <div className="font-mono text-2xl font-bold text-success">{correct}</div>
            <div className="text-text-dim text-xs uppercase">Correct</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-bauhaus-red">{wrong}</div>
            <div className="text-text-dim text-xs uppercase">Wrong</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold" style={{ color: "#06b6d4" }}>{bestStreak}</div>
            <div className="text-text-dim text-xs uppercase">Streak</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold" style={{ color: "#06b6d4" }}>{finalPoints}</div>
            <div className="text-text-dim text-xs uppercase">Points</div>
          </div>
        </div>

        <div className="text-text-dim text-xs mb-8">
          {correct + wrong} / {TOTAL_QUESTIONS} answered · best streak {bestStreak}
          {bestStreak >= 10 ? " ☄️" : bestStreak >= 7 ? " 🔥🔥" : bestStreak >= 3 ? " 🔥" : ""}
        </div>

        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="px-6 py-3 rounded-none font-bold text-black hover:opacity-90 active:scale-95 transition-all"
            style={{ background: "#06b6d4" }}
          >
            Again
          </button>
          <button
            onClick={submitAndNavigate}
            disabled={submitting}
            className="px-6 py-3 rounded-none font-bold text-text-primary border-2 border-surface-border hover:bg-surface active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Results"}
          </button>
        </div>
      </main>
    );
  }

  // ─── Playing ───────────────────────────────────────────
  if (!currentStatement) return null;

  const timerPercent = (questionTime / QUESTION_TIME) * 100;
  const timerColor = questionTime > 2 ? "#06b6d4" : questionTime > 1 ? "#eab308" : "#dc2626";
  const streakMultiplier = getStreakMultiplier(streak);

  return (
    <main className={`min-h-dvh px-4 pt-4 pb-8 max-w-lg mx-auto transition-colors duration-200 ${flashWrong ? "bg-bauhaus-red/10" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "#06b6d4" }}>Blitz</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-success">{correct}</span>
          <span className="font-mono text-sm text-bauhaus-red">{wrong}</span>
          <span className="font-mono text-xs text-text-dim">
            {currentIndex + 1}/{TOTAL_QUESTIONS}
          </span>
        </div>
      </div>

      {/* Timer ring */}
      <div className="flex justify-center mb-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface" />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke={timerColor}
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - timerPercent / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-50"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-sm font-bold" style={{ color: timerColor }}>
              {Math.ceil(questionTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Streak indicator */}
      {streak > 0 && (
        <div className="text-center mb-3">
          <span
            className="inline-block text-xs font-bold px-3 py-1 rounded-full"
            style={{
              background: streakMultiplier > 1 ? "#06b6d4" : "var(--color-surface)",
              color: streakMultiplier > 1 ? "#000" : "var(--color-text-secondary)",
            }}
          >
            {streak} streak {streakMultiplier > 1 ? `(${streakMultiplier}x)` : ""}
          </span>
        </div>
      )}

      {/* Streak milestone celebration */}
      {streakMilestone && (
        <div className="text-center mb-2 animate-bounce">
          <span className="text-lg font-black" style={{ color: "#06b6d4" }}>
            {streakMilestone >= 10 ? "☄️ UNSTOPPABLE!" : streakMilestone >= 7 ? "🔥🔥 ON FIRE!" : "🔥 STREAK!"}
          </span>
        </div>
      )}

      {/* Question + Claim */}
      <div className="bg-surface border-2 border-surface-border p-5 mb-6">
        <p className="text-text-secondary text-sm mb-3 leading-relaxed">{currentStatement.questionText}</p>
        <div className="flex items-center gap-2">
          <span className="text-text-dim">&rarr;</span>
          <p className="text-text-primary font-bold text-lg">{currentStatement.claim}</p>
        </div>
      </div>

      {/* TRUE / FALSE buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleAnswer(true)}
          disabled={selectedAnswer !== null}
          className="py-4 rounded-none font-black text-xl text-white transition-all active:scale-95 disabled:opacity-60"
          style={{
            background:
              selectedAnswer !== null
                ? currentStatement.isTrue
                  ? "#16a34a"
                  : selectedAnswer === true
                    ? "#dc2626"
                    : "#374151"
                : "#16a34a",
          }}
        >
          TRUE
        </button>
        <button
          onClick={() => handleAnswer(false)}
          disabled={selectedAnswer !== null}
          className="py-4 rounded-none font-black text-xl text-white transition-all active:scale-95 disabled:opacity-60"
          style={{
            background:
              selectedAnswer !== null
                ? !currentStatement.isTrue
                  ? "#16a34a"
                  : selectedAnswer === false
                    ? "#dc2626"
                    : "#374151"
                : "#dc2626",
          }}
        >
          FALSE
        </button>
      </div>
    </main>
  );
}
