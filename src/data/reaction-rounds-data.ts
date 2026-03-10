export type ReactionRole = "physicist" | "therapist" | "oncologist" | "dosimetrist" | "engineer" | "all";

export interface ReactionValue {
  label: string;
  value: number;
  unit: string;
}

export interface ReactionCategory {
  id: string;
  name: string;
  roles: ReactionRole[]; // which roles see this category
  values: ReactionValue[];
}

// ── SHARED CATEGORIES (all roles) ───────────────────────────

const ISOTOPE_HALF_LIVES: ReactionCategory = {
  id: "half-lives",
  name: "Isotope Half-Lives",
  roles: ["all"],
  values: [
    { label: "O-15 half-life", value: 2.04, unit: "min" },
    { label: "N-13 half-life", value: 9.97, unit: "min" },
    { label: "C-11 half-life", value: 20.4, unit: "min" },
    { label: "Ga-68 half-life", value: 67.7, unit: "min" },
    { label: "F-18 half-life", value: 109.77, unit: "min" },
    { label: "Tc-99m half-life", value: 361, unit: "min" },
    { label: "Au-198 half-life", value: 2.7, unit: "days" },
    { label: "Y-90 half-life", value: 2.67, unit: "days" },
    { label: "Mo-99 half-life", value: 2.75, unit: "days" },
    { label: "Lu-177 half-life", value: 6.65, unit: "days" },
    { label: "I-131 half-life", value: 8.02, unit: "days" },
    { label: "Ac-225 half-life", value: 10.0, unit: "days" },
    { label: "P-32 half-life", value: 14.3, unit: "days" },
    { label: "Pd-103 half-life", value: 16.99, unit: "days" },
    { label: "I-125 half-life", value: 59.4, unit: "days" },
    { label: "Ir-192 half-life", value: 73.83, unit: "days" },
    { label: "Co-60 half-life", value: 5.27, unit: "years" },
    { label: "Sr-90 half-life", value: 28.8, unit: "years" },
    { label: "Cs-137 half-life", value: 30.17, unit: "years" },
    { label: "Ra-226 half-life", value: 1600, unit: "years" },
  ],
};

const DOSE_LIMITS: ReactionCategory = {
  id: "dose-limits",
  name: "Annual Dose Limits",
  roles: ["all"],
  values: [
    { label: "Negligible individual dose", value: 0.01, unit: "mSv" },
    { label: "Embryo/fetus monthly", value: 0.5, unit: "mSv" },
    { label: "Public whole body", value: 1, unit: "mSv" },
    { label: "Occupational minor", value: 1, unit: "mSv" },
    { label: "Embryo/fetus total gestation", value: 5, unit: "mSv" },
    { label: "Public lens of eye", value: 15, unit: "mSv" },
    { label: "Occupational whole body", value: 50, unit: "mSv" },
    { label: "Occupational lens of eye", value: 150, unit: "mSv" },
    { label: "Occupational extremity", value: 500, unit: "mSv" },
  ],
};

const CT_NUMBERS: ReactionCategory = {
  id: "ct-numbers",
  name: "CT Numbers",
  roles: ["all"],
  values: [
    { label: "Air CT number", value: -1000, unit: "HU" },
    { label: "Lung CT number", value: -700, unit: "HU" },
    { label: "Fat CT number", value: -100, unit: "HU" },
    { label: "Water CT number", value: 0, unit: "HU" },
    { label: "Muscle CT number", value: 40, unit: "HU" },
    { label: "Soft tissue CT number", value: 50, unit: "HU" },
    { label: "Cancellous bone CT number", value: 400, unit: "HU" },
    { label: "Cortical bone CT number", value: 1000, unit: "HU" },
    { label: "Metal implant CT number", value: 3000, unit: "HU" },
  ],
};

// ── RADIATION THERAPIST CATEGORIES ──────────────────────────

const SETUP_TOLERANCES: ReactionCategory = {
  id: "setup-tolerances",
  name: "Setup Tolerances",
  roles: ["therapist"],
  values: [
    { label: "SRS frame-based tolerance", value: 0.5, unit: "mm" },
    { label: "SRS frameless (mask) tolerance", value: 1, unit: "mm" },
    { label: "SBRT setup tolerance", value: 1, unit: "mm" },
    { label: "Spine SBRT tolerance", value: 1, unit: "mm" },
    { label: "H&N CBCT match tolerance", value: 2, unit: "mm" },
    { label: "Standard fractionation setup", value: 3, unit: "mm" },
    { label: "Breast tangent setup", value: 3, unit: "mm" },
    { label: "Pelvis CBCT match tolerance", value: 3, unit: "mm" },
  ],
};

