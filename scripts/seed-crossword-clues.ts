/**
 * Seed Supabase with crossword clues from src/lib/crossword-clues.ts
 *
 * Usage: npx tsx scripts/seed-crossword-clues.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import { config } from "dotenv";
import { crosswordClues } from "../src/lib/crossword-clues";

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

async function seed() {
  const rows = crosswordClues.map((c) => ({
    id: c.id,
    clue: c.clue,
    answer: c.answer,
    category: c.category,
  }));

  console.log(`Seeding ${rows.length} crossword clues...`);

  // Upsert in batches of 100
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("crossword_clues")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`Insert error at batch ${i}:`, error);
      process.exit(1);
    }
    console.log(`  ✓ ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  // Print category breakdown
  const cats = new Map<string, number>();
  for (const c of crosswordClues) {
    cats.set(c.category, (cats.get(c.category) || 0) + 1);
  }
  console.log("\nCategory breakdown:");
  for (const [cat, count] of cats) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log(`\nDone! Seeded ${rows.length} crossword clues.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
