/**
 * Question validation pipeline
 *
 * Structural validation → auto-fix → AI verification (when available) → upsert
 */

import type { DbQuestion } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Validation result types ─────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface PipelineResult {
  inserted: DbQuestion[];
  fixed: { question: DbQuestion; fixes: string[] }[];
  deleted: { question: DbQuestion; reasons: string[] }[];
}

// ── Structural validation ───────────────────────────────────

export function validateStructural(
  q: DbQuestion,
  existingIds?: Set<string>,
  validSectionIds?: Set<string>
): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields present and non-empty
  if (!q.id) errors.push({ field: "id", message: "Missing id" });
  if (!q.section_id) errors.push({ field: "section_id", message: "Missing section_id" });
  if (!q.question?.trim()) errors.push({ field: "question", message: "Missing or empty question" });
  if (!q.answer?.trim()) errors.push({ field: "answer", message: "Missing or empty answer" });
  if (!q.explanation?.trim()) errors.push({ field: "explanation", message: "Missing or empty explanation" });

  // Exactly 4 choices
  if (!Array.isArray(q.choices)) {
    errors.push({ field: "choices", message: "Choices must be an array" });
  } else if (q.choices.length !== 4) {
    errors.push({ field: "choices", message: `Expected 4 choices, got ${q.choices.length}` });
  }

  // Answer must exactly match one choice
  if (Array.isArray(q.choices) && q.answer) {
    const match = q.choices.some((c) => c === q.answer);
    if (!match) {
      errors.push({ field: "answer", message: "Answer does not exactly match any choice" });
    }
  }

  // Difficulty is integer 1-10
  if (q.difficulty == null) {
    errors.push({ field: "difficulty", message: "Missing difficulty" });
  } else if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 10) {
    errors.push({ field: "difficulty", message: `Difficulty must be integer 1-10, got ${q.difficulty}` });
  }

  // Length bias: answer should not be >1.8x average distractor length (unless ≤30 chars)
  if (Array.isArray(q.choices) && q.answer && q.answer.length > 30) {
    const distractors = q.choices.filter((c) => c !== q.answer);
    if (distractors.length > 0) {
      const avgLen = distractors.reduce((s, d) => s + d.length, 0) / distractors.length;
      if (avgLen > 0 && q.answer.length > avgLen * 1.8) {
        errors.push({
          field: "answer",
          message: `Answer length (${q.answer.length}) is >1.8x avg distractor length (${Math.round(avgLen)}) — length bias`,
        });
      }
    }
  }

  // Duplicate ID check
  if (existingIds && q.id && existingIds.has(q.id)) {
    errors.push({ field: "id", message: "Duplicate question ID (already in DB)" });
  }

  // Valid section_id
  if (validSectionIds && q.section_id && !validSectionIds.has(q.section_id)) {
    errors.push({ field: "section_id", message: `Unknown section_id: ${q.section_id}` });
  }

  return { valid: errors.length === 0, errors };
}

// ── Auto-fix structural issues ──────────────────────────────

export function autoFixStructural(q: DbQuestion): { fixed: DbQuestion; fixes: string[] } | null {
  const fixes: string[] = [];
  const fixed = { ...q, choices: [...(q.choices || [])] };

  // Fix whitespace/case mismatch between answer and choices
  if (Array.isArray(fixed.choices) && fixed.answer) {
    const exactMatch = fixed.choices.some((c) => c === fixed.answer);
    if (!exactMatch) {
      const trimmedAnswer = fixed.answer.trim();
      const matchIdx = fixed.choices.findIndex(
        (c) => c.trim().toLowerCase() === trimmedAnswer.toLowerCase()
      );
      if (matchIdx !== -1) {
        // Normalize: set answer to match the choice exactly
        fixed.answer = fixed.choices[matchIdx];
        fixes.push(`Normalized answer whitespace/case to match choice`);
      }
    }
  }

  // Clamp difficulty to 1-10
  if (fixed.difficulty != null) {
    if (typeof fixed.difficulty !== "number") {
      fixed.difficulty = parseInt(String(fixed.difficulty), 10);
      if (isNaN(fixed.difficulty)) fixed.difficulty = 5;
      fixes.push(`Converted difficulty to number`);
    }
    if (fixed.difficulty < 1) {
      fixed.difficulty = 1;
      fixes.push(`Clamped difficulty from ${q.difficulty} to 1`);
    } else if (fixed.difficulty > 10) {
      fixed.difficulty = 10;
      fixes.push(`Clamped difficulty from ${q.difficulty} to 10`);
    }
    if (!Number.isInteger(fixed.difficulty)) {
      fixed.difficulty = Math.round(fixed.difficulty);
      fixes.push(`Rounded difficulty to integer`);
    }
  } else {
    fixed.difficulty = 5;
    fixes.push(`Set missing difficulty to default 5`);
  }

  // 5 choices with a duplicate → remove duplicate to get 4
  if (Array.isArray(fixed.choices) && fixed.choices.length === 5) {
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const c of fixed.choices) {
      if (seen.has(c)) {
        fixes.push(`Removed duplicate choice: "${c}"`);
      } else {
        seen.add(c);
        deduped.push(c);
      }
    }
    if (deduped.length === 4) {
      fixed.choices = deduped;
    }
  }

  // Re-validate after fixes — if still invalid, return null
  const result = validateStructural(fixed);
  if (!result.valid) return null;

  return fixes.length > 0 ? { fixed, fixes } : { fixed: q, fixes: [] };
}