const FRACTIONATION_TOTAL_DOSE: ReactionCategory = {
  id: "fractionation-total",
  name: "Total Prescription Dose",
  roles: ["therapist", "oncologist"],
  values: [
    { label: "Bone met palliative (single fx)", value: 8, unit: "Gy" },
    { label: "SRS single fraction", value: 20, unit: "Gy" },
    { label: "Short course rectal", value: 25, unit: "Gy" },
    { label: "Pediatric CSI (medulloblastoma)", value: 23.4, unit: "Gy" },
    { label: "Bone met palliative (10 fx)", value: 30, unit: "Gy" },
    { label: "Whole brain (WBRT)", value: 30, unit: "Gy" },
    { label: "Prostate SBRT", value: 36.25, unit: "Gy" },
    { label: "Breast hypofractionated", value: 42.56, unit: "Gy" },
    { label: "Cervix external beam", value: 45, unit: "Gy" },
    { label: "Breast conventional", value: 50, unit: "Gy" },
    { label: "Lung SBRT (5 fx)", value: 50, unit: "Gy" },
    { label: "Rectal neoadjuvant (long)", value: 50.4, unit: "Gy" },
    { label: "Lung SBRT (3 fx)", value: 54, unit: "Gy" },
    { label: "Head & neck definitive", value: 70, unit: "Gy" },
    { label: "Prostate conventional", value: 78, unit: "Gy" },
  ],
};

const FRACTION_COUNTS: ReactionCategory = {
  id: "fraction-counts",
  name: "Number of Fractions",
  roles: ["therapist"],
  values: [
    { label: "Bone palliative single fx", value: 1, unit: "fx" },
    { label: "Lung SBRT 54 Gy", value: 3, unit: "fx" },
    { label: "Lung SBRT 50 Gy", value: 5, unit: "fx" },
    { label: "Short course rectal 25 Gy", value: 5, unit: "fx" },
    { label: "WBRT 30 Gy", value: 10, unit: "fx" },
    { label: "Breast hypo 42.56 Gy", value: 16, unit: "fx" },
    { label: "Cervix EBRT 45 Gy", value: 25, unit: "fx" },
    { label: "Breast conventional 50 Gy", value: 25, unit: "fx" },
    { label: "H&N 70 Gy", value: 35, unit: "fx" },
    { label: "Prostate 78 Gy", value: 39, unit: "fx" },
  ],
};

const DOSE_PER_FRACTION: ReactionCategory = {
  id: "dose-per-fx",
  name: "Dose Per Fraction",
  roles: ["therapist", "oncologist"],
  values: [
    { label: "Breast conventional", value: 2.0, unit: "Gy/fx" },
    { label: "H&N definitive", value: 2.0, unit: "Gy/fx" },
    { label: "Prostate conventional", value: 2.0, unit: "Gy/fx" },
    { label: "Breast hypo", value: 2.66, unit: "Gy/fx" },
    { label: "WBRT", value: 3.0, unit: "Gy/fx" },
    { label: "Short course rectal", value: 5.0, unit: "Gy/fx" },
    { label: "Bone palliative single", value: 8.0, unit: "Gy/fx" },
    { label: "Lung SBRT 5fx", value: 10.0, unit: "Gy/fx" },
    { label: "Lung SBRT 3fx", value: 18.0, unit: "Gy/fx" },
    { label: "SRS single fraction", value: 20.0, unit: "Gy/fx" },
  ],
};

const GANTRY_ANGLES: ReactionCategory = {
  id: "gantry-angles",
  name: "Gantry Angles",
  roles: ["therapist"],
  values: [
    { label: "AP field gantry angle", value: 0, unit: "°" },
    { label: "Right lateral gantry", value: 90, unit: "°" },
    { label: "Breast tangent lateral (typical)", value: 130, unit: "°" },
    { label: "PA field gantry angle", value: 180, unit: "°" },
    { label: "Left lateral gantry", value: 270, unit: "°" },
    { label: "Breast tangent medial (typical)", value: 310, unit: "°" },
  ],
};

// ── RADIATION ONCOLOGIST CATEGORIES ─────────────────────────

