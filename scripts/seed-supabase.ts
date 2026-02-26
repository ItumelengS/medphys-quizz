/**
 * Seed Supabase with questions from src/data/questions.json
 *
 * Usage: npx tsx scripts/seed-supabase.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env from .env.local
import { config } from "dotenv";
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

interface RawQuestion {
  id: string;
  q: string;
  a: string;
  c: string[];
  e: string;
}

interface RawSection {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

async function seed() {
  const jsonPath = resolve(__dirname, "../src/data/questions.json");
  const raw = JSON.parse(readFileSync(jsonPath, "utf-8"));

  const sections: RawSection[] = raw.sections;
  const questions: Record<string, RawQuestion[]> = raw.questions;

  console.log(`Seeding ${sections.length} sections...`);

  // Upsert sections
  const sectionRows = sections.map((s, i) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    color: s.color,
    description: s.description,
    sort_order: i,
  }));

  const { error: secErr } = await supabase
    .from("sections")
    .upsert(sectionRows, { onConflict: "id" });

  if (secErr) {
    console.error("Section insert error:", secErr);
    process.exit(1);
  }
  console.log(`  ✓ ${sectionRows.length} sections upserted`);

  // Upsert questions
  let totalQ = 0;
  for (const [sectionId, qs] of Object.entries(questions)) {
    const rows = qs.map((q) => ({
      id: q.id,
      section_id: sectionId,
      question: q.q,
      answer: q.a,
      choices: q.c,
      explanation: q.e,
    }));

    const { error: qErr } = await supabase
      .from("questions")
      .upsert(rows, { onConflict: "id" });

    if (qErr) {
      console.error(`Question insert error (${sectionId}):`, qErr);
      process.exit(1);
    }
    totalQ += rows.length;
    console.log(`  ✓ ${rows.length} questions in ${sectionId}`);
  }

  console.log(`\nDone! Seeded ${sectionRows.length} sections and ${totalQ} questions.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
