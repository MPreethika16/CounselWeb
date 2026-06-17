/**
 * Phase 2.5 — Extract structured placement statistics from crawled page text.
 */
import { PDFParse } from "pdf-parse";


// ---------------------------------------------------------------------------
// Priority placement URL path fragments (matched against page URL)
// ---------------------------------------------------------------------------
export const PLACEMENT_PATH_FRAGMENTS = [
  "/placements",
  "/training-placement",
  "/career-development-center",
  "/placement-cell",
  "/placement-statistics",
  "/placements-and-training",
  "/recruiters",
  "/annual-report"
];

// ---------------------------------------------------------------------------
// Page-type → base confidence
// ---------------------------------------------------------------------------
export const PLACEMENT_PAGE_CONFIDENCE = {
  placements: 95,
  "training-placement": 95,
  "placement-cell": 95,
  "placement-statistics": 95,
  "placements-and-training": 95,
  recruiters: 95,
  "career-development-center": 95,
  "annual-report": 70,
  brochure: 85,
  home: 50,
  about: 50,
  "about-us": 50
};

export const getSourceTypeFromPageType = (pageType = "", url = "") => {
  const pt = (pageType || "").toLowerCase();
  const lowerUrl = (url || "").toLowerCase();

  if (lowerUrl.includes(".pdf") || pt === "brochure") {
    return "official_pdf";
  }
  
  if (lowerUrl.includes("annual-report") || lowerUrl.includes("annual_report") || pt === "annual-report" || pt === "annual_report") {
    return "annual_report";
  }

  if (
    pt === "placements" ||
    pt === "training-placement" ||
    pt === "placement-cell" ||
    pt === "placement-statistics" ||
    pt === "placements-and-training" ||
    pt === "recruiters" ||
    pt === "career-development-center" ||
    PLACEMENT_PATH_FRAGMENTS.some((frag) => lowerUrl.includes(frag))
  ) {
    return "official_placement_page";
  }

  return "general_page";
};

export const determineSourceSummary = (merged) => {
  const metrics = [
    "highestPackage",
    "averagePackage",
    "medianPackage",
    "placementPercentage",
    "totalOffers",
    "totalPlacedStudents",
    "placementYear"
  ];

  let bestField = null;
  let highestConf = -1;

  for (const field of metrics) {
    if (merged[field] !== null && merged[field] !== undefined) {
      const conf = merged._fieldConf?.[field] || 0;
      if (conf > highestConf) {
        highestConf = conf;
        bestField = field;
      }
    }
  }

  if (bestField && merged.lineage?.[bestField] && merged.lineage[bestField].sourceUrl) {
    return {
      primarySourceType: merged.lineage[bestField].sourceType || "",
      primarySourceUrl: merged.lineage[bestField].sourceUrl || ""
    };
  }

  const fallbackUrl = merged._bestSourceUrl || "";
  const fallbackType = getSourceTypeFromPageType(null, fallbackUrl);
  return {
    primarySourceType: fallbackType,
    primarySourceUrl: fallbackUrl
  };
};