const OAR_CONSTRAINTS: ReactionCategory = {
  id: "oar-constraints",
  name: "OAR Dose Constraints",
  roles: ["oncologist", "dosimetrist"],
  values: [
    { label: "Heart mean (breast)", value: 4, unit: "Gy" },
    { label: "Lens max", value: 10, unit: "Gy" },
    { label: "Kidney mean (each)", value: 18, unit: "Gy" },
    { label: "Lung mean (bilateral)", value: 20, unit: "Gy" },
    { label: "Parotid mean (each)", value: 26, unit: "Gy" },
    { label: "Liver mean", value: 30, unit: "Gy" },
    { label: "Esophagus mean", value: 34, unit: "Gy" },
    { label: "Spinal cord max", value: 45, unit: "Gy" },
    { label: "Cochlea mean", value: 45, unit: "Gy" },
    { label: "Larynx mean", value: 45, unit: "Gy" },
    { label: "Femoral head max", value: 52, unit: "Gy" },
    { label: "Small bowel max", value: 52, unit: "Gy" },
    { label: "Penile bulb mean", value: 52, unit: "Gy" },
    { label: "Brainstem max", value: 54, unit: "Gy" },
    { label: "Optic nerve/chiasm max", value: 54, unit: "Gy" },
    { label: "Brachial plexus max", value: 66, unit: "Gy" },
  ],
};

const ALPHA_BETA_RATIOS: ReactionCategory = {
  id: "alpha-beta",
  name: "Alpha/Beta Ratios",
  roles: ["oncologist", "physicist"],
  values: [
    { label: "α/β prostate", value: 1.5, unit: "Gy" },
    { label: "α/β spinal cord", value: 2, unit: "Gy" },
    { label: "α/β melanoma", value: 2.5, unit: "Gy" },
    { label: "α/β late effects (general)", value: 3, unit: "Gy" },
    { label: "α/β lung (late)", value: 3, unit: "Gy" },
    { label: "α/β breast", value: 4, unit: "Gy" },
    { label: "α/β most tumors", value: 10, unit: "Gy" },
  ],
};

const TD_VALUES: ReactionCategory = {
  id: "td-values",
  name: "Tissue Tolerance Doses (TD 5/5)",
  roles: ["oncologist"],
  values: [
    { label: "TD 5/5 whole lung", value: 17.5, unit: "Gy" },
    { label: "TD 5/5 whole kidney", value: 23, unit: "Gy" },
    { label: "TD 50/5 whole lung", value: 24.5, unit: "Gy" },
    { label: "TD 5/5 whole liver", value: 30, unit: "Gy" },
    { label: "TD 5/5 whole heart", value: 40, unit: "Gy" },
  ],
};

const TUMOR_STAGING: ReactionCategory = {
  id: "tumor-staging",
  name: "Tumor Staging Sizes",
  roles: ["oncologist"],
  values: [
    { label: "T1a lung (NSCLC)", value: 1, unit: "cm" },
    { label: "T1b lung", value: 2, unit: "cm" },
    { label: "T1 breast (max)", value: 2, unit: "cm" },
    { label: "GTV typical H&N T1", value: 2, unit: "cm" },
    { label: "T1c lung", value: 3, unit: "cm" },
    { label: "T2a lung", value: 4, unit: "cm" },
    { label: "T2 breast (max)", value: 5, unit: "cm" },
    { label: "GTV typical H&N T3", value: 5, unit: "cm" },
    { label: "T2b lung", value: 5, unit: "cm" },
    { label: "T3 lung (max)", value: 7, unit: "cm" },
  ],
};

const SURVIVAL_STATS: ReactionCategory = {
  id: "survival",
  name: "Survival / Outcome Stats",
  roles: ["oncologist"],
  values: [
    { label: "Stage IV NSCLC 5yr survival", value: 5, unit: "%" },
    { label: "Pancreatic cancer median survival (metastatic)", value: 6, unit: "months" },
    { label: "GBM median survival", value: 15, unit: "months" },
    { label: "Metastatic prostate 5yr survival", value: 30, unit: "%" },
    { label: "HPV− oropharynx 5yr survival", value: 50, unit: "%" },
    { label: "Stage I NSCLC 5yr survival", value: 70, unit: "%" },
    { label: "HPV+ oropharynx 5yr survival", value: 80, unit: "%" },
    { label: "Early Hodgkin lymphoma cure rate", value: 90, unit: "%" },
    { label: "Localized prostate 5yr survival", value: 99, unit: "%" },
  ],
};

// ── MEDICAL PHYSICIST CATEGORIES ────────────────────────────

