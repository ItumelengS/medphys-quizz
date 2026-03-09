export interface ConnectionGroup {
  category: string;
  words: string[];
  difficulty: 1 | 2 | 3 | 4;
}

export interface ConnectionPuzzle {
  id: string;
  groups: [ConnectionGroup, ConnectionGroup, ConnectionGroup, ConnectionGroup];
}

export const CONNECTION_PUZZLES: ConnectionPuzzle[] = [
  {
    id: "conn-001",
    groups: [
      {
        category: "Photon beam energies (MV)",
        words: ["6", "10", "15", "18"],
        difficulty: 1,
      },
      {
        category: "Radiation detectors",
        words: ["MOSFET", "TLD", "Diode", "Film"],
        difficulty: 2,
      },
      {
        category: "Treatment techniques",
        words: ["IMRT", "VMAT", "SRS", "SBRT"],
        difficulty: 3,
      },
      {
        category: "Also a common English word",
        words: ["Wedge", "Field", "Source", "Monitor"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-002",
    groups: [
      {
        category: "Imaging modalities",
        words: ["CT", "MRI", "PET", "SPECT"],
        difficulty: 1,
      },
      {
        category: "Particle interactions with matter",
        words: ["Compton", "Rayleigh", "Photoelectric", "Pair"],
        difficulty: 2,
      },
      {
        category: "Dose quantities",
        words: ["Absorbed", "Equivalent", "Effective", "Kerma"],
        difficulty: 3,
      },
      {
        category: "Contain a body part",
        words: ["Armature", "Kneecap", "Thumbnail", "Headroom"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-003",
    groups: [
      {
        category: "Linear accelerator components",
        words: ["Klystron", "Waveguide", "Magnetron", "Carousel"],
        difficulty: 1,
      },
      {
        category: "Shielding materials",
        words: ["Lead", "Concrete", "Steel", "Boron"],
        difficulty: 2,
      },
      {
        category: "Brachytherapy isotopes",
        words: ["Iridium", "Cesium", "Iodine", "Palladium"],
        difficulty: 3,
      },
      {
        category: "Named after Nobel laureates",
        words: ["Curie", "Gray", "Sievert", "Becquerel"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-004",
    groups: [
      {
        category: "MRI sequences",
        words: ["FLAIR", "STIR", "FIESTA", "HASTE"],
        difficulty: 1,
      },
      {
        category: "CT image artifacts",
        words: ["Streak", "Ring", "Cupping", "Windmill"],
        difficulty: 2,
      },
      {
        category: "Electron beam energies (MeV)",
        words: ["4", "9", "12", "16"],
        difficulty: 3,
      },
      {
        category: "Also weather-related words",
        words: ["Scatter", "Beam", "Cloud", "Fog"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-005",
    groups: [
      {
        category: "Types of ionizing radiation",
        words: ["Alpha", "Beta", "Gamma", "Neutron"],
        difficulty: 1,
      },
      {
        category: "QA devices",
        words: ["Phantom", "Electrometer", "Barometer", "Thermometer"],
        difficulty: 2,
      },
      {
        category: "Dose-volume histogram terms",
        words: ["D95", "V20", "Mean", "Maximum"],
        difficulty: 3,
      },
      {
        category: "Also Greek letters",
        words: ["Delta", "Kappa", "Sigma", "Lambda"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-006",
    groups: [
      {
        category: "Treatment planning systems",
        words: ["Eclipse", "Pinnacle", "Monaco", "RayStation"],
        difficulty: 1,
      },
      {
        category: "Radionuclides in nuclear medicine",
        words: ["Technetium", "Thallium", "Gallium", "Fluorine"],
        difficulty: 2,
      },
      {
        category: "Linac QA tests",
        words: ["Flatness", "Symmetry", "Output", "Energy"],
        difficulty: 3,
      },
      {
        category: "Can follow the word 'half'",
        words: ["Life", "Value", "Time", "Layer"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-007",
    groups: [
      {
        category: "Radiation therapy machine brands",
        words: ["Varian", "Elekta", "Accuray", "Siemens"],
        difficulty: 1,
      },
      {
        category: "MRI contrast agents",
        words: ["Gadolinium", "Manganese", "Ferumoxytol", "Gadobutrol"],
        difficulty: 2,
      },
      {
        category: "Decay modes",
        words: ["Positron", "Electron capture", "Isomeric", "Auger"],
        difficulty: 3,
      },
      {
        category: "Abbreviations containing 'S'",
        words: ["SSD", "SAD", "SRS", "SSDE"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-008",
    groups: [
      {
        category: "Organs at risk",
        words: ["Spinal cord", "Brainstem", "Parotid", "Lens"],
        difficulty: 1,
      },
      {
        category: "Image quality metrics",
        words: ["SNR", "CNR", "MTF", "Resolution"],
        difficulty: 2,
      },
      {
        category: "Brachytherapy applicators",
        words: ["Tandem", "Ring", "Cylinder", "Ovoid"],
        difficulty: 3,
      },
      {
        category: "Also shapes",
        words: ["Cone", "Wedge", "Arc", "Diamond"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-009",
    groups: [
      {
        category: "CT scanner components",
        words: ["Anode", "Cathode", "Collimator", "Detector"],
        difficulty: 1,
      },
      {
        category: "Dosimetry protocols",
        words: ["TG-51", "TRS-398", "TG-43", "TG-142"],
        difficulty: 2,
      },
      {
        category: "Radiation protection principles",
        words: ["Time", "Distance", "Shielding", "ALARA"],
        difficulty: 3,
      },
      {
        category: "Words ending in '-ion'",
        words: ["Attenuation", "Calibration", "Ionization", "Simulation"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-010",
    groups: [
      {
        category: "Types of CT scan",
        words: ["Helical", "Axial", "Cone beam", "Dual energy"],
        difficulty: 1,
      },
      {
        category: "MRI tissue properties",
        words: ["T1", "T2", "PD", "T2*"],
        difficulty: 2,
      },
      {
        category: "Radiation weighting factors",
        words: ["Proton", "Alpha", "Neutron", "Photon"],
        difficulty: 3,
      },
      {
        category: "Can precede the word 'chamber'",
        words: ["Ion", "Cloud", "Echo", "Thimble"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-011",
    groups: [
      {
        category: "Multileaf collimator terms",
        words: ["Leaf", "Bank", "Carriage", "Tongue"],
        difficulty: 1,
      },
      {
        category: "PET radiopharmaceuticals",
        words: ["FDG", "Choline", "PSMA", "DOTATATE"],
        difficulty: 2,
      },
      {
        category: "Beam modifiers",
        words: ["Wedge", "Block", "Compensator", "Bolus"],
        difficulty: 3,
      },
      {
        category: "Also found in a gym",
        words: ["Bench", "Press", "Couch", "Table"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-012",
    groups: [
      {
        category: "Radiation dose units",
        words: ["Gray", "Sievert", "Roentgen", "Rad"],
        difficulty: 1,
      },
      {
        category: "Immobilization devices",
        words: ["Mask", "Cradle", "Vac-Lok", "Wingboard"],
        difficulty: 2,
      },
      {
        category: "Photon interaction probabilities depend on",
        words: ["Energy", "Density", "Atomic number", "Thickness"],
        difficulty: 3,
      },
      {
        category: "Also colors",
        words: ["Cobalt", "Gold", "Amber", "Ivory"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-013",
    groups: [
      {
        category: "MRI hardware components",
        words: ["Coil", "Magnet", "Gradient", "Shim"],
        difficulty: 1,
      },
      {
        category: "Stereotactic techniques",
        words: ["SRS", "SRT", "SBRT", "GammaKnife"],
        difficulty: 2,
      },
      {
        category: "Radiation biology terms",
        words: ["Fractionation", "Repair", "Repopulation", "Reoxygenation"],
        difficulty: 3,
      },
      {
        category: "Start with a periodic table symbol",
        words: ["Copper", "Silver", "Iron", "Carbon"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-014",
    groups: [
      {
        category: "Dosimeter types",
        words: ["Ion chamber", "TLD", "OSL", "MOSFET"],
        difficulty: 1,
      },
      {
        category: "Treatment site abbreviations",
        words: ["H&N", "GYN", "GI", "GU"],
        difficulty: 2,
      },
      {
        category: "DICOM objects",
        words: ["Plan", "Structure", "Image", "Dose"],
        difficulty: 3,
      },
      {
        category: "Words with double letters",
        words: ["Gantry", "Mammography", "Commissioning", "Isocenter"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-015",
    groups: [
      {
        category: "Charged particles used in therapy",
        words: ["Proton", "Carbon", "Electron", "Helium"],
        difficulty: 1,
      },
      {
        category: "Linac interlock types",
        words: ["Door", "Beam", "Motion", "Dose rate"],
        difficulty: 2,
      },
      {
        category: "Inverse square law variables",
        words: ["Intensity", "Distance", "Source", "Exposure"],
        difficulty: 3,
      },
      {
        category: "Contain a number when abbreviated",
        words: ["Cobalt-60", "F-18", "I-131", "Ir-192"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-016",
    groups: [
      {
        category: "Ultrasound modes",
        words: ["B-mode", "M-mode", "Doppler", "A-mode"],
        difficulty: 1,
      },
      {
        category: "Mammography terms",
        words: ["BIRADS", "Compression", "Magnification", "Spot"],
        difficulty: 2,
      },
      {
        category: "Radiation survey instruments",
        words: ["Geiger", "Cutie Pie", "Pancake", "Neutron rem"],
        difficulty: 3,
      },
      {
        category: "Also food-related words",
        words: ["Banana", "Seed", "Cocktail", "Plum"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-017",
    groups: [
      {
        category: "Proton therapy terms",
        words: ["Bragg peak", "SOBP", "Pencil beam", "Cyclotron"],
        difficulty: 1,
      },
      {
        category: "Patient positioning systems",
        words: ["Hexapod", "ExacTrac", "CBCT", "AlignRT"],
        difficulty: 2,
      },
      {
        category: "Gamma camera components",
        words: ["Crystal", "PMT", "Collimator", "Scintillator"],
        difficulty: 3,
      },
      {
        category: "Rhyme with a number",
        words: ["Gate", "Drive", "Sticks", "Line"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-018",
    groups: [
      {
        category: "Dose calculation algorithms",
        words: ["Monte Carlo", "Pencil beam", "Convolution", "AAA"],
        difficulty: 1,
      },
      {
        category: "Radiobiology models",
        words: ["LQ", "TCP", "NTCP", "BED"],
        difficulty: 2,
      },
      {
        category: "Fluoroscopy components",
        words: ["Intensifier", "Grid", "Tube", "Collimator"],
        difficulty: 3,
      },
      {
        category: "Three-letter abbreviations ending in 'D'",
        words: ["SAD", "SSD", "TLD", "CAD"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-019",
    groups: [
      {
        category: "Radioactive decay types",
        words: ["Alpha", "Beta", "Gamma", "Positron"],
        difficulty: 1,
      },
      {
        category: "MRI artifacts",
        words: ["Chemical shift", "Ghosting", "Susceptibility", "Zipper"],
        difficulty: 2,
      },
      {
        category: "TG-142 daily QA checks",
        words: ["Lasers", "Door", "Output", "EPID"],
        difficulty: 3,
      },
      {
        category: "Also types of music",
        words: ["Metal", "Chamber", "Fusion", "Ambient"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-020",
    groups: [
      {
        category: "CT number values (HU)",
        words: ["Water", "Air", "Bone", "Fat"],
        difficulty: 1,
      },
      {
        category: "Linac beam-shaping components",
        words: ["Jaw", "MLC", "Flattening filter", "Applicator"],
        difficulty: 2,
      },
      {
        category: "Motion management techniques",
        words: ["Gating", "Tracking", "Breath hold", "Abdominal"],
        difficulty: 3,
      },
      {
        category: "Also card game terms",
        words: ["Pair", "Flush", "Scatter", "Deck"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-021",
    groups: [
      {
        category: "Radiation protection personnel monitors",
        words: ["Badge", "Ring", "OSL", "TLD"],
        difficulty: 1,
      },
      {
        category: "Nuclear medicine thyroid agents",
        words: ["I-123", "I-131", "Tc-99m", "Pertechnetate"],
        difficulty: 2,
      },
      {
        category: "Beam quality specifiers",
        words: ["HVL", "PDD10", "TPR2010", "kVp"],
        difficulty: 3,
      },
      {
        category: "Can follow 'back'",
        words: ["Scatter", "Ground", "Projection", "Board"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-022",
    groups: [
      {
        category: "IGRT technologies",
        words: ["CBCT", "EPID", "kV", "Ultrasound"],
        difficulty: 1,
      },
      {
        category: "Brachytherapy dose rates",
        words: ["LDR", "HDR", "PDR", "MDR"],
        difficulty: 2,
      },
      {
        category: "Monte Carlo transport codes",
        words: ["EGSnrc", "MCNP", "GEANT4", "PENELOPE"],
        difficulty: 3,
      },
      {
        category: "Also associated with weddings",
        words: ["Ring", "Veil", "Gown", "Bouquet"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-023",
    groups: [
      {
        category: "Electromagnetic spectrum regions",
        words: ["Microwave", "Infrared", "Visible", "X-ray"],
        difficulty: 1,
      },
      {
        category: "Treatment plan evaluation tools",
        words: ["DVH", "Isodose", "Gamma index", "Conformity"],
        difficulty: 2,
      },
      {
        category: "Film dosimetry terms",
        words: ["Optical density", "Sensitometry", "Calibration", "Scanner"],
        difficulty: 3,
      },
      {
        category: "Contain an animal",
        words: ["Cathodic", "Dogtooth", "Foxing", "Catwalk"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-024",
    groups: [
      {
        category: "Photon beam components",
        words: ["Primary", "Scatter", "Leakage", "Exit"],
        difficulty: 1,
      },
      {
        category: "Patient coordinate directions",
        words: ["Superior", "Inferior", "Anterior", "Posterior"],
        difficulty: 2,
      },
      {
        category: "HDR brachytherapy steps",
        words: ["Insertion", "Imaging", "Planning", "Delivery"],
        difficulty: 3,
      },
      {
        category: "Also school-related words",
        words: ["Class", "Field", "Table", "Period"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-025",
    groups: [
      {
        category: "X-ray tube components",
        words: ["Anode", "Cathode", "Filament", "Housing"],
        difficulty: 1,
      },
      {
        category: "AAPM task group reports",
        words: ["TG-51", "TG-142", "TG-43", "TG-119"],
        difficulty: 2,
      },
      {
        category: "Electron equilibrium conditions",
        words: ["CPE", "TCPE", "Buildup", "Dmax"],
        difficulty: 3,
      },
      {
        category: "Also found on a boat",
        words: ["Port", "Beam", "Hull", "Bow"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-026",
    groups: [
      {
        category: "Radiation therapy fractionation schemes",
        words: ["Hyper", "Hypo", "Conventional", "Accelerated"],
        difficulty: 1,
      },
      {
        category: "Diagnostic radiology QA phantoms",
        words: ["ACR", "Catphan", "CIRS", "Leeds"],
        difficulty: 2,
      },
      {
        category: "Linac target materials",
        words: ["Tungsten", "Gold", "Copper", "Rhenium"],
        difficulty: 3,
      },
      {
        category: "Also types of curves",
        words: ["Isodose", "Survival", "Depth dose", "Calibration"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-027",
    groups: [
      {
        category: "MRI safety zones",
        words: ["Zone I", "Zone II", "Zone III", "Zone IV"],
        difficulty: 1,
      },
      {
        category: "Radiation therapy planning margins",
        words: ["GTV", "CTV", "PTV", "ITV"],
        difficulty: 2,
      },
      {
        category: "Scintillation detector components",
        words: ["Crystal", "PMT", "Reflector", "Window"],
        difficulty: 3,
      },
      {
        category: "Also associated with stars",
        words: ["Binary", "Spectrum", "Giant", "Dwarf"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-028",
    groups: [
      {
        category: "Radiation protection barriers",
        words: ["Primary", "Secondary", "Maze", "Door"],
        difficulty: 1,
      },
      {
        category: "CT reconstruction methods",
        words: ["FBP", "Iterative", "ASIR", "MBIR"],
        difficulty: 2,
      },
      {
        category: "Proton therapy range uncertainties",
        words: ["CT number", "Setup", "Biological", "Organ motion"],
        difficulty: 3,
      },
      {
        category: "Two-word terms where both words start with same letter",
        words: ["Bragg-Gray", "Beam bending", "Pencil beam", "Pulse pileup"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-029",
    groups: [
      {
        category: "Cobalt-60 unit components",
        words: ["Source", "Timer", "Collimator", "Head"],
        difficulty: 1,
      },
      {
        category: "Mammography target/filter combinations",
        words: ["Molybdenum", "Rhodium", "Tungsten", "Silver"],
        difficulty: 2,
      },
      {
        category: "Radiation protection quantities",
        words: ["Ambient", "Personal", "Directional", "Operational"],
        difficulty: 3,
      },
      {
        category: "Also chess terms",
        words: ["Pin", "Fork", "Gambit", "Check"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-030",
    groups: [
      {
        category: "Types of accelerators",
        words: ["Linac", "Cyclotron", "Synchrotron", "Betatron"],
        difficulty: 1,
      },
      {
        category: "Dose reporting standards",
        words: ["ICRU", "TG-263", "QUANTEC", "RTOG"],
        difficulty: 2,
      },
      {
        category: "CyberKnife components",
        words: ["Robotic arm", "Xsight", "Synchrony", "InCise"],
        difficulty: 3,
      },
      {
        category: "Also things in a kitchen",
        words: ["Filter", "Gantry", "Grid", "Table"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-031",
    groups: [
      {
        category: "Ultrasound transducer types",
        words: ["Linear", "Curvilinear", "Phased", "Endocavity"],
        difficulty: 1,
      },
      {
        category: "Radiotherapy immobilization materials",
        words: ["Thermoplastic", "Styrofoam", "Carbon fiber", "Kevlar"],
        difficulty: 2,
      },
      {
        category: "Nuclear medicine SPECT isotopes",
        words: ["Tc-99m", "Tl-201", "Ga-67", "In-111"],
        difficulty: 3,
      },
      {
        category: "Also types of dance",
        words: ["Swing", "Step", "Spin", "Slide"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-032",
    groups: [
      {
        category: "MRI weighting types",
        words: ["T1-weighted", "T2-weighted", "PD-weighted", "DWI"],
        difficulty: 1,
      },
      {
        category: "Linac safety systems",
        words: ["Interlock", "Backup monitor", "Beam stop", "Shutter"],
        difficulty: 2,
      },
      {
        category: "Radiation biology cell cycle phases",
        words: ["G1", "S", "G2", "M"],
        difficulty: 3,
      },
      {
        category: "Also poker hand ranks",
        words: ["Pair", "Flush", "Straight", "Full house"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-033",
    groups: [
      {
        category: "CT dose metrics",
        words: ["CTDIvol", "DLP", "SSDE", "CTDI100"],
        difficulty: 1,
      },
      {
        category: "Teletherapy source types",
        words: ["Co-60", "Cs-137", "Ir-192", "Ra-226"],
        difficulty: 2,
      },
      {
        category: "Proton therapy delivery methods",
        words: ["Passive scatter", "Uniform scan", "Pencil beam", "Wobbling"],
        difficulty: 3,
      },
      {
        category: "Also clothing items",
        words: ["Collar", "Cap", "Gown", "Sleeve"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-034",
    groups: [
      {
        category: "Radiopharmaceutical administration routes",
        words: ["Intravenous", "Oral", "Inhalation", "Intrathecal"],
        difficulty: 1,
      },
      {
        category: "Gamma knife components",
        words: ["Helmet", "Cobalt", "Frame", "Collimator"],
        difficulty: 2,
      },
      {
        category: "Tissue weighting factor organs",
        words: ["Gonads", "Breast", "Lung", "Thyroid"],
        difficulty: 3,
      },
      {
        category: "Words containing a color",
        words: ["Blueprint", "Greenfield", "Blackbody", "Redshift"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-035",
    groups: [
      {
        category: "Electron beam applicator sizes (cm)",
        words: ["6x6", "10x10", "15x15", "20x20"],
        difficulty: 1,
      },
      {
        category: "Patient setup errors",
        words: ["Systematic", "Random", "Rotational", "Translational"],
        difficulty: 2,
      },
      {
        category: "MRI pulse sequence parameters",
        words: ["TR", "TE", "TI", "FA"],
        difficulty: 3,
      },
      {
        category: "Also found in astronomy",
        words: ["Eclipse", "Corona", "Penumbra", "Spectrum"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-036",
    groups: [
      {
        category: "Dosimetry correction factors",
        words: ["Temperature", "Pressure", "Polarity", "Recombination"],
        difficulty: 1,
      },
      {
        category: "Brachytherapy loading patterns",
        words: ["Manchester", "Paris", "Quimby", "Stockholm"],
        difficulty: 2,
      },
      {
        category: "DICOM networking terms",
        words: ["SCU", "SCP", "AE title", "PACS"],
        difficulty: 3,
      },
      {
        category: "Also capital cities",
        words: ["Lima", "Sofia", "Geneva", "Monaco"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-037",
    groups: [
      {
        category: "Radiation detector gases",
        words: ["Argon", "Xenon", "Helium", "Nitrogen"],
        difficulty: 1,
      },
      {
        category: "Treatment planning optimization types",
        words: ["Inverse", "Forward", "Multi-criteria", "Robust"],
        difficulty: 2,
      },
      {
        category: "CT image quality factors",
        words: ["Noise", "Contrast", "Resolution", "Uniformity"],
        difficulty: 3,
      },
      {
        category: "Also musical terms",
        words: ["Pitch", "Scale", "Harmonic", "Resonance"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-038",
    groups: [
      {
        category: "Linear energy transfer categories",
        words: ["High LET", "Low LET", "Unrestricted", "Restricted"],
        difficulty: 1,
      },
      {
        category: "Quality assurance phantoms",
        words: ["MapCHECK", "ArcCHECK", "Delta4", "Octavius"],
        difficulty: 2,
      },
      {
        category: "Nuclear medicine camera types",
        words: ["Planar", "SPECT", "PET", "SPECT-CT"],
        difficulty: 3,
      },
      {
        category: "Also words in a courtroom",
        words: ["Chamber", "Bar", "Bench", "Court"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-039",
    groups: [
      {
        category: "Radiation protection officer duties",
        words: ["Survey", "Monitoring", "Training", "Reporting"],
        difficulty: 1,
      },
      {
        category: "MRI contrast mechanisms",
        words: ["Relaxation", "Diffusion", "Perfusion", "Susceptibility"],
        difficulty: 2,
      },
      {
        category: "Brachytherapy implant types",
        words: ["Permanent", "Temporary", "Interstitial", "Intracavitary"],
        difficulty: 3,
      },
      {
        category: "Also found in a garden",
        words: ["Seed", "Bed", "Plot", "Leaf"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-040",
    groups: [
      {
        category: "X-ray spectrum characteristics",
        words: ["Bremsstrahlung", "Characteristic", "Continuous", "Line"],
        difficulty: 1,
      },
      {
        category: "Motion artifacts sources",
        words: ["Respiratory", "Cardiac", "Peristaltic", "Voluntary"],
        difficulty: 2,
      },
      {
        category: "Dose gradient metrics",
        words: ["Penumbra", "Falloff", "Conformity", "Homogeneity"],
        difficulty: 3,
      },
      {
        category: "Also things that can be 'hot'",
        words: ["Spot", "Zone", "Source", "Cell"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-041",
    groups: [
      {
        category: "PET scanner components",
        words: ["Scintillator", "SiPM", "Coincidence", "Gantry"],
        difficulty: 1,
      },
      {
        category: "Megavoltage imaging devices",
        words: ["EPID", "Portal film", "MV CBCT", "Exit detector"],
        difficulty: 2,
      },
      {
        category: "Radiation biology oxygen effects",
        words: ["OER", "Hypoxia", "Reoxygenation", "Radiosensitizer"],
        difficulty: 3,
      },
      {
        category: "Can precede 'field'",
        words: ["Near", "Far", "Open", "Matched"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-042",
    groups: [
      {
        category: "Radiotherapy fraction sizes (Gy)",
        words: ["1.8", "2.0", "3.0", "8.0"],
        difficulty: 1,
      },
      {
        category: "Electronic brachytherapy components",
        words: ["Miniature tube", "Applicator", "Controller", "Balloon"],
        difficulty: 2,
      },
      {
        category: "Flattening filter free beam properties",
        words: ["Higher dose rate", "Softer beam", "Cone shaped", "Less scatter"],
        difficulty: 3,
      },
      {
        category: "Also types of waves",
        words: ["Standing", "Shock", "Traveling", "Surface"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-043",
    groups: [
      {
        category: "Radiosurgery frame systems",
        words: ["BRW", "CRW", "Leksell", "Gill-Thomas"],
        difficulty: 1,
      },
      {
        category: "CT scanner generations",
        words: ["First", "Second", "Third", "Fourth"],
        difficulty: 2,
      },
      {
        category: "Radiation emergency triage categories",
        words: ["Prodromal", "Latent", "Manifest", "Recovery"],
        difficulty: 3,
      },
      {
        category: "Also parts of a river",
        words: ["Bed", "Channel", "Bank", "Source"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-044",
    groups: [
      {
        category: "Ultrasound image artifacts",
        words: ["Shadowing", "Enhancement", "Reverberation", "Mirror"],
        difficulty: 1,
      },
      {
        category: "Radiation therapy beam arrangements",
        words: ["Opposed", "Tangent", "Oblique", "Vertex"],
        difficulty: 2,
      },
      {
        category: "Radiochromic film types",
        words: ["EBT3", "EBT-XD", "HD-V2", "MD-V3"],
        difficulty: 3,
      },
      {
        category: "Also architectural terms",
        words: ["Portal", "Vault", "Arch", "Column"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-045",
    groups: [
      {
        category: "Health physics survey types",
        words: ["Area", "Wipe test", "Personnel", "Air sampling"],
        difficulty: 1,
      },
      {
        category: "Photon beam percentage depth dose factors",
        words: ["Energy", "Field size", "SSD", "Depth"],
        difficulty: 2,
      },
      {
        category: "MRI safety implant categories",
        words: ["MR safe", "MR conditional", "MR unsafe", "Untested"],
        difficulty: 3,
      },
      {
        category: "Also parts of an eye",
        words: ["Lens", "Chamber", "Field", "Cone"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-046",
    groups: [
      {
        category: "Radiation dose response relationships",
        words: ["Linear", "Quadratic", "Threshold", "Sigmoid"],
        difficulty: 1,
      },
      {
        category: "Tomotherapy components",
        words: ["Binary MLC", "Slip ring", "CT detector", "Megavoltage"],
        difficulty: 2,
      },
      {
        category: "Nuclear reactor types used for isotopes",
        words: ["TRIGA", "HFIR", "SAFARI", "NRU"],
        difficulty: 3,
      },
      {
        category: "Also words in photography",
        words: ["Exposure", "Film", "Density", "Contrast"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-047",
    groups: [
      {
        category: "Linac photon beam energies",
        words: ["6 MV", "10 MV", "15 MV", "18 MV"],
        difficulty: 1,
      },
      {
        category: "Stereotactic body sites",
        words: ["Lung", "Liver", "Spine", "Pancreas"],
        difficulty: 2,
      },
      {
        category: "Bragg-Gray cavity theory conditions",
        words: ["Small cavity", "Charged particle", "No perturbation", "Equilibrium"],
        difficulty: 3,
      },
      {
        category: "Also types of window",
        words: ["Bay", "Energy", "Gating", "Display"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-048",
    groups: [
      {
        category: "Radiation weighting factor values",
        words: ["1", "2", "5", "20"],
        difficulty: 1,
      },
      {
        category: "Radiotherapy record and verify system vendors",
        words: ["ARIA", "MOSAIQ", "iKnow", "LANTIS"],
        difficulty: 2,
      },
      {
        category: "Thyroid uptake measurement factors",
        words: ["Neck count", "Thigh count", "Standard", "Capsule"],
        difficulty: 3,
      },
      {
        category: "Also found at the beach",
        words: ["Shell", "Wave", "Current", "Drift"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-049",
    groups: [
      {
        category: "X-ray filtration materials",
        words: ["Aluminum", "Copper", "Tin", "Molybdenum"],
        difficulty: 1,
      },
      {
        category: "Electron beam parameters",
        words: ["R50", "Rp", "E0", "Dmax"],
        difficulty: 2,
      },
      {
        category: "IMRT delivery techniques",
        words: ["Step and shoot", "Sliding window", "Helical", "VMAT"],
        difficulty: 3,
      },
      {
        category: "Also found in a clock",
        words: ["Face", "Spring", "Movement", "Dial"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-050",
    groups: [
      {
        category: "Medical physics certifying bodies",
        words: ["ABR", "CCPM", "ACPSEM", "IPEM"],
        difficulty: 1,
      },
      {
        category: "PET image corrections",
        words: ["Attenuation", "Scatter", "Random", "Dead time"],
        difficulty: 2,
      },
      {
        category: "Skin dose measurement methods",
        words: ["Extrapolation", "TLD", "Film", "MOSFET"],
        difficulty: 3,
      },
      {
        category: "Also things that can 'leak'",
        words: ["Radiation", "Current", "Signal", "Charge"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-051",
    groups: [
      {
        category: "MRI k-space trajectories",
        words: ["Cartesian", "Radial", "Spiral", "EPI"],
        difficulty: 1,
      },
      {
        category: "Radiation therapy plan types",
        words: ["3D-CRT", "IMRT", "VMAT", "Electrons"],
        difficulty: 2,
      },
      {
        category: "Neutron sources for therapy",
        words: ["Cf-252", "Reactor", "D-T generator", "Spallation"],
        difficulty: 3,
      },
      {
        category: "Also words in baseball",
        words: ["Pitch", "Field", "Plate", "Slide"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-052",
    groups: [
      {
        category: "Radiation protection time limits",
        words: ["Annual", "Quarterly", "Cumulative", "Planned"],
        difficulty: 1,
      },
      {
        category: "CT windowing parameters",
        words: ["Width", "Level", "Center", "Preset"],
        difficulty: 2,
      },
      {
        category: "Sealed source leak test requirements",
        words: ["Wipe", "Activity", "Inventory", "Disposal"],
        difficulty: 3,
      },
      {
        category: "Also types of current",
        words: ["Direct", "Alternating", "Ionization", "Dark"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-053",
    groups: [
      {
        category: "Dose volume histogram types",
        words: ["Cumulative", "Differential", "Natural", "Normalized"],
        difficulty: 1,
      },
      {
        category: "Stereotactic frame coordinates",
        words: ["Lateral", "Vertical", "Anterior", "Target"],
        difficulty: 2,
      },
      {
        category: "Radiation emergency dose levels (Gy)",
        words: ["0.25", "1", "4", "10"],
        difficulty: 3,
      },
      {
        category: "Also types of map",
        words: ["Contour", "Density", "Relief", "Isodose"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-054",
    groups: [
      {
        category: "Radiotherapy couch motions",
        words: ["Lateral", "Longitudinal", "Vertical", "Rotation"],
        difficulty: 1,
      },
      {
        category: "Scintillation crystal materials",
        words: ["NaI", "BGO", "LSO", "LYSO"],
        difficulty: 2,
      },
      {
        category: "Fetal radiation dose concerns",
        words: ["Organogenesis", "Threshold", "Microcephaly", "Deterministic"],
        difficulty: 3,
      },
      {
        category: "Also associated with electricity",
        words: ["Ground", "Field", "Potential", "Resistance"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-055",
    groups: [
      {
        category: "Deformable image registration algorithms",
        words: ["Demons", "B-spline", "Optical flow", "Thin plate"],
        difficulty: 1,
      },
      {
        category: "Brachytherapy seed materials",
        words: ["Titanium", "Silver", "Graphite", "Ceramic"],
        difficulty: 2,
      },
      {
        category: "Radiation late effects",
        words: ["Fibrosis", "Necrosis", "Stenosis", "Fistula"],
        difficulty: 3,
      },
      {
        category: "Also things in space",
        words: ["Ring", "Belt", "Corona", "Nebula"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-056",
    groups: [
      {
        category: "Surface guided radiation therapy systems",
        words: ["AlignRT", "Catalyst", "IDENTIFY", "SGRT"],
        difficulty: 1,
      },
      {
        category: "Ionization chamber types",
        words: ["Farmer", "Parallel plate", "Thimble", "Well"],
        difficulty: 2,
      },
      {
        category: "Radioactive waste categories",
        words: ["Exempt", "Low level", "Intermediate", "High level"],
        difficulty: 3,
      },
      {
        category: "Also military ranks",
        words: ["General", "Major", "Colonel", "Captain"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-057",
    groups: [
      {
        category: "Digital detector technologies",
        words: ["Flat panel", "CCD", "CMOS", "Photostimulable"],
        difficulty: 1,
      },
      {
        category: "Commissioning beam data",
        words: ["PDD", "Profile", "Output factor", "TMR"],
        difficulty: 2,
      },
      {
        category: "Total body irradiation parameters",
        words: ["Midplane", "Lung block", "Compensator", "Dose rate"],
        difficulty: 3,
      },
      {
        category: "Also words in banking",
        words: ["Deposit", "Yield", "Interest", "Balance"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-058",
    groups: [
      {
        category: "Radioiodine therapy considerations",
        words: ["Uptake", "Ablation", "Isolation", "Release"],
        difficulty: 1,
      },
      {
        category: "Gafchromic film analysis steps",
        words: ["Scanning", "Calibration", "RGB", "Dose mapping"],
        difficulty: 2,
      },
      {
        category: "Adaptive radiotherapy triggers",
        words: ["Weight loss", "Tumor shrink", "Cavity fill", "Organ shift"],
        difficulty: 3,
      },
      {
        category: "Also types of bridge",
        words: ["Suspension", "Cable", "Arch", "Beam"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-059",
    groups: [
      {
        category: "Nuclear medicine generator systems",
        words: ["Mo-99/Tc-99m", "Ge-68/Ga-68", "Sr-82/Rb-82", "Sn-113/In-113m"],
        difficulty: 1,
      },
      {
        category: "Radiotherapy target delineation aids",
        words: ["Fusion", "Atlas", "Contouring", "Margin"],
        difficulty: 2,
      },
      {
        category: "Charged particle stopping powers",
        words: ["Collisional", "Radiative", "Total", "Restricted"],
        difficulty: 3,
      },
      {
        category: "Also found in a theater",
        words: ["Stage", "Projection", "Screen", "Curtain"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-060",
    groups: [
      {
        category: "Radiation monitoring badge components",
        words: ["Filter", "Chip", "Holder", "Window"],
        difficulty: 1,
      },
      {
        category: "4D CT applications",
        words: ["Lung", "Liver", "ITV", "Phase binning"],
        difficulty: 2,
      },
      {
        category: "Neutron interaction types",
        words: ["Elastic", "Inelastic", "Capture", "Fission"],
        difficulty: 3,
      },
      {
        category: "Also words used in cooking",
        words: ["Reduction", "Absorption", "Saturation", "Quenching"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-061",
    groups: [
      {
        category: "MRI gradient coil axes",
        words: ["X", "Y", "Z", "Slice select"],
        difficulty: 1,
      },
      {
        category: "Treatment machine commissioning tests",
        words: ["Jaw calibration", "MLC test", "Gantry speed", "Couch walk"],
        difficulty: 2,
      },
      {
        category: "Iodine-125 seed properties",
        words: ["27 keV", "59.4 days", "LDR", "Permanent"],
        difficulty: 3,
      },
      {
        category: "Also words in sailing",
        words: ["Beam", "Draft", "Port", "Heel"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-062",
    groups: [
      {
        category: "Radiation therapy delivery errors",
        words: ["Wrong site", "Wrong dose", "Wrong patient", "Wrong energy"],
        difficulty: 1,
      },
      {
        category: "Diagnostic reference levels modalities",
        words: ["Fluoroscopy", "CT", "Mammography", "Dental"],
        difficulty: 2,
      },
      {
        category: "GammaKnife model names",
        words: ["Perfexion", "Icon", "Model C", "Model B"],
        difficulty: 3,
      },
      {
        category: "Also types of pool",
        words: ["Decay", "Gene", "Motor", "Tidal"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-063",
    groups: [
      {
        category: "Electron beam treatment features",
        words: ["Bolus", "Cutout", "Cerrobend", "Standoff"],
        difficulty: 1,
      },
      {
        category: "CBCT image quality issues",
        words: ["Scatter", "Truncation", "Lag", "Cupping"],
        difficulty: 2,
      },
      {
        category: "Thermocouple dosimetry factors",
        words: ["Sensitivity", "Linearity", "Fading", "Annealing"],
        difficulty: 3,
      },
      {
        category: "Also parts of a tree",
        words: ["Branch", "Root", "Ring", "Crown"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-064",
    groups: [
      {
        category: "Linac waveguide types",
        words: ["Traveling", "Standing", "Side-coupled", "On-axis"],
        difficulty: 1,
      },
      {
        category: "Radioisotope production methods",
        words: ["Cyclotron", "Reactor", "Generator", "Spallation"],
        difficulty: 2,
      },
      {
        category: "Skin sparing techniques",
        words: ["Tangent", "Bolus", "Buildup", "VMAT"],
        difficulty: 3,
      },
      {
        category: "Also associated with wine",
        words: ["Aging", "Body", "Nose", "Barrel"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-065",
    groups: [
      {
        category: "Mammography image receptor types",
        words: ["Screen-film", "CR", "DR", "Selenium"],
        difficulty: 1,
      },
      {
        category: "Proton range verification methods",
        words: ["PET", "Prompt gamma", "MRI", "Ionoacoustic"],
        difficulty: 2,
      },
      {
        category: "Radiation induced chromosome aberrations",
        words: ["Dicentric", "Ring", "Fragment", "Translocation"],
        difficulty: 3,
      },
      {
        category: "Also things with a 'head'",
        words: ["Gantry", "Shower", "Drum", "Arrow"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-066",
    groups: [
      {
        category: "Treatment plan normalization methods",
        words: ["Isocenter", "Maximum", "Mean", "D95"],
        difficulty: 1,
      },
      {
        category: "MRI RF coil types",
        words: ["Birdcage", "Surface", "Phased array", "Helmholtz"],
        difficulty: 2,
      },
      {
        category: "Effective half-life components",
        words: ["Physical", "Biological", "Effective", "Clearance"],
        difficulty: 3,
      },
      {
        category: "Also types of key",
        words: ["Master", "Primary", "Skeleton", "Foreign"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-067",
    groups: [
      {
        category: "Radiation protection area classifications",
        words: ["Controlled", "Supervised", "Unrestricted", "Restricted"],
        difficulty: 1,
      },
      {
        category: "Ion chamber corrections for TG-51",
        words: ["Pion", "Ppol", "Pelec", "PTP"],
        difficulty: 2,
      },
      {
        category: "Radionuclide therapy agents",
        words: ["Lu-177", "Y-90", "Ra-223", "Ac-225"],
        difficulty: 3,
      },
      {
        category: "Also found in a casino",
        words: ["Table", "Marker", "Wheel", "House"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-068",
    groups: [
      {
        category: "MR-Linac systems",
        words: ["Unity", "MRIdian", "Aurora", "Atlantic"],
        difficulty: 1,
      },
      {
        category: "Radiation safety signage types",
        words: ["Caution", "Danger", "Notice", "Warning"],
        difficulty: 2,
      },
      {
        category: "GTV to CTV expansion considerations",
        words: ["Microscopic", "Subclinical", "Margin recipe", "Pathology"],
        difficulty: 3,
      },
      {
        category: "Also words for speed",
        words: ["Rate", "Velocity", "Flux", "Output"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-069",
    groups: [
      {
        category: "CT noise reduction techniques",
        words: ["mAs increase", "Thicker slice", "Smoothing", "Iterative"],
        difficulty: 1,
      },
      {
        category: "Scattered radiation reduction grids",
        words: ["Focused", "Parallel", "Moving", "Stationary"],
        difficulty: 2,
      },
      {
        category: "Cobalt-60 beam characteristics",
        words: ["1.25 MeV", "Penumbra", "Isodose shift", "Decay"],
        difficulty: 3,
      },
      {
        category: "Also words in geology",
        words: ["Fault", "Drift", "Formation", "Deposit"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-070",
    groups: [
      {
        category: "SRS treatment sites",
        words: ["Trigeminal", "Acoustic", "AVM", "Metastasis"],
        difficulty: 1,
      },
      {
        category: "Accelerator RF power sources",
        words: ["Klystron", "Magnetron", "Thyratron", "Modulator"],
        difficulty: 2,
      },
      {
        category: "Biological dosimetry methods",
        words: ["Dicentric", "Micronucleus", "FISH", "Comet assay"],
        difficulty: 3,
      },
      {
        category: "Also types of cut",
        words: ["Cross section", "Profile", "Sagittal", "Axial"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-071",
    groups: [
      {
        category: "Radiation therapy prescription parameters",
        words: ["Total dose", "Fractions", "Dose per fx", "Frequency"],
        difficulty: 1,
      },
      {
        category: "MRI relaxation agents",
        words: ["Gadolinium", "Iron oxide", "Manganese", "Ferritin"],
        difficulty: 2,
      },
      {
        category: "Dose painting concepts",
        words: ["Boost", "Escalation", "Heterogeneous", "Biological"],
        difficulty: 3,
      },
      {
        category: "Also things with a 'tail'",
        words: ["Distribution", "Histogram", "Cocktail", "Detail"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-072",
    groups: [
      {
        category: "Radiotherapy OAR tolerance doses",
        words: ["Brainstem", "Optic nerve", "Spinal cord", "Cochlea"],
        difficulty: 1,
      },
      {
        category: "Nuclear medicine collimator types",
        words: ["Pinhole", "Parallel hole", "Converging", "Diverging"],
        difficulty: 2,
      },
      {
        category: "Stereotactic localization methods",
        words: ["Frame-based", "Frameless", "Fiducial", "Surface"],
        difficulty: 3,
      },
      {
        category: "Also found on a ship",
        words: ["Bridge", "Bow", "Deck", "Log"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-073",
    groups: [
      {
        category: "Photon interaction cross sections",
        words: ["Total", "Compton", "Photoelectric", "Pair"],
        difficulty: 1,
      },
      {
        category: "Radiation therapy simulation equipment",
        words: ["CT sim", "Laser", "Flat couch", "Indexing bar"],
        difficulty: 2,
      },
      {
        category: "Absorbed dose measurement standards",
        words: ["Calorimeter", "Fricke", "Ion chamber", "Alanine"],
        difficulty: 3,
      },
      {
        category: "Also words in music production",
        words: ["Mixing", "Channel", "Monitor", "Feedback"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-074",
    groups: [
      {
        category: "Radiation acute effects",
        words: ["Erythema", "Mucositis", "Alopecia", "Desquamation"],
        difficulty: 1,
      },
      {
        category: "Image registration types",
        words: ["Rigid", "Deformable", "Mutual info", "Landmark"],
        difficulty: 2,
      },
      {
        category: "TLD reader components",
        words: ["Heater", "PMT", "Planchet", "Nitrogen gas"],
        difficulty: 3,
      },
      {
        category: "Also types of test",
        words: ["Acceptance", "Benchmark", "Stress", "Baseline"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-075",
    groups: [
      {
        category: "CT contrast agent types",
        words: ["Iodinated", "Barium", "Oral", "Rectal"],
        difficulty: 1,
      },
      {
        category: "Gantry angle conventions",
        words: ["IEC", "Varian", "Non-coplanar", "Collimator"],
        difficulty: 2,
      },
      {
        category: "Radiation induced cancer models",
        words: ["Linear no-threshold", "Hormesis", "Threshold", "Supra-linear"],
        difficulty: 3,
      },
      {
        category: "Also types of market",
        words: ["Bull", "Bear", "Open", "Spot"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-076",
    groups: [
      {
        category: "MLC leaf characteristics",
        words: ["Width", "Travel", "Speed", "Leakage"],
        difficulty: 1,
      },
      {
        category: "In-vivo dosimetry detectors",
        words: ["Diode", "MOSFET", "TLD", "OSL"],
        difficulty: 2,
      },
      {
        category: "Bragg peak modulation methods",
        words: ["Ridge filter", "Range shifter", "Wheel", "Energy layer"],
        difficulty: 3,
      },
      {
        category: "Also things with a 'peak'",
        words: ["Mountain", "Bragg", "Performance", "Spectral"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-077",
    groups: [
      {
        category: "SPECT acquisition parameters",
        words: ["Projections", "Matrix", "Orbit", "Time per stop"],
        difficulty: 1,
      },
      {
        category: "Radiation shielding design factors",
        words: ["Workload", "Use factor", "Occupancy", "Distance"],
        difficulty: 2,
      },
      {
        category: "HDR afterloader components",
        words: ["Safe", "Cable", "Source", "Channel"],
        difficulty: 3,
      },
      {
        category: "Also types of run",
        words: ["Dry", "Trial", "Test", "Dummy"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-078",
    groups: [
      {
        category: "Diagnostic ultrasound parameters",
        words: ["Frequency", "Depth", "Gain", "Focus"],
        difficulty: 1,
      },
      {
        category: "Electron transport phenomena",
        words: ["Scattering", "Stopping", "Straggling", "Buildup"],
        difficulty: 2,
      },
      {
        category: "Iridium-192 HDR properties",
        words: ["380 keV", "73.8 days", "10 Ci", "Afterloader"],
        difficulty: 3,
      },
      {
        category: "Also types of flow",
        words: ["Laminar", "Turbulent", "Current", "Drift"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-079",
    groups: [
      {
        category: "FLASH radiotherapy features",
        words: ["Ultra-high dose", "Microsecond", "Sparing effect", "Oxygen"],
        difficulty: 1,
      },
      {
        category: "Quality management system elements",
        words: ["Audit", "FMEA", "Checklist", "Incident"],
        difficulty: 2,
      },
      {
        category: "PET reconstruction algorithms",
        words: ["OSEM", "FBP", "TOF", "PSF"],
        difficulty: 3,
      },
      {
        category: "Also found in a computer",
        words: ["Memory", "Bus", "Port", "Cache"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-080",
    groups: [
      {
        category: "Radiosensitivity ranking (high to low)",
        words: ["Lymphocyte", "Spermatogonia", "Crypt cell", "Neuron"],
        difficulty: 1,
      },
      {
        category: "CT pitch definitions",
        words: ["Table feed", "Rotation", "Collimation", "Overlap"],
        difficulty: 2,
      },
      {
        category: "Radiation transport simulation steps",
        words: ["Sampling", "Tracking", "Scoring", "Tallying"],
        difficulty: 3,
      },
      {
        category: "Also things with a 'face'",
        words: ["Surface", "Interface", "Clock", "Bold"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-081",
    groups: [
      {
        category: "Treatment verification methods",
        words: ["Portal image", "EPID", "In-vivo", "Log file"],
        difficulty: 1,
      },
      {
        category: "MRI gradient performance specs",
        words: ["Amplitude", "Slew rate", "Duty cycle", "Linearity"],
        difficulty: 2,
      },
      {
        category: "Activation products in linac rooms",
        words: ["O-15", "N-13", "C-11", "Ar-41"],
        difficulty: 3,
      },
      {
        category: "Also found in a newspaper",
        words: ["Column", "Exposure", "Lead", "Impression"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-082",
    groups: [
      {
        category: "Brachytherapy source geometries",
        words: ["Point", "Line", "Ring", "Volume"],
        difficulty: 1,
      },
      {
        category: "PET scanner performance metrics",
        words: ["Sensitivity", "Resolution", "NEC", "NECR"],
        difficulty: 2,
      },
      {
        category: "Pencil beam scanning parameters",
        words: ["Spot size", "Spacing", "Layer", "Weight"],
        difficulty: 3,
      },
      {
        category: "Also words in sewing",
        words: ["Needle", "Thread", "Bobbin", "Pattern"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-083",
    groups: [
      {
        category: "Photon attenuation coefficients",
        words: ["Linear", "Mass", "Energy", "Electronic"],
        difficulty: 1,
      },
      {
        category: "CT detector materials",
        words: ["Cadmium tungstate", "Ceramic", "Xenon", "Garnet"],
        difficulty: 2,
      },
      {
        category: "Tumor hypoxia markers",
        words: ["FMISO", "FAZA", "Cu-ATSM", "Pimonidazole"],
        difficulty: 3,
      },
      {
        category: "Also words in weather forecasting",
        words: ["Front", "Pressure", "Model", "Gradient"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-084",
    groups: [
      {
        category: "Radiation units named after scientists",
        words: ["Becquerel", "Gray", "Sievert", "Roentgen"],
        difficulty: 1,
      },
      {
        category: "Volumetric arc therapy parameters",
        words: ["Gantry speed", "Dose rate", "MLC shape", "Arc length"],
        difficulty: 2,
      },
      {
        category: "Thermoluminescence process steps",
        words: ["Irradiation", "Trapping", "Heating", "Emission"],
        difficulty: 3,
      },
      {
        category: "Also things that can 'collapse'",
        words: ["Cone", "Lung", "Structure", "Cavity"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-085",
    groups: [
      {
        category: "CyberKnife tracking methods",
        words: ["Skull", "Spine", "Fiducial", "Lung"],
        difficulty: 1,
      },
      {
        category: "Radiation biology survival curve regions",
        words: ["Shoulder", "Exponential", "Initial slope", "Final slope"],
        difficulty: 2,
      },
      {
        category: "Small field dosimetry challenges",
        words: ["Equilibrium", "Volume averaging", "Positioning", "Spectrum"],
        difficulty: 3,
      },
      {
        category: "Also parts of a letter",
        words: ["Body", "Header", "Signature", "Seal"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-086",
    groups: [
      {
        category: "EPID applications",
        words: ["Portal imaging", "Dosimetry", "QA", "MLC check"],
        difficulty: 1,
      },
      {
        category: "Ultrasound Doppler modes",
        words: ["Color", "Power", "Pulsed", "Continuous"],
        difficulty: 2,
      },
      {
        category: "Radiation carcinogenesis stages",
        words: ["Initiation", "Promotion", "Progression", "Latency"],
        difficulty: 3,
      },
      {
        category: "Also types of charge",
        words: ["Surface", "Space", "Induced", "Trapped"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-087",
    groups: [
      {
        category: "Patient specific QA tools",
        words: ["Ion chamber", "Film", "Array", "Gel"],
        difficulty: 1,
      },
      {
        category: "Linac monitor chamber functions",
        words: ["Dose 1", "Dose 2", "Flatness", "Symmetry"],
        difficulty: 2,
      },
      {
        category: "Magnetic field units",
        words: ["Tesla", "Gauss", "Weber", "Henry"],
        difficulty: 3,
      },
      {
        category: "Also types of line",
        words: ["Isodose", "Contour", "Profile", "Boundary"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-088",
    groups: [
      {
        category: "Nuclear medicine renal agents",
        words: ["MAG3", "DTPA", "DMSA", "Hippuran"],
        difficulty: 1,
      },
      {
        category: "Beam matching parameters",
        words: ["PDD", "Profile", "Output", "Penumbra"],
        difficulty: 2,
      },
      {
        category: "MRI artifacts from metal",
        words: ["Signal void", "Distortion", "Pile-up", "Displacement"],
        difficulty: 3,
      },
      {
        category: "Also parts of a camera",
        words: ["Aperture", "Shutter", "Lens", "Body"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-089",
    groups: [
      {
        category: "Radiation therapy site setup marks",
        words: ["Tattoo", "Crosshair", "BB marker", "Wire"],
        difficulty: 1,
      },
      {
        category: "Positron emitter half-lives (minutes)",
        words: ["F-18 (110)", "C-11 (20)", "N-13 (10)", "O-15 (2)"],
        difficulty: 2,
      },
      {
        category: "Dose calculation heterogeneity methods",
        words: ["Ratio of TAR", "Power law", "Batho", "Equivalent path"],
        difficulty: 3,
      },
      {
        category: "Also associated with fire",
        words: ["Alarm", "Blanket", "Escape", "Ladder"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-090",
    groups: [
      {
        category: "Linear accelerator beam energies",
        words: ["6 FFF", "10 FFF", "6 MV", "15 MV"],
        difficulty: 1,
      },
      {
        category: "Cone beam CT reconstruction issues",
        words: ["Feldkamp", "Scatter", "Cone angle", "Truncation"],
        difficulty: 2,
      },
      {
        category: "Cell death mechanisms from radiation",
        words: ["Apoptosis", "Mitotic", "Necrosis", "Senescence"],
        difficulty: 3,
      },
      {
        category: "Also things with a 'bed'",
        words: ["Couch", "Flower", "River", "Seed"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-091",
    groups: [
      {
        category: "MRI echo types",
        words: ["Spin echo", "Gradient echo", "Stimulated", "Hahn"],
        difficulty: 1,
      },
      {
        category: "Treatment planning dose constraints",
        words: ["Maximum", "Mean", "Dmax", "D0.03cc"],
        difficulty: 2,
      },
      {
        category: "Heavy ion therapy advantages",
        words: ["Sharp Bragg", "High RBE", "Low scatter", "OER reduction"],
        difficulty: 3,
      },
      {
        category: "Also words used in finance",
        words: ["Yield", "Exposure", "Margin", "Portfolio"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-092",
    groups: [
      {
        category: "Radiotherapy wedge types",
        words: ["Physical", "Dynamic", "Enhanced", "Virtual"],
        difficulty: 1,
      },
      {
        category: "Shielding tenth value layers",
        words: ["Concrete", "Lead", "Steel", "Earth"],
        difficulty: 2,
      },
      {
        category: "OSL dosimeter properties",
        words: ["Al2O3:C", "Green laser", "Rereadable", "Nanodot"],
        difficulty: 3,
      },
      {
        category: "Also things that are 'flat'",
        words: ["Panel", "Rate", "Screen", "Iron"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-093",
    groups: [
      {
        category: "Molecular imaging tracers",
        words: ["FDG", "FLT", "FMISO", "Choline"],
        difficulty: 1,
      },
      {
        category: "Electron beam dose distribution features",
        words: ["Surface dose", "Rapid falloff", "Bremsstrahlung", "X-ray tail"],
        difficulty: 2,
      },
      {
        category: "Accelerator safety systems",
        words: ["Area monitor", "Interlock", "Beam dump", "Emergency off"],
        difficulty: 3,
      },
      {
        category: "Also associated with magic",
        words: ["Wand", "Ring", "Crystal", "Phantom"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-094",
    groups: [
      {
        category: "CT image post-processing techniques",
        words: ["MPR", "MIP", "VRT", "MinIP"],
        difficulty: 1,
      },
      {
        category: "Endocavitary brachytherapy sites",
        words: ["Cervix", "Esophagus", "Bronchus", "Rectum"],
        difficulty: 2,
      },
      {
        category: "Radionuclide purity types",
        words: ["Radionuclidic", "Radiochemical", "Chemical", "Isotopic"],
        difficulty: 3,
      },
      {
        category: "Also words in a gym",
        words: ["Rep", "Set", "Cycle", "Recovery"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-095",
    groups: [
      {
        category: "Photon beam flatness specifications",
        words: ["Central axis", "80% width", "Horns", "Shoulders"],
        difficulty: 1,
      },
      {
        category: "MRI diffusion imaging terms",
        words: ["b-value", "ADC", "Tractography", "FA map"],
        difficulty: 2,
      },
      {
        category: "Eye plaque brachytherapy isotopes",
        words: ["Ru-106", "I-125", "Pd-103", "Sr-90"],
        difficulty: 3,
      },
      {
        category: "Also things with 'walls'",
        words: ["Cavity", "Cell", "Chest", "Chamber"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-096",
    groups: [
      {
        category: "Superficial treatment units",
        words: ["Grenz ray", "Contact", "Superficial", "Orthovoltage"],
        difficulty: 1,
      },
      {
        category: "Nuclear medicine bone scan phases",
        words: ["Flow", "Blood pool", "Delayed", "SPECT"],
        difficulty: 2,
      },
      {
        category: "Stereotactic cone sizes (mm)",
        words: ["4", "8", "14", "18"],
        difficulty: 3,
      },
      {
        category: "Also words in law",
        words: ["Chamber", "Bar", "Bench", "Appeal"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-097",
    groups: [
      {
        category: "Dosimetric leaf gap corrections",
        words: ["Rounded leaf", "Tongue groove", "Transmission", "Interleaf"],
        difficulty: 1,
      },
      {
        category: "Radiation induced vascular effects",
        words: ["Telangiectasia", "Edema", "Thrombosis", "Stenosis"],
        difficulty: 2,
      },
      {
        category: "Y-90 microsphere therapy terms",
        words: ["SIR-Spheres", "TheraSphere", "Lung shunt", "BSA method"],
        difficulty: 3,
      },
      {
        category: "Also types of film",
        words: ["Action", "Short", "Exposure", "Documentary"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-098",
    groups: [
      {
        category: "External beam treatment accessories",
        words: ["Bolus", "Block tray", "Wedge", "Compensator"],
        difficulty: 1,
      },
      {
        category: "CT artifact correction methods",
        words: ["MAR", "Dual energy", "Interpolation", "Sinogram"],
        difficulty: 2,
      },
      {
        category: "Radiation protection regulatory bodies",
        words: ["ICRP", "NCRP", "NRC", "IAEA"],
        difficulty: 3,
      },
      {
        category: "Also types of spectrum",
        words: ["Broad", "Continuous", "Discrete", "Emission"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-099",
    groups: [
      {
        category: "MRI safety screening items",
        words: ["Pacemaker", "Cochlear", "Aneurysm clip", "Shrapnel"],
        difficulty: 1,
      },
      {
        category: "Photoneutron production thresholds",
        words: ["Tungsten", "Lead", "Copper", "Iron"],
        difficulty: 2,
      },
      {
        category: "Dose painting imaging biomarkers",
        words: ["FDG uptake", "ADC value", "Perfusion", "Hypoxia"],
        difficulty: 3,
      },
      {
        category: "Also words for 'zero'",
        words: ["Null", "Baseline", "Origin", "Ground"],
        difficulty: 4,
      },
    ],
  },
  {
    id: "conn-100",
    groups: [
      {
        category: "Total skin electron therapy features",
        words: ["Stanford", "Six fields", "Dual angle", "3-4 MeV"],
        difficulty: 1,
      },
      {
        category: "Lutetium-177 therapy targets",
        words: ["PSMA", "DOTATATE", "Neuroendocrine", "Prostate"],
        difficulty: 2,
      },
      {
        category: "Machine QA frequency categories",
        words: ["Daily", "Monthly", "Annual", "Continuous"],
        difficulty: 3,
      },
      {
        category: "Also things with a 'shield'",
        words: ["Heat", "Wind", "Eye", "Radiation"],
        difficulty: 4,
      },
    ],
  },
];

export function getRandomPuzzle(): ConnectionPuzzle {
  return CONNECTION_PUZZLES[
    Math.floor(Math.random() * CONNECTION_PUZZLES.length)
  ];
}