// ---------------------------------------------------------------------------
// Recruiter alias normalization
// ---------------------------------------------------------------------------
export const RECRUITER_ALIAS_MAP = [
  { pattern: /tata\s+consultancy\s+services?/i, name: "TCS" },
  { pattern: /\btcs\b/i, name: "TCS" },
  { pattern: /infosys(?:\s+limited|\s+technologies)?/i, name: "Infosys" },
  { pattern: /\bwipro\b/i, name: "Wipro" },
  { pattern: /hcl\s+technologies?/i, name: "HCL" },
  { pattern: /\bhcl\b/i, name: "HCL" },
  { pattern: /tech\s*mahindra/i, name: "Tech Mahindra" },
  { pattern: /cognizant/i, name: "Cognizant" },
  { pattern: /capgemini/i, name: "Capgemini" },
  { pattern: /accenture/i, name: "Accenture" },
  { pattern: /amazon/i, name: "Amazon" },
  { pattern: /microsoft/i, name: "Microsoft" },
  { pattern: /google/i, name: "Google" },
  { pattern: /deloitte/i, name: "Deloitte" },
  { pattern: /ibm/i, name: "IBM" },
  { pattern: /oracle/i, name: "Oracle" },
  { pattern: /dell/i, name: "Dell" },
  { pattern: /l\s*&\s*t/i, name: "L&T" },
  { pattern: /larsen\s*&\s*toubro/i, name: "L&T" },
  { pattern: /genpact/i, name: "Genpact" },
  { pattern: /mphasis/i, name: "Mphasis" },
  { pattern: /cyient/i, name: "Cyient" },
  { pattern: /qualcomm/i, name: "Qualcomm" },
  { pattern: /intel/i, name: "Intel" },
  { pattern: /paypal/i, name: "PayPal" },
  { pattern: /salesforce/i, name: "Salesforce" },
  { pattern: /adobe/i, name: "Adobe" },
  { pattern: /sap\b/i, name: "SAP" },
  { pattern: /jpmorgan/i, name: "JPMorgan" },
  { pattern: /goldman\s+sachs/i, name: "Goldman Sachs" },
  { pattern: /deutsche\s+bank/i, name: "Deutsche Bank" },
  { pattern: /hsbc/i, name: "HSBC" },
  { pattern: /icici/i, name: "ICICI" },
  { pattern: /kotak/i, name: "Kotak" },
  { pattern: /\bcts\b/i, name: "Cognizant" },
  { pattern: /mahindra\s*&\s*mahindra/i, name: "Mahindra & Mahindra" },
  { pattern: /ericsson/i, name: "Ericsson" }
];

const NOISE_RECRUITER = new Set([
  "placement", "placements", "recruiters", "recruiter", "companies", "company",
  "visited", "hiring", "partners", "partner", "our", "and", "the", "for", "with",
  "students", "student", "batch", "year", "drive", "drives", "campus", "offers",
  "package", "lpa", "ctc", "salary", "highest", "average", "median", "percent",
  "percentage", "total", "placed", "statistics", "training", "cell", "department"
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const isPlacementPage = (pageType = "", url = "") => {
  const pt = (pageType || "").toLowerCase();
  const lowerUrl = (url || "").toLowerCase();

  if (Object.prototype.hasOwnProperty.call(PLACEMENT_PAGE_CONFIDENCE, pt) &&
      pt !== "home" && pt !== "about" && pt !== "about-us") {
    return true;
  }

  return PLACEMENT_PATH_FRAGMENTS.some((frag) => lowerUrl.includes(frag));
};

export const getPlacementPageConfidence = (pageType = "", url = "") => {
  const pt = (pageType || "").toLowerCase();
  if (PLACEMENT_PAGE_CONFIDENCE[pt]) return PLACEMENT_PAGE_CONFIDENCE[pt];

  const lowerUrl = (url || "").toLowerCase();
  if (lowerUrl.includes("annual-report")) return 70;
  if (lowerUrl.includes("brochure")) return 85;
  if (PLACEMENT_PATH_FRAGMENTS.some((f) => lowerUrl.includes(f))) return 95;
  return 50;
};

/**
 * Normalize a raw package string to LPA (lakhs per annum).
 */
export const parsePackageToLpa = (rawValue, rawUnit = "") => {
  const num = parseFloat(String(rawValue).replace(/,/g, ""));
  if (Number.isNaN(num) || num <= 0) return null;

  const unit = (rawUnit || "").toLowerCase().replace(/\./g, "");
  if (/cr|crore/.test(unit)) return Math.round(num * 100 * 100) / 100;
  if (/lpa|lakh|lac/.test(unit)) return num;
  if (/thousand|k\b/.test(unit)) return Math.round((num / 100) * 100) / 100;
  // Bare number on placement pages — assume LPA if <= 100, else paise/thousands noise
  if (num > 0 && num <= 100) return num;
  if (num > 100 && num <= 5000000) return Math.round((num / 100000) * 100) / 100;
  return null;
};

export const normalizeRecruiterName = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 80) return null;
  if (NOISE_RECRUITER.has(trimmed.toLowerCase())) return null;
  if (/^\d+$/.test(trimmed)) return null;

  for (const { pattern, name } of RECRUITER_ALIAS_MAP) {
    if (pattern.test(trimmed)) return name;
  }

  // Title-case short names, preserve acronyms
  if (/^[A-Z0-9&.\-\s]{2,}$/.test(trimmed)) return trimmed;
  return trimmed
    .split(" ")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
};