const PHOTON_BEAM_DMAX: ReactionCategory = {
  id: "photon-dmax",
  name: "Photon Beam dmax",
  roles: ["physicist"],
  values: [
    { label: "6 MV dmax", value: 1.5, unit: "cm" },
    { label: "10 MV dmax", value: 2.5, unit: "cm" },
    { label: "15 MV dmax", value: 3.0, unit: "cm" },
    { label: "18 MV dmax", value: 3.5, unit: "cm" },
  ],
};

const ELECTRON_R90: ReactionCategory = {
  id: "electron-r90",
  name: "Electron R90 Depth",
  roles: ["physicist"],
  values: [
    { label: "6 MeV electron R90", value: 1.8, unit: "cm" },
    { label: "9 MeV electron R90", value: 2.7, unit: "cm" },
    { label: "12 MeV electron R90", value: 3.6, unit: "cm" },
    { label: "16 MeV electron R90", value: 4.8, unit: "cm" },
    { label: "20 MeV electron R90", value: 6.0, unit: "cm" },
  ],
};

const GAMMA_ENERGIES: ReactionCategory = {
  id: "gamma-energies",
  name: "Gamma Ray Energies",
  roles: ["physicist"],
  values: [
    { label: "Ir-192 average energy", value: 0.38, unit: "MeV" },
    { label: "Cs-137 gamma energy", value: 0.662, unit: "MeV" },
    { label: "Co-60 average gamma energy", value: 1.25, unit: "MeV" },
  ],
};

const QA_TOLERANCES: ReactionCategory = {
  id: "qa-tolerances",
  name: "QA Tolerances",
  roles: ["physicist", "engineer"],
  values: [
    { label: "SRS localization accuracy", value: 1, unit: "mm" },
    { label: "MLC position accuracy", value: 1, unit: "mm" },
    { label: "Laser alignment", value: 1, unit: "mm" },
    { label: "Couch position readout", value: 1, unit: "mm" },
    { label: "Light/radiation field coincidence", value: 2, unit: "mm" },
    { label: "IGRT 2D/2D registration", value: 2, unit: "mm" },
  ],
};

const OUTPUT_TOLERANCES: ReactionCategory = {
  id: "output-tolerances",
  name: "Linac Output Tolerances",
  roles: ["physicist"],
  values: [
    { label: "Annual linac output (calibration)", value: 1, unit: "%" },
    { label: "Monthly linac output (TG-142)", value: 2, unit: "%" },
    { label: "Daily linac output (TG-142)", value: 3, unit: "%" },
  ],
};

const SHIELDING_TVL: ReactionCategory = {
  id: "shielding-tvl",
  name: "Shielding TVL Values",
  roles: ["physicist", "engineer"],
  values: [
    { label: "Ir-192 TVL in lead", value: 1.6, unit: "cm" },
    { label: "Cs-137 TVL in lead", value: 2.1, unit: "cm" },
    { label: "Co-60 TVL in lead", value: 4.0, unit: "cm" },
    { label: "6 MV TVL in concrete", value: 34, unit: "cm" },
    { label: "10 MV TVL in concrete", value: 41, unit: "cm" },
    { label: "18 MV TVL in concrete", value: 45, unit: "cm" },
  ],
};

const CALIBRATION_REF: ReactionCategory = {
  id: "calibration-ref",
  name: "Calibration Reference Values",
  roles: ["physicist"],
  values: [
    { label: "TG-43 reference distance", value: 1, unit: "cm" },
    { label: "TG-51 reference depth", value: 10, unit: "cm" },
    { label: "TG-51 field size", value: 100, unit: "cm²" },
    { label: "TG-51 SSD", value: 100, unit: "cm" },
    { label: "kQ farmer chamber 6 MV", value: 0.994, unit: "" },
    { label: "kQ farmer chamber 18 MV", value: 0.977, unit: "" },
  ],
};

// ── ENGINEER CATEGORIES ─────────────────────────────────────

const ELECTRICAL_SAFETY: ReactionCategory = {
  id: "electrical-safety",
  name: "Electrical Safety Thresholds",
  roles: ["engineer"],
  values: [
    { label: "Microshock lethal current", value: 100, unit: "µA" },
    { label: "Equipment chassis leakage limit", value: 100, unit: "µA" },
    { label: "Hospital-grade outlet leakage", value: 300, unit: "µA" },
    { label: "Macroshock perception threshold", value: 1, unit: "mA" },
    { label: "Isolated power alarm threshold", value: 2, unit: "mA" },
    { label: "Macroshock let-go threshold", value: 10, unit: "mA" },
    { label: "Macroshock ventricular fibrillation", value: 100, unit: "mA" },
  ],
};