// ── AI factual verification (stubbed) ───────────────────────

export interface AIVerificationResult {
  questionId: string;
  valid: boolean;
  reason: string;
  fixedQuestion?: DbQuestion;
}

/**
 * Verify questions using AI (Claude Haiku).
 * Returns results only when ANTHROPIC_API_KEY is set.
 * Without the key, returns null (skip AI verification).
 */
export async function verifyWithAI(
  questions: DbQuestion[]
): Promise<AIVerificationResult[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // TODO: Implement when Anthropic API key is available
  // Batch questions in groups of 10, send to Claude Haiku for verification
  // For now, return all as valid
  console.log(`  [AI] Would verify ${questions.length} questions (API key present but not yet implemented)`);
  return questions.map((q) => ({
    questionId: q.id,
    valid: true,
    reason: "AI verification not yet implemented",
  }));
}

// ── Pipeline orchestrator ───────────────────────────────────

export async function runPipeline(
  questions: DbQuestion[],
  supabase: SupabaseClient,
  options: { skipAI?: boolean } = {}
): Promise<PipelineResult> {
  const result: PipelineResult = { inserted: [], fixed: [], deleted: [] };

  // Fetch valid section IDs from DB
  const { data: sections } = await supabase.from("sections").select("id");
  const validSectionIds = new Set((sections || []).map((s: { id: string }) => s.id));

  // Fetch existing question IDs to check duplicates
  const { data: existingQs } = await supabase.from("questions").select("id");
  const existingIds = new Set((existingQs || []).map((q: { id: string }) => q.id));

  const passedStructural: DbQuestion[] = [];
  const needsFix: DbQuestion[] = [];

  // Phase 1: Structural validation
  for (const q of questions) {
    const validation = validateStructural(q, existingIds, validSectionIds);
    if (validation.valid) {
      passedStructural.push(q);
    } else {
      needsFix.push(q);
    }
  }

  // Phase 2: Auto-fix structural failures
  for (const q of needsFix) {
    const fixResult = autoFixStructural(q);
    if (fixResult && fixResult.fixes.length > 0) {
      // Re-validate with DB checks
      const recheck = validateStructural(fixResult.fixed, existingIds, validSectionIds);
      if (recheck.valid) {
        passedStructural.push(fixResult.fixed);
        result.fixed.push({ question: fixResult.fixed, fixes: fixResult.fixes });
      } else {
        result.deleted.push({
          question: q,
          reasons: recheck.errors.map((e) => `${e.field}: ${e.message}`),
        });
      }
    } else if (fixResult && fixResult.fixes.length === 0) {
      // No fixes needed but re-validated as valid (edge case)
      passedStructural.push(q);
    } else {
      const validation = validateStructural(q);
      result.deleted.push({
        question: q,
        reasons: validation.errors.map((e) => `${e.field}: ${e.message}`),
      });
    }
  }

  // Phase 3: AI verification (if enabled)
  let toInsert = passedStructural;

  if (!options.skipAI) {
    const aiResults = await verifyWithAI(passedStructural);
    if (aiResults) {
      toInsert = [];
      for (const aiResult of aiResults) {
        const q = passedStructural.find((q) => q.id === aiResult.questionId);
        if (!q) continue;

        if (aiResult.valid) {
          toInsert.push(q);
        } else if (aiResult.fixedQuestion) {
          // AI provided a fix — re-validate structurally
          const recheck = validateStructural(aiResult.fixedQuestion, existingIds, validSectionIds);
          if (recheck.valid) {
            toInsert.push(aiResult.fixedQuestion);
            result.fixed.push({
              question: aiResult.fixedQuestion,
              fixes: [`AI fix: ${aiResult.reason}`],
            });
          } else {
            result.deleted.push({ question: q, reasons: [`AI: ${aiResult.reason}`] });
          }
        } else {
          result.deleted.push({ question: q, reasons: [`AI: ${aiResult.reason}`] });
        }
      }
    }
  }

  // Phase 4: Upsert to Supabase
  if (toInsert.length > 0) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("questions")
        .upsert(batch, { onConflict: "id" });
      if (error) {
        throw new Error(`Supabase upsert error: ${error.message}`);
      }
    }
    result.inserted = toInsert;
  }

  return result;
}
