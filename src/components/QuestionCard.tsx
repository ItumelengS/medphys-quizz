"use client";

interface QuestionCardProps {
  question: string;
  questionNumber: number;
  totalQuestions: number;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  return (
    <div className="animate-fade-up">
      <div className="text-text-secondary text-xs font-mono mb-2">
        Question {questionNumber} of {totalQuestions}
      </div>
      <h2 className="text-xl font-bold text-text-primary leading-snug">
        {question}
      </h2>
    </div>
  );
}