const EQUIPMENT_SPECS: ReactionCategory = {
  id: "equipment-specs",
  name: "Equipment Specifications",
  roles: ["engineer"],
  values: [
    { label: "MLC leaf width (micro/HD)", value: 2.5, unit: "mm" },
    { label: "MLC leaf width (standard)", value: 5, unit: "mm" },
    { label: "Magnetron typical peak power", value: 2, unit: "MW" },
    { label: "Klystron typical peak power", value: 5, unit: "MW" },
    { label: "Typical linac dose rate", value: 600, unit: "MU/min" },
    { label: "CyberKnife dose rate", value: 1000, unit: "MU/min" },
    { label: "FFF dose rate (6 MV)", value: 1400, unit: "MU/min" },
    { label: "FFF dose rate (10 MV)", value: 2400, unit: "MU/min" },
    { label: "S-band frequency", value: 3000, unit: "MHz" },
    { label: "X-band frequency", value: 9000, unit: "MHz" },
    { label: "Gamma Knife sources (Icon)", value: 192, unit: "sources" },
  ],
};

const MECHANICAL_TOLERANCES: ReactionCategory = {
  id: "mechanical-tolerances",
  name: "Mechanical Tolerances",
  roles: ["engineer"],
  values: [
    { label: "Gantry rotation accuracy", value: 0.5, unit: "°" },
    { label: "Gantry isocenter wobble", value: 1, unit: "mm" },
    { label: "Collimator rotation isocenter", value: 1, unit: "mm" },
    { label: "SRS end-to-end localization", value: 1, unit: "mm" },
    { label: "CBCT geometric accuracy", value: 1, unit: "mm" },
    { label: "Couch sag under load", value: 2, unit: "mm" },
    { label: "Couch max load capacity", value: 200, unit: "kg" },
  ],
};

// ── DOSIMETRIST CATEGORIES ──────────────────────────────────

const PTV_MARGINS: ReactionCategory = {
  id: "ptv-margins",
  name: "CTV-to-PTV Margins",
  roles: ["dosimetrist"],
  values: [
    { label: "Brain SRS (frameless) margin", value: 1.5, unit: "mm" },
    { label: "Brain SRT margin", value: 2.5, unit: "mm" },
    { label: "Prostate (posterior) margin", value: 4, unit: "mm" },
    { label: "H&N margin", value: 4, unit: "mm" },
    { label: "Lung SBRT margin", value: 5, unit: "mm" },
    { label: "Prostate margin", value: 6, unit: "mm" },
    { label: "Pelvis (nodes) margin", value: 7, unit: "mm" },
  ],
};

const PLAN_QUALITY: ReactionCategory = {
  id: "plan-quality",
  name: "Plan Quality Metrics",
  roles: ["dosimetrist"],
  values: [
    { label: "Ideal homogeneity index (HI)", value: 0, unit: "" },
    { label: "Acceptable HI max", value: 0.1, unit: "" },
    { label: "Ideal conformity index (CI)", value: 1.0, unit: "" },
    { label: "Ideal gradient index (GI) max", value: 3.0, unit: "" },
    { label: "Gamma pass rate (2%/2mm) threshold", value: 90, unit: "%" },
    { label: "Gamma pass rate (3%/3mm) threshold", value: 95, unit: "%" },
  ],
};

const TISSUE_DENSITIES: ReactionCategory = {
  id: "tissue-densities",
  name: "Tissue Densities",
  roles: ["dosimetrist", "physicist"],
  values: [
    { label: "Air density", value: 0.001, unit: "g/cm³" },
    { label: "Lung (inflated) density", value: 0.26, unit: "g/cm³" },
    { label: "Fat density", value: 0.92, unit: "g/cm³" },
    { label: "Water density", value: 1.0, unit: "g/cm³" },
    { label: "Muscle density", value: 1.04, unit: "g/cm³" },
    { label: "Soft tissue density", value: 1.06, unit: "g/cm³" },
    { label: "Cartilage density", value: 1.1, unit: "g/cm³" },
    { label: "Cancellous bone density", value: 1.18, unit: "g/cm³" },
    { label: "Cortical bone density", value: 1.85, unit: "g/cm³" },
    { label: "Titanium implant density", value: 4.5, unit: "g/cm³" },
  ],
};

