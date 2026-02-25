#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "src", "data", "questions.json");
const data = JSON.parse(fs.readFileSync(file, "utf-8"));

let errors = 0;
const ids = new Set();
const sectionIds = new Set(data.sections.map((s) => s.id));
let total = 0;

for (const [sectionKey, questions] of Object.entries(data.questions)) {
  if (!sectionIds.has(sectionKey)) {
    console.error(`ERROR: Question section key "${sectionKey}" not in sections array`);
    errors++;
  }
  for (const q of questions) {
    total++;
    if (ids.has(q.id)) {
      console.error(`ERROR: Duplicate ID "${q.id}"`);
      errors++;
    }
    ids.add(q.id);

    if (!q.c || q.c.length !== 4) {
      console.error(`ERROR: ${q.id} — must have exactly 4 choices (has ${q.c?.length})`);
      errors++;
    }

    if (!q.c?.includes(q.a)) {
      console.error(`ERROR: ${q.id} — answer "${q.a}" not in choices`);
      errors++;
    }

    if (!q.q || !q.e) {
      console.error(`ERROR: ${q.id} — missing question or explanation`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n❌ ${total} questions checked. ${errors} error(s) found.`);
  process.exit(1);
} else {
  console.log(`✅ ${total} questions validated. 0 errors.`);
}
