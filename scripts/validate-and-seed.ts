/**
 * Validate and seed questions into Supabase
 *
 * Usage:
 *   npx tsx scripts/validate-and-seed.ts questions.json
 *   npx tsx scripts/validate-and-seed.ts questions.json --skip-ai
 *
 * Accepts:
 *   - DB format: Array of DbQuestion objects
 *   - Legacy format: { sections: [...], questions: { sectionId: [{ id, q, a, c, e, d }] } }
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import type { DbQuestion } from "../src/lib/types";
import { runPipeline } from "../src/lib/validate-questions";

// ── Load environment ────────────────────────────────────────

config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ── Parse CLI args ──────────────────────────────────────────

const args = process.argv.slice(2);
const jsonFile = args.find((a) => !a.startsWith("--"));
const skipAI = args.includes("--skip-ai");

if (!jsonFile) {
  console.error("Usage: npx tsx scripts/validate-and-seed.ts <questions.json> [--skip-ai]");
  process.exit(1);
}

// ── Normalize input ─────────────────────────────────────────

interface LegacyQuestion {
  id: string;
  q: string;
  a: string;
  c: string[];
  e: string;
  d: number;
}

function normalizeInput(raw: unknown): DbQuestion[] {
  // Array of DbQuestion objects
  if (Array.isArray(raw)) {
    // Check if it's legacy compact format (has 'q' field) or DB format (has 'question' field)
    if (raw.length > 0 && "q" in raw[0]) {
      // Legacy compact without section context — need section_id in each item
      return raw.map((item: LegacyQuestion & { section_id?: string }) => ({
        id: item.id,
        section_id: item.section_id || "unknown",
        question: item.q,
        answer: item.a,
        choices: item.c,
        explanation: item.e,
        difficulty: item.d ?? 5,
      }));
    }
    return raw as DbQuestion[];
  }

  // Legacy format: { questions: { sectionId: [...] }, sections?: [...] }
  if (typeof raw === "object" && raw !== null && "questions" in raw) {
    const obj = raw as { questions: Record<string, LegacyQuestion[]> };
    const questions: DbQuestion[] = [];
    for (const [sectionId, qs] of Object.entries(obj.questions)) {
      for (const q of qs) {
        questions.push({
          id: q.id,
          section_id: sectionId,
          question: q.q,
          answer: q.a,
          choices: q.c,
          explanation: q.e,
          difficulty: q.d ?? 5,
        });
      }
    }
    return questions;
  }

  console.error("Unrecognized input format. Expected array of questions or { questions: { ... } }");
  process.exit(1);
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const filePath = resolve(process.cwd(), jsonFile!);
  console.log(`Reading ${filePath}...`);

  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  const questions = normalizeInput(raw);

  console.log(`Found ${questions.length} questions to validate`);
  if (skipAI) console.log("  --skip-ai: Skipping AI verification");

  const result = await runPipeline(questions, supabase, { skipAI });

  // ── Report ──────────────────────────────────────────────

  console.log("\n═══ Pipeline Report ═══\n");
  console.log(`  Inserted: ${result.inserted.length}`);
  console.log(`  Fixed:    ${result.fixed.length}`);
  console.log(`  Deleted:  ${result.deleted.length}`);

  if (result.fixed.length > 0) {
    console.log("\n── Fixed questions ──");
    for (const { question, fixes } of result.fixed) {
      console.log(`  ${question.id}: ${fixes.join(", ")}`);
    }
  }

  if (result.deleted.length > 0) {
    console.log("\n── Deleted questions ──");
    for (const { question, reasons } of result.deleted) {
      console.log(`  ${question.id}: ${reasons.join(", ")}`);
    }
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