const BEAM_ARRANGEMENTS: ReactionCategory = {
  id: "beam-arrangements",
  name: "Typical Beam Counts",
  roles: ["dosimetrist"],
  values: [
    { label: "3DCRT whole brain", value: 2, unit: "fields" },
    { label: "3DCRT breast tangents", value: 2, unit: "fields" },
    { label: "VMAT single arc prostate", value: 2, unit: "arcs" },
    { label: "VMAT lung SBRT", value: 2, unit: "arcs" },
    { label: "VMAT H&N", value: 3, unit: "arcs" },
    { label: "3DCRT pelvis (4-field box)", value: 4, unit: "fields" },
    { label: "IMRT prostate", value: 6, unit: "fields" },
    { label: "IMRT H&N", value: 8, unit: "fields" },
  ],
};

// ── ALL CATEGORIES ──────────────────────────────────────────

export const ALL_CATEGORIES: ReactionCategory[] = [
  // Shared
  ISOTOPE_HALF_LIVES,
  DOSE_LIMITS,
  CT_NUMBERS,
  // Therapist
  SETUP_TOLERANCES,
  FRACTIONATION_TOTAL_DOSE,
  FRACTION_COUNTS,
  DOSE_PER_FRACTION,
  GANTRY_ANGLES,
  // Oncologist
  OAR_CONSTRAINTS,
  ALPHA_BETA_RATIOS,
  TD_VALUES,
  TUMOR_STAGING,
  SURVIVAL_STATS,
  // Physicist
  PHOTON_BEAM_DMAX,
  ELECTRON_R90,
  GAMMA_ENERGIES,
  QA_TOLERANCES,
  OUTPUT_TOLERANCES,
  SHIELDING_TVL,
  CALIBRATION_REF,
  // Engineer
  ELECTRICAL_SAFETY,
  EQUIPMENT_SPECS,
  MECHANICAL_TOLERANCES,
  // Dosimetrist
  PTV_MARGINS,
  PLAN_QUALITY,
  TISSUE_DENSITIES,
  BEAM_ARRANGEMENTS,
];

// ── PAIR GENERATION ─────────────────────────────────────────

export interface ReactionPair {
  left: ReactionValue;
  right: ReactionValue;
  prompt: "higher" | "lower";
  category: string;
}

/**
 * Get categories available for a given role.
 * "all" returns everything; specific roles get shared + their role-specific categories.
 */
export function getCategoriesForRole(role: ReactionRole): ReactionCategory[] {
  if (role === "all") return ALL_CATEGORIES;
  return ALL_CATEGORIES.filter(
    (c) => c.roles.includes("all") || c.roles.includes(role)
  );
}

/**
 * Generate a pair for a given round.
 * Higher rounds → closer values (harder) and more category variety.
 */
export function generatePair(
  categories: ReactionCategory[],
  round: number,
  usedCategoryIds: Set<string>
): ReactionPair {
  // Prefer categories not recently used
  let pool = categories.filter((c) => !usedCategoryIds.has(c.id) && c.values.length >= 2);
  if (pool.length === 0) {
    pool = categories.filter((c) => c.values.length >= 2);
  }

  const category = pool[Math.floor(Math.random() * pool.length)];
  const sorted = [...category.values].sort((a, b) => a.value - b.value);

  // Control pair closeness based on round
  let minGap: number;
  if (round < 5) {
    minGap = Math.max(3, Math.floor(sorted.length * 0.4)); // far apart
  } else if (round < 10) {
    minGap = Math.max(2, Math.floor(sorted.length * 0.2)); // moderate
  } else if (round < 15) {
    minGap = 1; // adjacent ok
  } else {
    minGap = 1; // adjacent — hardest
  }

  // Pick two indices at least minGap apart
  let idxA: number, idxB: number;
  let attempts = 0;
  do {
    idxA = Math.floor(Math.random() * sorted.length);
    idxB = Math.floor(Math.random() * sorted.length);
    attempts++;
  } while (
    (idxA === idxB || Math.abs(idxA - idxB) < minGap || sorted[idxA].value === sorted[idxB].value) &&
    attempts < 50
  );

  // Fallback: just pick first and last if we couldn't find a good pair
  if (idxA === idxB || sorted[idxA].value === sorted[idxB].value) {
    idxA = 0;
    idxB = sorted.length - 1;
  }

  const prompt: "higher" | "lower" = Math.random() < 0.5 ? "higher" : "lower";

  // Randomize left/right
  const [left, right] =
    Math.random() < 0.5
      ? [sorted[idxA], sorted[idxB]]
      : [sorted[idxB], sorted[idxA]];

  return { left, right, prompt, category: category.name };
}
