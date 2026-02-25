"use client";

import { useState } from "react";

interface ExplanationCardProps {
  explanation: string;
  correct: boolean;
  correctAnswer: string;
  alwaysShow?: boolean;
}

export default function ExplanationCard({
  explanation,
  correct,
  correctAnswer,
  alwaysShow = false,
}: ExplanationCardProps) {
  const [expanded, setExpanded] = useState(!correct || alwaysShow);

  if (correct && !alwaysShow && !expanded) {
    return (
      <div className="animate-fade-up flex items-center gap-2 mt-3">
        <span className="text-accent font-semibold text-sm">Correct!</span>
        <button
          onClick={() => setExpanded(true)}
          className="text-text-secondary text-xs hover:text-text-primary transition-colors"
        >
          📖 Why?
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up mt-3 rounded-xl p-4 border border-surface-border bg-surface">
      {!correct && (
        <div className="text-error text-sm font-semibold mb-1">
          Correct answer: {correctAnswer}
        </div>
      )}
      <p className="text-text-secondary text-sm leading-relaxed">
        {explanation}
      </p>
    </div>
  );
}
