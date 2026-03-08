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

// ── AI factual verification ─────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";

export interface AIVerificationResult {
  questionId: string;
  valid: boolean;
  reason: string;
  fixedQuestion?: DbQuestion;
}

const BATCH_SIZE = 10;
const AI_MODEL = "claude-haiku-4-5-20251001";
const COST_PER_MTOK_INPUT = 0.80;
const COST_PER_MTOK_OUTPUT = 4.00;
const MAX_COST_USD = 3.00;

function buildVerificationPrompt(questions: DbQuestion[]): string {
  const formatted = questions.map((q, i) => (
    `[${i + 1}] ID: ${q.id}
Q: ${q.question}
Choices: ${q.choices.map((c, j) => `${String.fromCharCode(65 + j)}) ${c}`).join(" | ")}
Marked answer: ${q.answer}
Explanation: ${q.explanation}`
  )).join("\n\n");

  return `You are a medical physics expert verifying quiz questions for accuracy.

For each question below, check:
1. Is the marked answer factually correct?
2. Is the explanation accurate and consistent with the answer?
3. Are there any other choices that could also be considered correct (ambiguous question)?
4. Is the question itself well-formed and unambiguous?

${formatted}

Respond with a JSON array (no other text). Each element must have:
- "id": the question ID
- "valid": true if the question and answer are factually correct, false otherwise
- "reason": brief explanation (if valid, say "Correct"; if invalid, explain the error)
- "fixedAnswer": (only if valid=false AND you can fix it) the corrected answer string that matches one of the existing choices, or omit if unfixable

Example response:
[{"id":"q1","valid":true,"reason":"Correct"},{"id":"q2","valid":false,"reason":"The correct answer is B not C; TG-142 specifies 1mm not 2mm","fixedAnswer":"± 1 mm"}]`;
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
  if (!apiKey) {
    console.log("  [AI] Skipping — ANTHROPIC_API_KEY not set");
    return null;
  }

  const client = new Anthropic({ apiKey });
  const results: AIVerificationResult[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  function currentCost(): number {
    return (totalInputTokens / 1_000_000) * COST_PER_MTOK_INPUT +
           (totalOutputTokens / 1_000_000) * COST_PER_MTOK_OUTPUT;
  }

  // Process in batches
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    // Cost guard — stop before exceeding budget
    const spent = currentCost();
    if (spent >= MAX_COST_USD) {
      console.warn(`  [AI] Budget limit reached ($${spent.toFixed(2)} / $${MAX_COST_USD.toFixed(2)}). Skipping remaining ${questions.length - i} questions.`);
      for (let j = i; j < questions.length; j++) {
        results.push({ questionId: questions[j].id, valid: true, reason: "Skipped — budget limit reached" });
      }
      break;
    }

    const batch = questions.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(questions.length / BATCH_SIZE);
    console.log(`  [AI] Verifying batch ${batchNum}/${totalBatches} (${batch.length} questions) [$${spent.toFixed(3)} spent]...`);

    try {
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: buildVerificationPrompt(batch),
        }],
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      // Extract JSON array from response (handle markdown fences)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`  [AI] Batch ${batchNum}: Could not parse response, marking as valid`);
        for (const q of batch) {
          results.push({ questionId: q.id, valid: true, reason: "AI response unparseable — passed by default" });
        }
        continue;
      }

      const parsed: Array<{
        id: string;
        valid: boolean;
        reason: string;
        fixedAnswer?: string;
      }> = JSON.parse(jsonMatch[0]);

      for (const item of parsed) {
        const q = batch.find((b) => b.id === item.id);
        if (!q) continue;

        const aiResult: AIVerificationResult = {
          questionId: item.id,
          valid: item.valid,
          reason: item.reason,
        };

        // If AI flagged it and provided a fix, build the fixed question
        if (!item.valid && item.fixedAnswer) {
          const fixedChoiceMatch = q.choices.some((c) => c === item.fixedAnswer);
          if (fixedChoiceMatch) {
            aiResult.fixedQuestion = { ...q, answer: item.fixedAnswer };
          }
        }

        results.push(aiResult);
      }

      // Any questions in batch not in response — pass by default
      for (const q of batch) {
        if (!results.some((r) => r.questionId === q.id)) {
          results.push({ questionId: q.id, valid: true, reason: "Not evaluated by AI — passed by default" });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [AI] Batch ${batchNum} error: ${message}`);
      // On API error, pass the batch rather than blocking the pipeline
      for (const q of batch) {
        if (!results.some((r) => r.questionId === q.id)) {
          results.push({ questionId: q.id, valid: true, reason: `AI error — passed by default: ${message}` });
        }
      }
    }
  }

  const flagged = results.filter((r) => !r.valid);
  const finalCost = currentCost();
  console.log(`  [AI] Verification complete: ${results.length} checked, ${flagged.length} flagged`);
  console.log(`  [AI] Tokens: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out — Cost: $${finalCost.toFixed(3)}`);

  return results;
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