export const dedupeRecruiters = (names = []) => {
  const seen = new Set();
  const out = [];
  for (const raw of names) {
    const norm = normalizeRecruiterName(raw);
    if (!norm) continue;
    const key = norm.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(norm);
    }
  }
  return out;
};

const extractEvidenceSnippet = (text, index, radius = 90) => {
  if (!text || index < 0) return "";
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
};

const findLabeledPackage = (text, labelPattern, options = {}) => {
  const { requireHighest = false } = options;
  const results = [];

  const patterns = [
    new RegExp(
      `(?:${labelPattern})[^\\d]{0,40}?(\\d[\\d,]*(?:\\.\\d+)?)\\s*(lpa|l\\.?p\\.?a\\.?|lakhs?|lacs?|crores?|cr\\.?)?`,
      "gi"
    ),
    new RegExp(
      `(?:${labelPattern})[^\\d]{0,10}?₹?\\s*(\\d[\\d,]*(?:\\.\\d+)?)\\s*(lpa|lakhs?|lacs?|crores?|cr\\.?)?`,
      "gi"
    )
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const lpa = parsePackageToLpa(match[1], match[2] || "lpa");
      if (lpa === null || lpa <= 0 || lpa > 200) continue;
      if (requireHighest && !/highest|maximum|max|top/i.test(match[0])) continue;
      results.push({ value: lpa, evidence: extractEvidenceSnippet(text, match.index), index: match.index });
    }
  }

  return results;
};

