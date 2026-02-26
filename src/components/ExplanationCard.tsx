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
        <span className="text-success font-semibold text-sm">Correct!</span>
        <button
          onClick={() => setExpanded(true)}
          className="text-text-secondary text-xs hover:text-text-primary transition-colors"
        >
          Why?
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up mt-3 rounded-none p-4 border-2 border-surface-border bg-surface relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: correct ? "#16a34a" : "#dc2626" }}
      />
      {!correct && (
        <div className="text-bauhaus-red text-sm font-semibold mb-1 mt-1">
          Correct answer: {correctAnswer}
        </div>
      )}
      <p className="text-text-secondary text-sm leading-relaxed font-light">
        {explanation}
      </p>
    </div>
  );
}
