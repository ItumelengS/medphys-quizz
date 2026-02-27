/**
 * Standalone crossword clues — not tied to the quiz question bank.
 * Each entry has a short crossword-style clue and a single-word answer (3-15 letters).
 */

export interface CrosswordClue {
  id: string;
  clue: string;
  answer: string;
  category: string;
}

export const crosswordClues: CrosswordClue[] = [
  // ── Radiation Physics ──────────────────────────────────────
  { id: "cw-001", clue: "SI unit of absorbed dose", answer: "GRAY", category: "Radiation Physics" },
  { id: "cw-002", clue: "Particle with no electric charge found in the nucleus", answer: "NEUTRON", category: "Radiation Physics" },
  { id: "cw-003", clue: "Electromagnetic radiation used in diagnostic imaging", answer: "XRAY", category: "Radiation Physics" },
  { id: "cw-004", clue: "Process where a photon ejects an inner-shell electron", answer: "PHOTOELECTRIC", category: "Radiation Physics" },
  { id: "cw-005", clue: "Scattering where photon loses energy to an electron", answer: "COMPTON", category: "Radiation Physics" },
  { id: "cw-006", clue: "Photon energy threshold effect producing electron-positron pair", answer: "PAIR", category: "Radiation Physics" },
  { id: "cw-007", clue: "Radioactive decay emitting a helium nucleus", answer: "ALPHA", category: "Radiation Physics" },
  { id: "cw-008", clue: "High-energy electron emitted during nuclear decay", answer: "BETA", category: "Radiation Physics" },
  { id: "cw-009", clue: "High-energy photon from nuclear de-excitation", answer: "GAMMA", category: "Radiation Physics" },
  { id: "cw-010", clue: "Time for half the atoms in a sample to decay", answer: "HALFLIFE", category: "Radiation Physics" },
  { id: "cw-011", clue: "Number of disintegrations per second (unit)", answer: "BECQUEREL", category: "Radiation Physics" },
  { id: "cw-012", clue: "Unit of radiation exposure in air", answer: "ROENTGEN", category: "Radiation Physics" },
  { id: "cw-013", clue: "Ratio of mass attenuation coefficients in tissue vs water", answer: "STOPPING", category: "Radiation Physics" },
  { id: "cw-014", clue: "Radiation weighting factor multiplied by dose gives this quantity", answer: "EQUIVALENT", category: "Radiation Physics" },
  { id: "cw-015", clue: "SI unit of equivalent dose", answer: "SIEVERT", category: "Radiation Physics" },
  { id: "cw-016", clue: "Emission of light when charged particle exceeds speed of light in a medium", answer: "CHERENKOV", category: "Radiation Physics" },
  { id: "cw-017", clue: "Radiation produced when fast electrons are decelerated", answer: "BREMSSTRAHLUNG", category: "Radiation Physics" },
  { id: "cw-018", clue: "The atomic number, Z, represents this count", answer: "PROTONS", category: "Radiation Physics" },
  { id: "cw-019", clue: "Energy lost per unit path length by a charged particle", answer: "LET", category: "Radiation Physics" },
  { id: "cw-020", clue: "Coherent scattering with no energy transfer", answer: "RAYLEIGH", category: "Radiation Physics" },
  { id: "cw-021", clue: "Region where electronic equilibrium is established", answer: "BUILDUP", category: "Radiation Physics" },
  { id: "cw-022", clue: "Inverse square law governs this property of radiation with distance", answer: "INTENSITY", category: "Radiation Physics" },
  { id: "cw-023", clue: "Fraction of photons removed per unit thickness", answer: "ATTENUATION", category: "Radiation Physics" },
  { id: "cw-024", clue: "Minimum photon energy to eject a K-shell electron", answer: "EDGE", category: "Radiation Physics" },

  // ── Radiotherapy ───────────────────────────────────────────
  { id: "cw-025", clue: "Machine that produces megavoltage photon beams for treatment", answer: "LINAC", category: "Radiotherapy" },
  { id: "cw-026", clue: "Radioactive source used in older teletherapy units", answer: "COBALT", category: "Radiotherapy" },
  { id: "cw-027", clue: "Treatment volume receiving the prescribed dose (abbr.)", answer: "PTV", category: "Radiotherapy" },
  { id: "cw-028", clue: "Shaped device that modulates beam intensity across the field", answer: "MLC", category: "Radiotherapy" },
  { id: "cw-029", clue: "Technique delivering radiation from multiple modulated angles", answer: "IMRT", category: "Radiotherapy" },
  { id: "cw-030", clue: "Arc-based therapy delivering dose while gantry rotates", answer: "VMAT", category: "Radiotherapy" },
  { id: "cw-031", clue: "Small-field high-dose treatment for tumours", answer: "STEREOTACTIC", category: "Radiotherapy" },
  { id: "cw-032", clue: "Radiation therapy using sealed sources placed near the tumour", answer: "BRACHY", category: "Radiotherapy" },
  { id: "cw-033", clue: "Depth of maximum dose in a photon beam", answer: "DMAX", category: "Radiotherapy" },
  { id: "cw-034", clue: "Device that flattens the photon beam profile", answer: "FILTER", category: "Radiotherapy" },
  { id: "cw-035", clue: "Volume encompassing the tumour plus margins for microscopic spread", answer: "CTV", category: "Radiotherapy" },
  { id: "cw-036", clue: "The gross visible or palpable tumour (abbr.)", answer: "GTV", category: "Radiotherapy" },
  { id: "cw-037", clue: "Dose distribution map overlaid on patient anatomy", answer: "ISODOSE", category: "Radiotherapy" },
  { id: "cw-038", clue: "Percentage of prescribed dose at a reference point", answer: "PDD", category: "Radiotherapy" },
  { id: "cw-039", clue: "Heavy charged particles with a Bragg peak", answer: "PROTON", category: "Radiotherapy" },
  { id: "cw-040", clue: "Tissue-equivalent device placed on skin to modify dose", answer: "BOLUS", category: "Radiotherapy" },
  { id: "cw-041", clue: "Alloy used to shape custom treatment field blocks", answer: "CERROBEND", category: "Radiotherapy" },
  { id: "cw-042", clue: "Daily image guidance before treatment (abbr.)", answer: "IGRT", category: "Radiotherapy" },
  { id: "cw-043", clue: "Small radiation units delivered per treatment session", answer: "FRACTION", category: "Radiotherapy" },
  { id: "cw-044", clue: "Ratio comparing biological effect of different fractionation schemes", answer: "BED", category: "Radiotherapy" },
  { id: "cw-045", clue: "Region where electron beams stop and dose drops rapidly", answer: "FALLOFF", category: "Radiotherapy" },
  { id: "cw-046", clue: "Device that verifies delivered dose in two dimensions", answer: "PORTAL", category: "Radiotherapy" },
  { id: "cw-047", clue: "Organ at risk with strict dose limits (abbr.)", answer: "OAR", category: "Radiotherapy" },
  { id: "cw-048", clue: "Wedge-shaped modifier that tilts the isodose curves", answer: "WEDGE", category: "Radiotherapy" },

  // ── Diagnostic Imaging & Radiology ─────────────────────────
  { id: "cw-049", clue: "Imaging modality using magnetic fields and radiofrequency pulses", answer: "MRI", category: "Diagnostic Imaging" },
  { id: "cw-050", clue: "Cross-sectional imaging using rotating X-ray tube", answer: "CT", category: "Diagnostic Imaging" },
  { id: "cw-051", clue: "Imaging technique using high-frequency sound waves", answer: "ULTRASOUND", category: "Diagnostic Imaging" },
  { id: "cw-052", clue: "Nuclear medicine scan detecting positron-emitting tracers", answer: "PET", category: "Diagnostic Imaging" },
  { id: "cw-053", clue: "Scale measuring X-ray attenuation in CT images", answer: "HOUNSFIELD", category: "Diagnostic Imaging" },
  { id: "cw-054", clue: "Receptor that converts X-rays directly to digital signal", answer: "DETECTOR", category: "Diagnostic Imaging" },
  { id: "cw-055", clue: "Unwanted exposure creating fog on a radiograph", answer: "SCATTER", category: "Diagnostic Imaging" },
  { id: "cw-056", clue: "Grid placed before detector to reduce scattered radiation", answer: "GRID", category: "Diagnostic Imaging" },
  { id: "cw-057", clue: "Measure of spatial detail in an image", answer: "RESOLUTION", category: "Diagnostic Imaging" },
  { id: "cw-058", clue: "Difference in signal between structures in an image", answer: "CONTRAST", category: "Diagnostic Imaging" },
  { id: "cw-059", clue: "Radioactive tracer commonly used in PET scans (abbr.)", answer: "FDG", category: "Diagnostic Imaging" },
  { id: "cw-060", clue: "Rotating component housing the X-ray tube in CT", answer: "GANTRY", category: "Diagnostic Imaging" },
  { id: "cw-061", clue: "Mathematical method used to reconstruct CT images", answer: "ALGORITHM", category: "Diagnostic Imaging" },
  { id: "cw-062", clue: "Artifact caused by patient movement during a scan", answer: "MOTION", category: "Diagnostic Imaging" },
  { id: "cw-063", clue: "Substance injected to enhance tissue visibility on imaging", answer: "CONTRAST", category: "Diagnostic Imaging" },
  { id: "cw-064", clue: "Screen that converts X-rays to visible light", answer: "PHOSPHOR", category: "Diagnostic Imaging" },
  { id: "cw-065", clue: "Measure of dose in mammography and CT (abbr.)", answer: "CTDl", category: "Diagnostic Imaging" },
  { id: "cw-066", clue: "Helical CT scanning mode", answer: "SPIRAL", category: "Diagnostic Imaging" },
  { id: "cw-067", clue: "MRI sequence weighting sensitive to water content", answer: "FLAIR", category: "Diagnostic Imaging" },
  { id: "cw-068", clue: "Precession frequency of protons in a magnetic field", answer: "LARMOR", category: "Diagnostic Imaging" },

  // ── Radiation Protection & Safety ──────────────────────────
  { id: "cw-069", clue: "Principle: keep doses as low as reasonably achievable", answer: "ALARA", category: "Radiation Protection" },
  { id: "cw-070", clue: "Material used for radiation shielding in walls", answer: "LEAD", category: "Radiation Protection" },
  { id: "cw-071", clue: "Device worn to measure personal radiation exposure", answer: "DOSIMETER", category: "Radiation Protection" },
  { id: "cw-072", clue: "Survey instrument detecting ionising radiation", answer: "GEIGER", category: "Radiation Protection" },
  { id: "cw-073", clue: "Barrier protecting staff from primary radiation beam", answer: "SHIELD", category: "Radiation Protection" },
  { id: "cw-074", clue: "Maximum permissible dose for radiation workers annually", answer: "LIMIT", category: "Radiation Protection" },
  { id: "cw-075", clue: "Type of dosimeter using thermally stimulated luminescence", answer: "TLD", category: "Radiation Protection" },
  { id: "cw-076", clue: "Factor accounting for biological effectiveness of radiation type", answer: "WEIGHTING", category: "Radiation Protection" },
  { id: "cw-077", clue: "Protective garment worn during fluoroscopy", answer: "APRON", category: "Radiation Protection" },
  { id: "cw-078", clue: "Concrete thickness reducing beam intensity by half", answer: "HVL", category: "Radiation Protection" },
  { id: "cw-079", clue: "Controlled area requiring restricted access due to radiation", answer: "ZONE", category: "Radiation Protection" },
  { id: "cw-080", clue: "Stochastic effect of radiation with no dose threshold", answer: "CANCER", category: "Radiation Protection" },
  { id: "cw-081", clue: "Deterministic effect requiring a threshold dose", answer: "ERYTHEMA", category: "Radiation Protection" },

  // ── Dosimetry ──────────────────────────────────────────────
  { id: "cw-082", clue: "Gold standard dosimeter using charge collected in air", answer: "IONCHAMBER", category: "Dosimetry" },
  { id: "cw-083", clue: "Small radiation-sensitive crystal used for point dose measurements", answer: "DIODE", category: "Dosimetry" },
  { id: "cw-084", clue: "Self-developing film used for rapid dose verification", answer: "GAFCHROMIC", category: "Dosimetry" },
  { id: "cw-085", clue: "Phantom material simulating water for beam calibration", answer: "WATER", category: "Dosimetry" },
  { id: "cw-086", clue: "Protocol for clinical reference dosimetry (TG number)", answer: "TG51", category: "Dosimetry" },
  { id: "cw-087", clue: "Correction factor for ion recombination in a chamber", answer: "POLARITY", category: "Dosimetry" },
  { id: "cw-088", clue: "Ratio of dose at depth to dose at reference depth", answer: "TMR", category: "Dosimetry" },
  { id: "cw-089", clue: "Output factor relating dose to field size", answer: "OUTPUT", category: "Dosimetry" },
  { id: "cw-090", clue: "Gel that polymerises in response to radiation dose", answer: "FRICKE", category: "Dosimetry" },
  { id: "cw-091", clue: "Monte Carlo method used in dose calculation", answer: "SIMULATION", category: "Dosimetry" },
  { id: "cw-092", clue: "Calorimeter measures dose by detecting this quantity", answer: "HEAT", category: "Dosimetry" },
  { id: "cw-093", clue: "Two-dimensional dose measurement device using arrays", answer: "MAPCHECK", category: "Dosimetry" },

  // ── Anatomy & Radiobiology ─────────────────────────────────
  { id: "cw-094", clue: "Irreparable DNA damage caused by ionising radiation", answer: "DOUBLE", category: "Radiobiology" },
  { id: "cw-095", clue: "Cell survival curve model with linear and quadratic components", answer: "LQ", category: "Radiobiology" },
  { id: "cw-096", clue: "Phase of the cell cycle most sensitive to radiation", answer: "MITOSIS", category: "Radiobiology" },
  { id: "cw-097", clue: "Oxygen effect that enhances radiation damage", answer: "OER", category: "Radiobiology" },
  { id: "cw-098", clue: "Programmed cell death triggered by radiation", answer: "APOPTOSIS", category: "Radiobiology" },
  { id: "cw-099", clue: "Repair of sublethal damage between fractions", answer: "RECOVERY", category: "Radiobiology" },
  { id: "cw-100", clue: "Redistribution of cells into sensitive phases between fractions", answer: "REASSORTMENT", category: "Radiobiology" },
  { id: "cw-101", clue: "Regrowth of tumour cells during a treatment course", answer: "REPOPULATION", category: "Radiobiology" },
  { id: "cw-102", clue: "Reoxygenation of hypoxic tumour cells between fractions", answer: "REOXYGENATION", category: "Radiobiology" },
  { id: "cw-103", clue: "Repair, reassortment, repopulation, reoxygenation — the four ___", answer: "RS", category: "Radiobiology" },
  { id: "cw-104", clue: "Tissue responding late to radiation with low alpha/beta ratio", answer: "LATE", category: "Radiobiology" },
  { id: "cw-105", clue: "Radiation-induced chromosomal aberration seen as a ring", answer: "DICENTRIC", category: "Radiobiology" },
  { id: "cw-106", clue: "Molecule most responsible for indirect radiation damage", answer: "RADICAL", category: "Radiobiology" },
  { id: "cw-107", clue: "Bystander effect occurs in cells not directly ___", answer: "IRRADIATED", category: "Radiobiology" },

  // ── Nuclear Medicine ───────────────────────────────────────
  { id: "cw-108", clue: "Gamma camera crystal material", answer: "THALLIUM", category: "Nuclear Medicine" },
  { id: "cw-109", clue: "Most commonly used radionuclide in nuclear medicine", answer: "TECHNETIUM", category: "Nuclear Medicine" },
  { id: "cw-110", clue: "Device producing short-lived radionuclides for PET", answer: "CYCLOTRON", category: "Nuclear Medicine" },
  { id: "cw-111", clue: "Radiopharmaceutical uptake mechanism in thyroid imaging", answer: "IODINE", category: "Nuclear Medicine" },
  { id: "cw-112", clue: "SPECT imaging rotates the camera to create ___ images", answer: "TOMOGRAPHIC", category: "Nuclear Medicine" },
  { id: "cw-113", clue: "Collimator type with parallel holes for general imaging", answer: "PARALLEL", category: "Nuclear Medicine" },
  { id: "cw-114", clue: "Energy window setting to accept only photopeak events", answer: "WINDOW", category: "Nuclear Medicine" },
  { id: "cw-115", clue: "Generator system producing Tc-99m from Mo-99", answer: "GENERATOR", category: "Nuclear Medicine" },
  { id: "cw-116", clue: "Annihilation event produces two photons at ___ degrees", answer: "COINCIDENCE", category: "Nuclear Medicine" },

  // ── Quality Assurance ──────────────────────────────────────
  { id: "cw-117", clue: "Regular checks ensuring equipment performs within specifications", answer: "QA", category: "Quality Assurance" },
  { id: "cw-118", clue: "Tolerance level for linac output constancy", answer: "PERCENT", category: "Quality Assurance" },
  { id: "cw-119", clue: "Phantom used to verify MLC leaf positions", answer: "PICKET", category: "Quality Assurance" },
  { id: "cw-120", clue: "Gamma analysis metric comparing calculated and measured dose", answer: "GAMMA", category: "Quality Assurance" },
  { id: "cw-121", clue: "Light and radiation field ___ must agree within 2 mm", answer: "CONGRUENCE", category: "Quality Assurance" },
  { id: "cw-122", clue: "Beam symmetry and ___ checked during monthly QA", answer: "FLATNESS", category: "Quality Assurance" },
  { id: "cw-123", clue: "Annual calibration check of the treatment beam", answer: "OUTPUT", category: "Quality Assurance" },
  { id: "cw-124", clue: "AAPM task group report for IMRT commissioning", answer: "TG119", category: "Quality Assurance" },
  { id: "cw-125", clue: "Mechanical and radiation ___ must coincide", answer: "ISOCENTRE", category: "Quality Assurance" },

  // ── General Medical Physics ────────────────────────────────
  { id: "cw-126", clue: "Planck's constant relates photon energy to this", answer: "FREQUENCY", category: "General" },
  { id: "cw-127", clue: "Particle accelerated in a cyclotron", answer: "PROTON", category: "General" },
  { id: "cw-128", clue: "Einstein's equation relating mass and energy: E=mc²", answer: "RELATIVITY", category: "General" },
  { id: "cw-129", clue: "Tissue-air ratio used in manual dose calculations", answer: "TAR", category: "General" },
  { id: "cw-130", clue: "Software system managing radiation treatment planning", answer: "TPS", category: "General" },
  { id: "cw-131", clue: "Standard for medical image transfer between systems", answer: "DICOM", category: "General" },
  { id: "cw-132", clue: "Electron density information obtained from CT for planning", answer: "DENSITY", category: "General" },
  { id: "cw-133", clue: "Treatment couch rotation around the isocentre", answer: "ROTATION", category: "General" },
  { id: "cw-134", clue: "Beam modifier that compensates for missing tissue", answer: "COMPENSATOR", category: "General" },
  { id: "cw-135", clue: "Photon beam quality specified by this voltage (abbr.)", answer: "MV", category: "General" },
  { id: "cw-136", clue: "The study of radiation measurement", answer: "DOSIMETRY", category: "General" },
  { id: "cw-137", clue: "Fluorescent screen used to verify patient positioning", answer: "EPID", category: "General" },
  { id: "cw-138", clue: "Nobel laureate who discovered X-rays", answer: "ROENTGEN", category: "General" },
  { id: "cw-139", clue: "Scientist who discovered radioactivity", answer: "BECQUEREL", category: "General" },
  { id: "cw-140", clue: "Pioneer of radium research and two-time Nobel laureate", answer: "CURIE", category: "General" },
];

/** Get all unique categories */
export function getCrosswordCategories(): string[] {
  const cats = new Set(crosswordClues.map((c) => c.category));
  return Array.from(cats);
}

/** Get clues filtered by category, shuffled */
export function getCrosswordClues(category?: string, limit = 30): CrosswordClue[] {
  const pool = category && category !== "all"
    ? crosswordClues.filter((c) => c.category === category)
    : [...crosswordClues];

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, limit);
}
