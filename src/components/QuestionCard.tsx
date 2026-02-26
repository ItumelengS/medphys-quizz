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
    <div className="animate-fade-up border-l-4 border-l-bauhaus-blue pl-4">
      <div className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-widest">
        Question {questionNumber} of {totalQuestions}
      </div>
      <h2 className="text-xl font-black text-text-primary leading-snug">
        {question}
      </h2>
    </div>
  );
}
