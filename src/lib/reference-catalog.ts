// ── Reference Catalog ─────────────────────────────────────
// Maps common medical physics references (TG reports, ICRP, ICRU, NCRP,
// textbooks) so explanation text can auto-link to source material.

export interface Reference {
  id: string;
  type: "tg" | "icrp" | "icru" | "ncrp" | "textbook";
  title: string;
  url: string | null;
}

const catalog: Record<string, Reference> = {
  // ── AAPM Task Group Reports ───────────────────────────────
  "TG-21": {
    id: "TG-21",
    type: "tg",
    title: "A protocol for the determination of absorbed dose from high-energy photon and electron beams",
    url: "https://doi.org/10.1118/1.595396",
  },
  "TG-25": {
    id: "TG-25",
    type: "tg",
    title: "Clinical electron-beam dosimetry",
    url: "https://doi.org/10.1118/1.597628",
  },
  "TG-43": {
    id: "TG-43",
    type: "tg",
    title: "Dosimetry of interstitial brachytherapy sources",
    url: "https://doi.org/10.1118/1.597716",
  },
  "TG-51": {
    id: "TG-51",
    type: "tg",
    title: "Protocol for clinical reference dosimetry of high-energy photon and electron beams",
    url: "https://doi.org/10.1118/1.598691",
  },
  "TG-101": {
    id: "TG-101",
    type: "tg",
    title: "Stereotactic body radiation therapy",
    url: "https://doi.org/10.1118/1.3438081",
  },
  "TG-106": {
    id: "TG-106",
    type: "tg",
    title: "Accelerator beam data commissioning equipment and procedures",
    url: "https://doi.org/10.1118/1.2928070",
  },
  "TG-119": {
    id: "TG-119",
    type: "tg",
    title: "IMRT commissioning: multiple institution planning and dosimetry comparisons",
    url: "https://doi.org/10.1118/1.3521957",
  },
  "TG-135": {
    id: "TG-135",
    type: "tg",
    title: "Quality assurance for robotic radiosurgery",
    url: "https://doi.org/10.1118/1.3578836",
  },
  "TG-142": {
    id: "TG-142",
    type: "tg",
    title: "Quality assurance of medical accelerators",
    url: "https://doi.org/10.1118/1.3190392",
  },
  "TG-155": {
    id: "TG-155",
    type: "tg",
    title: "Small field dosimetry",
    url: "https://doi.org/10.1118/1.4934079",
  },
  "TG-218": {
    id: "TG-218",
    type: "tg",
    title: "Tolerance limits and methodologies for IMRT measurement-based verification QA",
    url: "https://doi.org/10.1118/1.5007723",
  },
  "TG-263": {
    id: "TG-263",
    type: "tg",
    title: "Standardizing nomenclatures in radiation oncology",
    url: "https://doi.org/10.1016/j.ijrobp.2017.12.013",
  },

  // ── ICRP Publications ─────────────────────────────────────
  "ICRP-60": {
    id: "ICRP-60",
    type: "icrp",
    title: "1990 Recommendations of the International Commission on Radiological Protection",
    url: "https://doi.org/10.1016/0146-6453(91)90066-P",
  },
  "ICRP-103": {
    id: "ICRP-103",
    type: "icrp",
    title: "The 2007 Recommendations of the International Commission on Radiological Protection",
    url: "https://doi.org/10.1016/j.icrp.2007.10.003",
  },
  "ICRP-116": {
    id: "ICRP-116",
    type: "icrp",
    title: "Conversion coefficients for radiological protection quantities for external radiation exposures",
    url: "https://doi.org/10.1016/j.icrp.2011.10.001",
  },

  // ── ICRU Reports ──────────────────────────────────────────
  "ICRU-50": {
    id: "ICRU-50",
    type: "icru",
    title: "Prescribing, recording, and reporting photon beam therapy",
    url: null,
  },
  "ICRU-62": {
    id: "ICRU-62",
    type: "icru",
    title: "Prescribing, recording, and reporting photon beam therapy (Supplement to ICRU-50)",
    url: null,
  },
  "ICRU-83": {
    id: "ICRU-83",
    type: "icru",
    title: "Prescribing, recording, and reporting photon-beam IMRT",
    url: "https://doi.org/10.1093/jicru/ndq002",
  },
  "ICRU-91": {
    id: "ICRU-91",
    type: "icru",
    title: "Prescribing, recording, and reporting of stereotactic treatments with small photon beams",
    url: "https://doi.org/10.1093/jicru/ndx017",
  },

  // ── NCRP Reports ──────────────────────────────────────────
  "NCRP-147": {
    id: "NCRP-147",
    type: "ncrp",
    title: "Structural shielding design for medical X-ray imaging facilities",
    url: null,
  },
  "NCRP-151": {
    id: "NCRP-151",
    type: "ncrp",
    title: "Structural shielding design and evaluation for megavoltage X- and gamma-ray radiotherapy facilities",
    url: null,
  },

  // ── Textbooks ─────────────────────────────────────────────
  "Khan": {
    id: "Khan",
    type: "textbook",
    title: "Khan's The Physics of Radiation Therapy",
    url: null,
  },
  "Attix": {
    id: "Attix",
    type: "textbook",
    title: "Introduction to Radiological Physics and Radiation Dosimetry",
    url: null,
  },
  "Bushberg": {
    id: "Bushberg",
    type: "textbook",
    title: "The Essential Physics of Medical Imaging",
    url: null,
  },
};

// ── Patterns for auto-extraction ────────────────────────────
const patterns: { regex: RegExp; normalize: (match: string) => string }[] = [
  {
    regex: /TG[-\s]?\d+/gi,
    normalize: (m) => "TG-" + m.replace(/^TG[-\s]?/i, ""),
  },
  {
    regex: /ICRP[-\s]?\d+/gi,
    normalize: (m) => "ICRP-" + m.replace(/^ICRP[-\s]?/i, ""),
  },
  {
    regex: /ICRU[-\s]?\d+/gi,
    normalize: (m) => "ICRU-" + m.replace(/^ICRU[-\s]?/i, ""),
  },
  {
    regex: /NCRP[-\s]?\d+/gi,
    normalize: (m) => "NCRP-" + m.replace(/^NCRP[-\s]?/i, ""),
  },
  {
    regex: /\bKhan(?:'s)?\b/gi,
    normalize: () => "Khan",
  },
  {
    regex: /\bAttix\b/gi,
    normalize: () => "Attix",
  },
  {
    regex: /\bBushberg\b/gi,
    normalize: () => "Bushberg",
  },
];

/**
 * Scan explanation text for known reference identifiers and return
 * matching Reference objects. Deduplicates by id.
 */
export function extractReferences(explanation: string): Reference[] {
  const found = new Map<string, Reference>();

  for (const { regex, normalize } of patterns) {
    let match: RegExpExecArray | null;
    // Reset lastIndex for global regex
    regex.lastIndex = 0;
    while ((match = regex.exec(explanation)) !== null) {
      const key = normalize(match[0]);
      if (catalog[key] && !found.has(key)) {
        found.set(key, catalog[key]);
      }
    }
  }

  return Array.from(found.values());
}

/**
 * Look up a single reference by its canonical id (e.g. "TG-51").
 */
export function getReference(id: string): Reference | undefined {
  return catalog[id];
}

export default catalog;
