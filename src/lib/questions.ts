import questionData from "@/data/questions.json";
import type { Question, QuestionBank, Section } from "./types";

const bank = questionData as QuestionBank;

export function getSections(): Section[] {
  return bank.sections;
}

export function getSection(id: string): Section | undefined {
  return bank.sections.find((s) => s.id === id);
}

export function getQuestionsBySection(sectionId: string): Question[] {
  return bank.questions[sectionId] || [];
}

export function getAllQuestions(): Question[] {
  return Object.values(bank.questions).flat();
}

export function getTotalQuestionCount(): number {
  return getAllQuestions().length;
}

export function getSectionQuestionCount(sectionId: string): number {
  return getQuestionsBySection(sectionId).length;
}

export function shuffleArray<T>(array: T[], seed?: number): T[] {
  const shuffled = [...array];
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function pickQuestions(
  sectionId: string | "all",
  count: number
): Question[] {
  const pool =
    sectionId === "all" ? getAllQuestions() : getQuestionsBySection(sectionId);
  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