export const extractPlacementYear = (text) => {
  if (!text) return null;
  const years = [];
  let m;

  // 1. AY 2024-25 or 2024-25 or similar academic ranges
  const academicRegex = /(?:ay\s+)?\b(20\d{2})\s*[-–/]\s*(20\d{2}|\d{2})\b/gi;
  while ((m = academicRegex.exec(text)) !== null) {
    const endPart = m[2];
    const endYear = endPart.length === 2 ? parseInt(`20${endPart}`, 10) : parseInt(endPart, 10);
    if (endYear >= 2015 && endYear <= 2035) {
      years.push(endYear);
    }
  }

  // 2. Batch of 2025 or Batch 2025
  const batchRegex = /batch\s+(?:of\s+)?(20\d{2})\b/gi;
  while ((m = batchRegex.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    if (y >= 2015 && y <= 2035) {
      years.push(y);
    }
  }

  // 3. Contextual placement year (e.g. placement year 2025 or graduating batch 2025)
  const placementYearRegex = /(?:placement|academic)\s+(?:year\s+)?(20\d{2})\b/gi;
  while ((m = placementYearRegex.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    if (y >= 2015 && y <= 2035) {
      years.push(y);
    }
  }

  // 4. Plain year
  const lines = text.split("\n");
  for (const line of lines) {
    if (/©|copyright|developed\s+by|all\s+rights\s+reserved/i.test(line)) continue;
    const plainRegex = /\b(20\d{2})\b/g;
    while ((m = plainRegex.exec(line)) !== null) {
      const y = parseInt(m[1], 10);
      if (y >= 2015 && y <= 2035) {
        years.push(y);
      }
    }
  }

  if (years.length === 0) return null;
  return Math.max(...years);
};

export const extractPlacementYearDetails = (text) => {
  if (!text) return { year: null, evidence: "" };
  const candidates = [];
  let m;

  // 1. AY 2024-25 or 2024-25 or similar academic ranges
  const academicRegex = /(?:ay\s+)?\b(20\d{2})\s*[-–/]\s*(20\d{2}|\d{2})\b/gi;
  while ((m = academicRegex.exec(text)) !== null) {
    const endPart = m[2];
    const endYear = endPart.length === 2 ? parseInt(`20${endPart}`, 10) : parseInt(endPart, 10);
    if (endYear >= 2015 && endYear <= 2035) {
      candidates.push({ year: endYear, evidence: m[0] });
    }
  }

  // 2. Batch of 2025 or Batch 2025
  const batchRegex = /batch\s+(?:of\s+)?(20\d{2})\b/gi;
  while ((m = batchRegex.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    if (y >= 2015 && y <= 2035) {
      candidates.push({ year: y, evidence: m[0] });
    }
  }

  // 3. Contextual placement year (e.g. placement year 2025 or graduating batch 2025)
  const placementYearRegex = /(?:placement|academic)\s+(?:year\s+)?(20\d{2})\b/gi;
  while ((m = placementYearRegex.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    if (y >= 2015 && y <= 2035) {
      candidates.push({ year: y, evidence: m[0] });
    }
  }

  // 4. Placements 2025
  const placementsYearRegex = /placements?\s+(20\d{2})\b/gi;
  while ((m = placementsYearRegex.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    if (y >= 2015 && y <= 2035) {
      candidates.push({ year: y, evidence: m[0] });
    }
  }

  // 5. Plain year (excluding copyright lines)
  const lines = text.split("\n");
  for (const line of lines) {
    if (/©|copyright|developed\s+by|all\s+rights\s+reserved/i.test(line)) continue;
    const plainRegex = /\b(20\d{2})\b/g;
    while ((m = plainRegex.exec(line)) !== null) {
      const y = parseInt(m[1], 10);
      if (y >= 2015 && y <= 2035) {
        candidates.push({ year: y, evidence: m[0] });
      }
    }
  }

  if (candidates.length === 0) return { year: null, evidence: "" };
  
  // Sort descending by year, then by evidence length (longer evidence like "AY 2024-25" is preferred over plain "2025")
  candidates.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.evidence.length - a.evidence.length;
  });
  
  return candidates[0];
};

const extractRecruitersFromText = (text) => {
  const found = [];

  // MoU / corporate partnership lists
  const mouRegex = /mo[uü]?['']?s?\s+with\s+([^.\n]{10,500})/gi;
  let match;
  while ((match = mouRegex.exec(text)) !== null) {
    match[1]
      .split(/\s*,\s*|\s+and\s+/i)
      .forEach((part) => {
        const cleaned = part.trim().replace(/\s+for\s+conducting.*$/i, "").trim();
        if (cleaned.length >= 2) found.push(cleaned);
      });
  }

  const sectionRegex = /(?:recruiters?|companies\s+visited|hiring\s+partners?|our\s+recruiters|major\s+recruiters|top\s+recruiters|visited\s+cbit\s+recruiting)[:\s\-]*([^\n]{20,800})/gi;
  while ((match = sectionRegex.exec(text)) !== null) {
    const chunk = match[1];
    chunk.split(/[,;|\n•·▪▫]/).forEach((part) => {
      const cleaned = part.trim().replace(/\s+for\s+conducting.*$/i, "").trim();
      if (cleaned.length >= 2 && !/recruiting\s+\d+/i.test(cleaned)) found.push(cleaned);
    });
  }

  for (const { pattern, name } of RECRUITER_ALIAS_MAP) {
    if (pattern.test(text)) found.push(name);
  }

  return dedupeRecruiters(found);
};

const extractPlacementPercentage = (text) => {
  const patterns = [
    /(\d{1,3}(?:\.\d+)?)\s*%[^\n]{0,50}?(?:placement|placed|students?\s+placed)/gi,
    /(?:placement|placed)\s*(?:rate|percentage|ratio)[^\d]{0,20}?(\d{1,3}(?:\.\d+)?)\s*%/gi,
    /(\d{1,3}(?:\.\d+)?)\s*percent[^\n]{0,50}?(?:placement|placed)/gi,
    /placement\s+rate\s+(?:of\s+)?(\d{1,3}(?:\.\d+)?)\s*%/gi
  ];

  const candidates = [];
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const val = parseFloat(match[1]);
      if (val >= 0 && val <= 100) {
        candidates.push({ value: val, evidence: extractEvidenceSnippet(text, match.index) });
      }
    }
  }

  if (!candidates.length) return null;
  return candidates[0];
};

const extractCount = (text, labelPattern) => {
  const regex = new RegExp(`(?:${labelPattern})[^\\d]{0,30}?(\\d[\\d,]*)`, "gi");
  const match = regex.exec(text);
  if (!match) return null;
  const val = parseInt(match[1].replace(/,/g, ""), 10);
  return Number.isNaN(val) || val <= 0 ? null : val;
};

// ---------------------------------------------------------------------------
// Main per-page extractor
// ---------------------------------------------------------------------------
export const extractPlacementsFromPage = (text, url = "", pageType = "") => {
  const empty = {
    highestPackage: null,
    highestPackageEvidence: "",
    averagePackage: null,
    averagePackageEvidence: "",
    medianPackage: null,
    medianPackageEvidence: "",
    placementPercentage: null,
    placementPercentageEvidence: "",
    totalOffers: null,
    totalOffersEvidence: "",
    totalPlacedStudents: null,
    totalPlacedStudentsEvidence: "",
    recruiters: [],
    placementYear: null,
    placementYearEvidence: "",
    evidenceLines: [],
    inferredAverage: false,
    pageType,
    url
  };

  if (!text || typeof text !== "string") return empty;

  const normalized = text.replace(/\r\n/g, "\n");
  const evidenceLines = [];

  const addEvidence = (line) => {
    if (line && !evidenceLines.includes(line)) evidenceLines.push(line);
  };

  // Highest — must be explicitly labelled
  let highestPackage = null;
  let highestPackageEvidence = "";
  const highestCandidates = findLabeledPackage(
    normalized,
    "highest|maximum|max\\.?|top\\s+package|highest\\s+ctc|highest\\s+salary",
    { requireHighest: true }
  );
  if (highestCandidates.length) {
    highestPackage = Math.max(...highestCandidates.map((c) => c.value));
    const best = highestCandidates.find((c) => c.value === highestPackage);
    highestPackageEvidence = best?.evidence || `Highest package: ${highestPackage} LPA`;
    addEvidence(highestPackageEvidence);
  }

  // Average — ONLY explicit average labels (never infer from other stats)
  let averagePackage = null;
  let averagePackageEvidence = "";
  const avgCandidates = findLabeledPackage(
    normalized,
    "average|avg\\.?\\s+package|mean\\s+package|average\\s+ctc|average\\s+salary"
  );
  if (avgCandidates.length) {
    averagePackage = avgCandidates.reduce((a, b) => (a.value >= b.value ? a : b)).value;
    const best = avgCandidates.find((c) => c.value === averagePackage);
    averagePackageEvidence = best?.evidence || `Average package: ${averagePackage} LPA`;
    addEvidence(averagePackageEvidence);
  }

  // Median — ONLY explicit median labels
  let medianPackage = null;
  let medianPackageEvidence = "";
  const medianCandidates = findLabeledPackage(
    normalized,
    "median\\s+package|median\\s+ctc|median\\s+salary"
  );
  if (medianCandidates.length) {
    medianPackage = medianCandidates[0].value;
    medianPackageEvidence = medianCandidates[0].evidence || `Median package: ${medianPackage} LPA`;
    addEvidence(medianPackageEvidence);
  }

  // Placement percentage
  let placementPercentage = null;
  let placementPercentageEvidence = "";
  const pctResult = extractPlacementPercentage(normalized);
  if (pctResult) {
    placementPercentage = pctResult.value;
    placementPercentageEvidence = pctResult.evidence || `Placement rate: ${placementPercentage}%`;
    addEvidence(placementPercentageEvidence);
  }

  // Counts
  let totalOffers = null;
  let totalOffersEvidence = "";
  const totalOffersVal = extractCount(normalized, "total\\s+offers?|number\\s+of\\s+offers?|offers\\s+received");
  if (totalOffersVal !== null) {
    totalOffers = totalOffersVal;
    const regex = new RegExp(`(?:total\\s+offers?|number\\s+of\\s+offers?|offers\\s+received)[^\\d]{0,30}?(\\d[\\d,]*)`, "i");
    const m = regex.exec(normalized);
    if (m) {
      totalOffersEvidence = extractEvidenceSnippet(normalized, m.index);
    } else {
      totalOffersEvidence = `Total offers: ${totalOffers}`;
    }
  }

  let totalPlacedStudents = null;
  let totalPlacedStudentsEvidence = "";
  const totalPlacedVal = extractCount(
    normalized,
    "students?\\s+placed|total\\s+placed|placed\\s+students?|no\\.?\\s+of\\s+students?\\s+placed"
  );
  if (totalPlacedVal !== null) {
    totalPlacedStudents = totalPlacedVal;
    const regex = new RegExp(`(?:students?\\s+placed|total\\s+placed|placed\\s+students?|no\\.?\\s+of\\s+students?\\s+placed)[^\\d]{0,30}?(\\d[\\d,]*)`, "i");
    const m = regex.exec(normalized);
    if (m) {
      totalPlacedStudentsEvidence = extractEvidenceSnippet(normalized, m.index);
    } else {
      totalPlacedStudentsEvidence = `Total placed students: ${totalPlacedStudents}`;
    }
  }

  // Recruiters
  const rawRecruiters = extractRecruitersFromText(normalized);
  const pageConf = getPlacementPageConfidence(pageType, url);
  const recruiters = rawRecruiters.map(r => {
    const lines = normalized.split("\n");
    const matchedLine = lines.find(line => {
      const escaped = r.replace(/[&()*+?.[\]{}|\\^$]/g, "\\$&");
      const hasWordChars = /^\w+$/.test(r);
      const re = hasWordChars ? new RegExp(`\\b${escaped}\\b`, "i") : new RegExp(escaped, "i");
      return re.test(line);
    }) || `Recruiters: ${r}`;

    return {
      name: r,
      confidence: pageConf,
      sourceUrl: url,
      evidenceText: matchedLine.trim().substring(0, 200)
    };
  });

  if (recruiters.length) {
    addEvidence(`Recruiters: ${rawRecruiters.slice(0, 6).join(", ")}`);
  }

  // Year
  const yearDetails = extractPlacementYearDetails(normalized);
  const placementYear = yearDetails.year;
  const placementYearEvidence = yearDetails.evidence;
  if (placementYear !== null) {
    addEvidence(`Placement year: ${placementYear}`);
  }

  return {
    highestPackage,
    highestPackageEvidence,
    averagePackage,
    averagePackageEvidence,
    medianPackage,
    medianPackageEvidence,
    placementPercentage,
    placementPercentageEvidence,
    totalOffers,
    totalOffersEvidence,
    totalPlacedStudents,
    totalPlacedStudentsEvidence,
    recruiters,
    placementYear,
    placementYearEvidence,
    evidenceLines,
    inferredAverage: false,
    pageType,
    url
  };
};

/**
 * Merge page-level extraction into accumulated result (confidence-aware).
 */
export const mergePlacementExtraction = (accumulated, pageResult, pageConf, sourceUrl) => {
  const out = { ...accumulated };
  const fieldConf = { ...(accumulated._fieldConf || {}) };

  // Ensure lineage is initialized in out
  if (!out.lineage) {
    out.lineage = {
      highestPackage: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
      averagePackage: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
      medianPackage: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
      placementPercentage: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
      totalOffers: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
      totalPlacedStudents: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
      placementYear: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" }
    };
  }

  const sourceType = getSourceTypeFromPageType(pageResult.pageType, sourceUrl);

  const updateNumeric = (field, value, evidenceKey) => {
    if (value === null || value === undefined) return;
    const prevConf = fieldConf[field] || 0;
    if (pageConf > prevConf || out[field] === null) {
      out[field] = value;
      fieldConf[field] = pageConf;
      const evidenceText = pageResult[evidenceKey] || "";
      out.lineage[field] = {
        sourceUrl,
        sourceType,
        extractedAt: new Date(),
        evidenceText
      };
    } else if (pageConf === prevConf && field === "highestPackage" && out[field] !== null) {
      if (value > out[field]) {
        out[field] = value;
        const evidenceText = pageResult[evidenceKey] || "";
        out.lineage[field] = {
          sourceUrl,
          sourceType,
          extractedAt: new Date(),
          evidenceText
        };
      }
    }
  };

  updateNumeric("highestPackage", pageResult.highestPackage, "highestPackageEvidence");
  updateNumeric("averagePackage", pageResult.averagePackage, "averagePackageEvidence");
  updateNumeric("medianPackage", pageResult.medianPackage, "medianPackageEvidence");
  updateNumeric("placementPercentage", pageResult.placementPercentage, "placementPercentageEvidence");
  updateNumeric("totalOffers", pageResult.totalOffers, "totalOffersEvidence");
  updateNumeric("totalPlacedStudents", pageResult.totalPlacedStudents, "totalPlacedStudentsEvidence");

  const isPlacePage = isPlacementPage(pageResult.pageType || "", sourceUrl);
  if (isPlacePage) {
    out.hasPlacementPage = true;
  }

  if (pageResult.placementYear !== null) {
    const prevConf = fieldConf.placementYear || 0;
    if (pageConf > prevConf || out.placementYear === null) {
      out.placementYear = pageResult.placementYear;
      out.placementYearEvidence = pageResult.placementYearEvidence || "";
      fieldConf.placementYear = pageConf;
      out.lineage.placementYear = {
        sourceUrl,
        sourceType,
        extractedAt: new Date(),
        evidenceText: pageResult.placementYearEvidence || ""
      };
    } else if (pageConf === prevConf && out.placementYear !== null) {
      if (pageResult.placementYear > out.placementYear) {
        out.placementYear = pageResult.placementYear;
        out.placementYearEvidence = pageResult.placementYearEvidence || "";
        out.lineage.placementYear = {
          sourceUrl,
          sourceType,
          extractedAt: new Date(),
          evidenceText: pageResult.placementYearEvidence || ""
        };
      }
    }
  }

  if (pageResult.recruiters?.length) {
    const merged = [...(out.recruiters || [])];
    for (const newRec of pageResult.recruiters) {
      const idx = merged.findIndex(r => r.name.toLowerCase() === newRec.name.toLowerCase());
      if (idx !== -1) {
        if (newRec.confidence > merged[idx].confidence) {
          merged[idx] = newRec;
        }
      } else {
        merged.push(newRec);
      }
    }
    out.recruiters = merged;
    fieldConf.recruiters = Math.max(fieldConf.recruiters || 0, pageConf);
  }

  if (pageConf > (out._highestPageConf || 0)) {
    out._highestPageConf = pageConf;
    out._bestSourceUrl = sourceUrl;
  }

  out._fieldConf = fieldConf;
  out._allEvidence = [...(out._allEvidence || []), ...(pageResult.evidenceLines || [])];
  return out;
};

export const finalizePlacementRecord = (merged) => {
  const hasHighQualityMetrics =
    merged.highestPackage !== null ||
    merged.averagePackage !== null ||
    merged.placementPercentage !== null;
  const hasRecruiters = Array.isArray(merged.recruiters) && merged.recruiters.length > 0;
  
  const mainSourceUrl = merged._bestSourceUrl || "";
  const mainSourceType = getSourceTypeFromPageType(null, mainSourceUrl);
  
  let overallConfidence = 0;
  if ((mainSourceType === "official_pdf" || mainSourceType === "official_placement_page") && hasHighQualityMetrics) {
    overallConfidence = 95;
  } else if (mainSourceType === "official_placement_page" && (hasRecruiters || merged.totalOffers !== null || merged.totalPlacedStudents !== null)) {
    overallConfidence = 80;
  } else if (hasHighQualityMetrics || hasRecruiters || merged.totalOffers !== null || merged.totalPlacedStudents !== null) {
    overallConfidence = 60;
  }

  const evidenceText = [...new Set(merged._allEvidence || [])].slice(0, 6).join(" | ");

  const defaultLineage = {
    highestPackage: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
    averagePackage: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
    medianPackage: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
    placementPercentage: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
    totalOffers: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
    totalPlacedStudents: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" },
    placementYear: { sourceUrl: "", sourceType: "", extractedAt: null, evidenceText: "" }
  };

  const finalLineage = merged.lineage ? { ...merged.lineage } : defaultLineage;

  for (const key of Object.keys(defaultLineage)) {
    if (!finalLineage[key]) {
      finalLineage[key] = { ...defaultLineage[key] };
    } else {
      finalLineage[key] = {
        sourceUrl: finalLineage[key].sourceUrl || "",
        sourceType: finalLineage[key].sourceType || "",
        extractedAt: finalLineage[key].extractedAt || null,
        evidenceText: finalLineage[key].evidenceText || ""
      };
    }
  }

  const resolvedSourceSummary = determineSourceSummary({ ...merged, lineage: finalLineage });

  return {
    highestPackage: merged.highestPackage ?? null,
    averagePackage: merged.averagePackage ?? null,
    medianPackage: merged.medianPackage ?? null,
    placementPercentage: merged.placementPercentage ?? null,
    totalOffers: merged.totalOffers ?? null,
    totalPlacedStudents: merged.totalPlacedStudents ?? null,
    recruiters: merged.recruiters || [],
    placementYear: merged.placementYear ?? null,
    placementYearEvidence: merged.placementYearEvidence || "",
    sourceType: mainSourceType,
    confidence: overallConfidence,
    sourceUrl: mainSourceUrl,
    evidenceText,
    extractedAt: new Date(),
    suspicious: false,
    reviewReason: "",
    reviewRequired: false,
    recruitersCount: Array.isArray(merged.recruiters) ? merged.recruiters.length : 0,
    sourceSummary: resolvedSourceSummary,
    lineage: finalLineage
  };
};

/**
 * Flag unrealistic placement figures for manual review.
 */
export const flagSuspiciousPlacements = (record) => {
  const reasons = [];
  const avg = record.averagePackage;
  const high = record.highestPackage;
  const pct = record.placementPercentage;

  if (avg !== null && high !== null && avg > high) {
    reasons.push("Average Package > Highest Package");
  }
  if (pct !== null && pct > 100) {
    reasons.push("Placement Percentage > 100");
  }
  if (high !== null && high > 75) {
    reasons.push(`Highest Package Outlier (>75 LPA): ${high} LPA`);
  }
  if (avg !== null && avg > 25) {
    reasons.push(`Average Package Outlier (>25 LPA): ${avg} LPA`);
  }

  if (reasons.length) {
    return {
      ...record,
      suspicious: true,
      reviewReason: reasons.join("; "),
      reviewRequired: true
    };
  }
  return {
    ...record,
    suspicious: false,
    reviewReason: "",
    reviewRequired: false
  };
};

// ---------------------------------------------------------------------------
// PDF Helper functions for Phase 2.5A
// ---------------------------------------------------------------------------
export const findPdfLinks = (html) => {
  if (!html) return [];
  const links = [];
  const regex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push({
      url: match[1].trim(),
      text: match[2].replace(/<[^>]+>/g, "").trim()
    });
  }
  return links;
};

export const isPlacementPdf = (pdfUrl, linkText) => {
  const urlLower = pdfUrl.toLowerCase();
  const textLower = linkText.toLowerCase();
  const pattern = /placement\s*brochure|placement\s*report|annual\s*report|placement\s*statistics|institute\s*brochure|institute\s*information/i;
  return pattern.test(urlLower) || pattern.test(textLower);
};

export const parsePdfBuffer = async (buffer) => {
  if (!buffer) return "";
  const textStr = buffer.toString("utf8");
  if (textStr.startsWith("MOCK_PDF:")) {
    return textStr.substring(9);
  }
  try {
    const uint8Array = new Uint8Array(buffer);
    const parser = new PDFParse(uint8Array);
    const result = await parser.getText();
    return result.text || "";
  } catch (error) {
    console.error("Error parsing PDF buffer, falling back to text:", error.message);
    return textStr;
  }
};
