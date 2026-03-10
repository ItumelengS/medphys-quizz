/**
 * Daily question generation script
 *
 * Analyzes current question distribution, identifies gaps, and generates
 * new questions using Claude API. Validates and seeds to Supabase.
 *
 * Usage:
 *   npx tsx scripts/generate-daily-questions.ts
 *   npx tsx scripts/generate-daily-questions.ts --dry-run   # Generate but don't seed
 *   npx tsx scripts/generate-daily-questions.ts --count 30  # Override question count
 *
 * Requires in .env.local (or environment):
 *   ANTHROPIC_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { runPipeline } from "../src/lib/validate-questions";
import type { DbQuestion } from "../src/lib/types";

// ── Load environment ────────────────────────────────────────

config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!anthropicKey) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const anthropic = new Anthropic({ apiKey: anthropicKey });

// ── CLI args ────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const countIdx = args.indexOf("--count");
const TARGET_QUESTIONS = countIdx !== -1 ? parseInt(args[countIdx + 1]) : 20;

// ── Section metadata ────────────────────────────────────────

const SECTION_TOPICS: Record<string, { name: string; topics: string }> = {
  srt: {
    name: "SRT & Small Fields",
    topics: "stereotactic radiosurgery, small field dosimetry, SRS/SBRT techniques, Winston-Lutz, micro-MLCs, cone-based SRS, GammaKnife, CyberKnife, TG-101, TG-135, small field correction factors",
  },
  qa: {
    name: "QA & Tolerances",
    topics: "linear accelerator QA, TG-142, daily/monthly/annual QA, beam flatness/symmetry, MLC QA, EPID dosimetry, output constancy, water tank commissioning, TG-51, calibration protocols",
  },
  equip: {
    name: "Equipment",
    topics: "linac components, magnetron/klystron, waveguide, bending magnet, ion chambers, electrometers, MLCs, jaws, gantry, treatment couch, imaging systems (kV/MV/CBCT)",
  },
  eclipse: {
    name: "Eclipse & TPS",
    topics: "treatment planning systems, Eclipse, AAA/AXB algorithms, dose calculation, beam modeling, plan optimization, DVH analysis, heterogeneity corrections, grid size effects, Monaco, RayStation",
  },
  dosimetry: {
    name: "Dosimetry",
    topics: "TRS-398, TG-51, ion chamber calibration, absorbed dose, beam quality, temperature-pressure corrections, electrometer readings, Farmer chamber, parallel plate chambers, reference dosimetry",
  },
  nucmed: {
    name: "Nuclear Medicine",
    topics: "radiopharmaceuticals, gamma cameras, SPECT, PET, Tc-99m, F-18 FDG, thyroid uptake, dose calibrators, collimators, energy windows, attenuation correction, SUV",
  },
  diag: {
    name: "Diagnostic Radiology",
    topics: "X-ray tubes, fluoroscopy, mammography, CT, image quality, dose metrics (CTDIvol, DLP, DAP), AEC, grids, scatter radiation, patient dose optimization, DRLs",
  },
  radiobio: {
    name: "Radiobiology",
    topics: "linear-quadratic model, alpha/beta ratios, BED, EQD2, cell survival curves, 4Rs/5Rs of radiobiology, fractionation, TCP, NTCP, oxygen effect, RBE, LET",
  },
  radprot: {
    name: "Radiation Protection",
    topics: "ALARA, dose limits (occupational/public), shielding, HVL/TVL, contamination, monitoring badges, survey meters, regulatory limits, ICRP recommendations, area classification",
  },
  regs: {
    name: "SA Regulatory",
    topics: "South African radiation regulations, HPCSA, DoH, NNR, licensing, incident reporting, quality management, South African specific legislation, SAHPRA",
  },
  integrated: {
    name: "Integrated Physics",
    topics: "cross-domain medical physics, combined concepts from dosimetry + radiobiology + equipment + clinical, multi-step problem solving, clinical scenario analysis",
  },
  "3dcrt": {
    name: "3D Conformal Radiotherapy",
    topics: "3D-CRT planning, beam arrangements, wedges, field shaping, PTV margins, OAR constraints, dose distributions, normalization, ICRU-50/62 reporting",
  },
  ultrasound: {
    name: "Ultrasound Physics",
    topics: "acoustic impedance, transducers, Doppler, B-mode, M-mode, resolution, artifacts, tissue harmonics, ultrasound QA, biological effects, AIUM guidelines",
  },
  mri: {
    name: "MRI Physics",
    topics: "spin physics, T1/T2 relaxation, pulse sequences, gradient echo, spin echo, k-space, RF coils, MRI safety, contrast agents, diffusion, fMRI, MR spectroscopy",
  },
  clinical: {
    name: "Clinical RT",
    topics: "clinical radiotherapy practice, treatment sites (brain, breast, lung, prostate, H&N), dose prescriptions, treatment protocols, side effects, concurrent chemotherapy, palliative RT",
  },
  statistics: {
    name: "Statistics",
    topics: "biostatistics, p-values, confidence intervals, ROC curves, sensitivity/specificity, clinical trials, survival analysis, Kaplan-Meier, chi-square, t-test, ANOVA",
  },
  anatomy: {
    name: "RT Anatomy",
    topics: "radiotherapy anatomy, OAR identification, contouring, lymph node levels, anatomical landmarks for treatment planning, cross-sectional anatomy",
  },
  brachy: {
    name: "Brachytherapy",
    topics: "HDR/LDR brachytherapy, Ir-192, Cs-137, applicators, TG-43 formalism, source calibration, gynecological brachy, interstitial implants, dose optimization, dwell times",
  },
  igrt: {
    name: "IGRT & Adaptive RT",
    topics: "image-guided radiotherapy, CBCT, kV imaging, fiducial markers, 6DOF couch corrections, adaptive radiotherapy, deformable registration, plan adaptation triggers",
  },
  imrt: {
    name: "IMRT & VMAT",
    topics: "IMRT optimization, inverse planning, VMAT, fluence maps, leaf sequencing, plan quality metrics, gamma analysis, TG-218, patient-specific QA, dose painting",
  },
  electron: {
    name: "Electron Beam Therapy",
    topics: "electron beam physics, depth-dose characteristics, scattering foils, bolus, skin dose, R90, R80, practical range, energy selection, irregular surfaces, inhomogeneity effects",
  },
  proton: {
    name: "Proton & Particle Therapy",
    topics: "proton therapy, Bragg peak, SOBP, pencil beam scanning, passive scattering, RBE, range uncertainty, proton vs photon planning, carbon ion therapy",
  },
  shielding: {
    name: "Shielding Design",
    topics: "shielding calculations, primary/secondary barriers, TVL, workload, use/occupancy factors, NCRP-151, maze design, door leakage, neutron shielding, skyshine",
  },
  ct: {
    name: "CT Physics",
    topics: "CT principles, Hounsfield units, reconstruction algorithms, iterative reconstruction, dual-energy CT, CT dose (CTDIvol, DLP), CT artifacts, CT QA, helical/axial scanning",
  },
  informatics: {
    name: "Informatics & IT",
    topics: "DICOM, HL7, PACS, RIS, treatment record systems, network security in healthcare, data integrity, IHE, DICOM-RT objects, cybersecurity in medical devices",
  },
  sasqart: {
    name: "SASQART 2025",
    topics: "South African Standards for Quality Assurance in Radiotherapy, SASQART guidelines, local protocols, compliance requirements, South African context",
  },
  aiml: {
    name: "AI/ML in Medical Physics",
    topics: "artificial intelligence in radiation therapy, auto-contouring, auto-planning, deep learning for dose prediction, radiomics, image segmentation, quality assurance AI tools",
  },
  pet: {
    name: "PET/CT & Molecular Imaging",
    topics: "PET physics, coincidence detection, SUV, attenuation correction, time-of-flight PET, PET/MRI, radiotracers, quantitative imaging, PERCIST/RECIST, PET QA",
  },
  linac: {
    name: "Linear Accelerator Physics",
    topics: "linac design, electron gun, accelerating waveguide, bending systems, target, flattening filter, FFF beams, beam steering, interlock systems, linac commissioning",
  },
  mammo: {
    name: "Mammography & Breast Imaging",
    topics: "mammography physics, Mo/Rh targets, breast compression, digital mammography, tomosynthesis, AEC, contrast-enhanced mammography, mammography QA, ACR accreditation, MQSA",
  },
};

// ── Difficulty labels ───────────────────────────────────────

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Basic recall — definitions, simple facts, 'what is' questions",
  2: "Easy recall — standard facts, one-line answers",
  3: "Moderate recall — requires understanding not just memorization",
  4: "Applied knowledge — single-step reasoning, applying a concept",
  5: "Applied knowledge — moderate complexity, connecting two concepts",
  6: "Intermediate — multi-concept, requires good understanding",
  7: "Advanced — multi-step reasoning, calculations, protocol details",
  8: "Advanced — complex scenarios, commissioning-level knowledge",
  9: "Expert — multi-domain synthesis, advanced troubleshooting",
  10: "Expert — research-level, Monte Carlo, FMEA, uncertainty budgets",
};

// ── Analyze gaps ────────────────────────────────────────────

interface GapAnalysis {
  section_id: string;
  difficulty: number;
  current_count: number;
  priority: number; // higher = more urgent
}

async function analyzeGaps(supabase: SupabaseClient): Promise<GapAnalysis[]> {
  // Get current distribution
  const { data: questions } = await supabase
    .from("questions")
    .select("section_id, difficulty");

  if (!questions) {
    console.error("Failed to fetch questions from Supabase");
    process.exit(1);
  }

  // Count per section + difficulty
  const counts: Record<string, Record<number, number>> = {};
  for (const q of questions) {
    if (!counts[q.section_id]) counts[q.section_id] = {};
    counts[q.section_id][q.difficulty] = (counts[q.section_id][q.difficulty] || 0) + 1;
  }

  // Calculate gaps — prioritize thin difficulty levels
  const gaps: GapAnalysis[] = [];

  for (const sectionId of Object.keys(SECTION_TOPICS)) {
    const sectionCounts = counts[sectionId] || {};

    for (let d = 1; d <= 10; d++) {
      const count = sectionCounts[d] || 0;

      // Priority scoring:
      // - D1-3 and D8-10 are most important (exam boundaries)
      // - Sections with <10 questions at a difficulty level get highest priority
      // - Sections with <20 get moderate priority
      let priority = 0;

      if (count < 5) priority = 10;
      else if (count < 10) priority = 7;
      else if (count < 15) priority = 4;
      else if (count < 20) priority = 2;
      else priority = 0;

      // Boost priority for exam-critical difficulty ranges
      if (d <= 2 || d >= 9) priority += 3;
      if (d <= 3 || d >= 8) priority += 1;

      if (priority > 0) {
        gaps.push({
          section_id: sectionId,
          difficulty: d,
          current_count: count,
          priority,
        });
      }
    }
  }

  // Sort by priority descending
  gaps.sort((a, b) => b.priority - a.priority);

  return gaps;
}

// ── Generate questions ──────────────────────────────────────

interface GenerationTarget {
  section_id: string;
  difficulty: number;
  count: number;
}

function selectTargets(gaps: GapAnalysis[], totalTarget: number): GenerationTarget[] {
  const targets: GenerationTarget[] = [];
  let remaining = totalTarget;

  // Group by section+difficulty, assign count based on priority
  for (const gap of gaps) {
    if (remaining <= 0) break;

    // Generate 2-4 questions per gap, weighted by priority
    const count = Math.min(remaining, gap.priority >= 10 ? 4 : gap.priority >= 7 ? 3 : 2);
    targets.push({
      section_id: gap.section_id,
      difficulty: gap.difficulty,
      count,
    });
    remaining -= count;
  }

  return targets;
}

async function getNextId(supabase: SupabaseClient, sectionId: string): Promise<number> {
  const { data } = await supabase
    .from("questions")
    .select("id")
    .like("id", `${sectionId}%`)
    .order("id", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return 1;

  // Extract numeric suffix from ID like "dosimetry42" or "do42"
  const match = data[0].id.match(/(\d+)$/);
  return match ? parseInt(match[1]) + 1 : 1;
}

// ID prefix mapping (some sections use abbreviated prefixes)
const ID_PREFIXES: Record<string, string> = {
  srt: "srt", qa: "qa", equip: "eq", eclipse: "ecl", dosimetry: "do",
  nucmed: "nm", diag: "dg", radiobio: "rb", radprot: "rp", regs: "reg",
  integrated: "int", "3dcrt": "3d", ultrasound: "us", mri: "mri",
  clinical: "cln", statistics: "stat", anatomy: "anat", brachy: "bra",
  igrt: "igrt", imrt: "imrt", electron: "elec", proton: "prot",
  shielding: "shld", ct: "ct", informatics: "info", sasqart: "sasq",
  aiml: "aiml", pet: "pet", linac: "linac", mammo: "mammo",
};

async function generateBatch(
  targets: GenerationTarget[],
  supabase: SupabaseClient,
): Promise<DbQuestion[]> {
  // Group targets by section for more coherent generation
  const bySection: Record<string, { difficulty: number; count: number }[]> = {};
  for (const t of targets) {
    if (!bySection[t.section_id]) bySection[t.section_id] = [];
    bySection[t.section_id].push({ difficulty: t.difficulty, count: t.count });
  }

  const allGenerated: DbQuestion[] = [];

  for (const [sectionId, diffTargets] of Object.entries(bySection)) {
    const sectionInfo = SECTION_TOPICS[sectionId];
    if (!sectionInfo) continue;

    const nextIdNum = await getNextId(supabase, sectionId);
    const prefix = ID_PREFIXES[sectionId] || sectionId;

    const difficultySpec = diffTargets
      .map((dt) => `  - ${dt.count} questions at difficulty ${dt.difficulty} (${DIFFICULTY_LABELS[dt.difficulty]})`)
      .join("\n");

    const totalCount = diffTargets.reduce((s, dt) => s + dt.count, 0);

    const prompt = `You are a medical physics expert creating quiz questions for a study app used by medical physics professionals in South Africa.

Generate exactly ${totalCount} multiple-choice questions for the section: **${sectionInfo.name}**
Topics to cover: ${sectionInfo.topics}

Difficulty breakdown:
${difficultySpec}

CRITICAL RULES:
1. Each question must have EXACTLY 4 choices
2. The correct answer must EXACTLY match one of the 4 choices (character-for-character)
3. ALL 4 CHOICES MUST BE SIMILAR IN LENGTH — the correct answer must NOT be noticeably longer than the distractors. This is the #1 reason questions get rejected. Make distractors equally detailed and specific.
4. Distractors must be plausible but clearly wrong to an expert
5. Explanation should be 1-3 sentences, citing standards/references where relevant (TG reports, ICRP, ICRU, etc.)
6. Questions must be factually accurate for 2024-2025 standards
7. Avoid "all of the above" or "none of the above" choices
8. For calculations, include the numerical setup in the question
9. Each question ID should follow the pattern: "${prefix}" + number, starting from ${nextIdNum}

Return a JSON array (no other text, no markdown fences). Each element:
{
  "id": "${prefix}${nextIdNum}",
  "section_id": "${sectionId}",
  "question": "The question text",
  "answer": "The correct answer (must exactly match one choice)",
  "choices": ["choice1", "choice2", "choice3", "choice4"],
  "explanation": "Brief explanation with references",
  "difficulty": ${diffTargets[0].difficulty},
  "disciplines": ["physicist"]
}`;

    console.log(`  Generating ${totalCount} questions for ${sectionInfo.name}...`);

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      // Extract JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`  ⚠ Could not parse response for ${sectionId}, skipping`);
        continue;
      }

      const questions: DbQuestion[] = JSON.parse(jsonMatch[0]);
      console.log(`  ✓ Got ${questions.length} questions for ${sectionInfo.name}`);
      allGenerated.push(...questions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Generation error for ${sectionId}: ${msg}`);
    }
  }

  return allGenerated;
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log("═══ Daily Question Generation ═══\n");
  console.log(`Target: ${TARGET_QUESTIONS} questions${dryRun ? " (DRY RUN)" : ""}\n`);

  // Step 1: Analyze gaps
  console.log("Step 1: Analyzing difficulty distribution gaps...");
  const gaps = await analyzeGaps(supabase);
  console.log(`  Found ${gaps.length} gap areas\n`);

  if (gaps.length === 0) {
    console.log("No gaps found — all sections and difficulties well-covered!");
    return;
  }

  // Show top gaps
  console.log("Top 10 gaps:");
  for (const g of gaps.slice(0, 10)) {
    const name = SECTION_TOPICS[g.section_id]?.name || g.section_id;
    console.log(`  ${name} D${g.difficulty}: ${g.current_count} questions (priority ${g.priority})`);
  }
  console.log();

  // Step 2: Select generation targets
  const targets = selectTargets(gaps, TARGET_QUESTIONS);
  const totalToGenerate = targets.reduce((s, t) => s + t.count, 0);
  console.log(`Step 2: Will generate ${totalToGenerate} questions across ${targets.length} targets\n`);

  // Step 3: Generate
  console.log("Step 3: Generating questions with Claude...");
  const generated = await generateBatch(targets, supabase);
  console.log(`\n  Generated ${generated.length} total questions\n`);

  if (generated.length === 0) {
    console.log("No questions generated. Exiting.");
    return;
  }

  // Step 4: Save generated questions to file (for version control)
  const dateStr = new Date().toISOString().split("T")[0];
  const outPath = resolve(__dirname, `../src/data/generated/daily-${dateStr}.json`);
  writeFileSync(outPath, JSON.stringify(generated, null, 2));
  console.log(`Step 4: Saved to ${outPath}\n`);

  if (dryRun) {
    console.log("DRY RUN — skipping validation and seeding.");
    console.log(`Generated ${generated.length} questions saved to ${outPath}`);
    return;
  }

  // Step 5: Validate and seed
  console.log("Step 5: Running validation pipeline...");
  const result = await runPipeline(generated, supabase, { skipAI: false });

  console.log("\n═══ Pipeline Report ═══\n");
  console.log(`  Generated: ${generated.length}`);
  console.log(`  Inserted:  ${result.inserted.length}`);
  console.log(`  Fixed:     ${result.fixed.length}`);
  console.log(`  Rejected:  ${result.deleted.length}`);

  if (result.fixed.length > 0) {
    console.log("\n── Fixed questions ──");
    for (const { question, fixes } of result.fixed) {
      console.log(`  ${question.id}: ${fixes.join(", ")}`);
    }
  }

  if (result.deleted.length > 0) {
    console.log("\n── Rejected questions ──");
    for (const { question, reasons } of result.deleted) {
      console.log(`  ${question.id}: ${reasons.join(", ")}`);
    }
  }

  // Update the saved file with only inserted questions
  if (result.inserted.length > 0) {
    writeFileSync(outPath, JSON.stringify(result.inserted, null, 2));
    console.log(`\nUpdated ${outPath} with ${result.inserted.length} validated questions`);
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
