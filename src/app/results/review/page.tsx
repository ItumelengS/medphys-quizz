"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface WrongAnswer {
  question: string;
  answer: string;
  selectedAnswer: string;
  explanation: string;
  choices: string[];
}

function ReviewContent() {
  const router = useRouter();
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("wrongAnswers");
      if (stored) {
        const parsed = JSON.parse(stored) as WrongAnswer[];
        setWrongAnswers(parsed);
      }
    } catch {
      /* ignore parse errors */
    }
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-secondary">
        Loading...
      </div>
    );
  }

  if (wrongAnswers.length === 0) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4 max-w-lg mx-auto text-center">
        <div className="text-5xl mb-4">?</div>
        <h1 className="text-xl font-bold text-text-primary mb-2">No wrong answers to review</h1>
        <p className="text-text-secondary text-sm mb-6">
          Play a quiz first, then come back here to review any mistakes.
        </p>
        <Link
          href="/"
          className="px-8 py-3 rounded-none font-bold border-2 border-surface-border text-text-primary hover:bg-surface transition-all"
        >
          Home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-4 pt-6 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-text-primary uppercase tracking-wider">
            Review Wrong Answers
          </h1>
          <p className="text-text-secondary text-sm font-light mt-1">
            {wrongAnswers.length} question{wrongAnswers.length !== 1 ? "s" : ""} to review
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary"
        >
          Back
        </button>
      </div>

      <div className="space-y-4">
        {wrongAnswers.map((wa, index) => (
          <div
            key={index}
            className="rounded-none bg-surface border-2 border-surface-border p-4"
          >
            <div className="text-xs text-text-dim uppercase tracking-wider mb-2 font-bold">
              Question {index + 1}
            </div>
            <p className="text-text-primary text-sm font-medium mb-4 leading-relaxed">
              {wa.question}
            </p>

            <div className="space-y-2 mb-4">
              {wa.choices.map((choice) => {
                const isCorrect = choice === wa.answer;
                const isUserSelection = choice === wa.selectedAnswer;

                let classes =
                  "w-full text-left px-3 py-2 text-sm rounded-none border-2 transition-none";

                if (isCorrect) {
                  classes +=
                    " border-success bg-success/10 text-success font-bold";
                } else if (isUserSelection) {
                  classes +=
                    " border-bauhaus-red bg-bauhaus-red/10 text-bauhaus-red font-bold";
                } else {
                  classes +=
                    " border-surface-border text-text-dim";
                }

                return (
                  <div key={choice} className={classes}>
                    <span className="flex items-center gap-2">
                      {isCorrect && <span className="text-success">&#10003;</span>}
                      {isUserSelection && !isCorrect && <span className="text-bauhaus-red">&#10007;</span>}
                      {choice}
                    </span>
                  </div>
                );
              })}
            </div>

            {wa.explanation && (
              <div className="rounded-none border-2 border-bauhaus-blue/30 border-l-4 border-l-bauhaus-blue p-3 bg-bauhaus-blue/5">
                <div className="text-xs font-bold text-bauhaus-blue uppercase tracking-wider mb-1">
                  Explanation
                </div>
                <p className="text-text-secondary text-sm font-light leading-relaxed">
                  {wa.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={() => router.back()}
          className="w-full text-center py-3.5 rounded-none font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#2563eb" }}
        >
          Back to Results
        </button>
        <Link
          href="/"
          className="block w-full text-center py-3.5 rounded-none font-bold text-text-primary border-2 border-surface-border hover:bg-surface transition-all active:scale-95"
        >
          Home
        </Link>
      </div>
    </main>
  );
}

export default function ReviewWrongAnswersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center text-text-secondary">
          Loading...
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
