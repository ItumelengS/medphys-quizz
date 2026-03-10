"use client";

import { useState, useMemo } from "react";
import {
  extractReferences,
  type Reference,
} from "@/lib/reference-catalog";

interface ExplanationCardProps {
  explanation: string;
  correct: boolean;
  correctAnswer: string;
  alwaysShow?: boolean;
  references?: Reference[];
}

export default function ExplanationCard({
  explanation,
  correct,
  correctAnswer,
  alwaysShow = false,
  references: explicitRefs,
}: ExplanationCardProps) {
  const [expanded, setExpanded] = useState(!correct || alwaysShow);

  const references = useMemo(
    () => explicitRefs ?? extractReferences(explanation),
    [explicitRefs, explanation],
  );

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

      {references.length > 0 && (
        <div className="mt-3 pt-3 border-t border-surface-border">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
            References
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {references.map((ref) =>
              ref.url ? (
                <a
                  key={ref.id}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={ref.title}
                  className="inline-flex items-center gap-1 rounded-none border border-surface-border bg-bg px-2 py-0.5 text-xs font-mono text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors"
                >
                  {ref.id}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-3 h-3 opacity-50"
                  >
                    <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                    <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
                  </svg>
                </a>
              ) : (
                <span
                  key={ref.id}
                  title={ref.title}
                  className="inline-flex items-center rounded-none border border-surface-border bg-bg px-2 py-0.5 text-xs font-mono text-text-secondary"
                >
                  {ref.id}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
