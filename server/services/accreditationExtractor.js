/**
 * Service to extract structured accreditation and recognition fields from crawled page text.
 * Phase 2.4A additions:
 *   - NBA_PROGRAM_MAP / normalizeNbaProgram() for program name normalization
 *   - nirfParticipated detection (participation without numeric rank)
 */

// ---------------------------------------------------------------------------
// Normalized value sets
// ---------------------------------------------------------------------------
export const NORMALIZED_NAAC_GRADES = ["A++", "A+", "A", "B++", "B+", "B"];
export const NORMALIZED_AFFILIATIONS = ["JNTUH", "JNTUK", "OU", "KU"];

// Allowed normalized NBA program abbreviations
export const NORMALIZED_NBA_PROGRAMS = [
  "CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "CHEM", "MCA", "MBA", "UG-ENG", "PG"
];

// ---------------------------------------------------------------------------
// NBA program normalization map
// Keys are lower-cased partial match patterns; values are normalized codes.
// Checked in declaration order — first match wins.
// ---------------------------------------------------------------------------
export const NBA_PROGRAM_MAP = [
  { patterns: [/computer\s*science\s*(?:and\s*)?engineering/i, /\bcse\b/i], code: "CSE" },
  { patterns: [/electronics\s*(?:&|and)\s*communication/i, /\bece\b/i], code: "ECE" },
  { patterns: [/electrical\s*(?:&|and)\s*electronics/i, /\beee\b/i], code: "EEE" },
  { patterns: [/mechanical\s*engineering/i, /\bmech\b/i, /\b(?:me)\b/i], code: "MECH" },
  { patterns: [/civil\s*engineering/i, /\bcivil\b/i, /\b(?:ce)\b/i], code: "CIVIL" },
  { patterns: [/information\s*technology/i, /\bit\b/i], code: "IT" },
  { patterns: [/chemical\s*engineering/i, /\bchem(?:ical)?\b/i], code: "CHEM" },
  { patterns: [/\bmca\b/i, /master\s*of\s*computer\s*applications/i], code: "MCA" },
  { patterns: [/\bmba\b/i, /master\s*of\s*business\s*administration/i], code: "MBA" },
  { patterns: [/ug\s*engineering/i, /under\s*graduate\s*engineering/i], code: "UG-ENG" },
  { patterns: [/pg\s*programs?/i, /post\s*graduate\s*programs?/i], code: "PG" }
];

/**
 * Normalize a raw NBA program name to its standard abbreviation.
 * @param {string} raw  Raw program name from page text.
 * @returns {string|null}  Normalized code, or null if unrecognized.
 */
export const normalizeNbaProgram = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  for (const entry of NBA_PROGRAM_MAP) {
    for (const pattern of entry.patterns) {
      if (pattern.test(trimmed)) {
        return entry.code;
      }
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------
export const extractAccreditationFromText = (text) => {
  const result = {
    naacGrade: "",
    naacCycle: null,
    nbaAccredited: false,
    nbaPrograms: [],   // normalized abbreviations only
    autonomous: false,
    affiliation: "",
    ugcRecognized: false,
    aicteApproved: false,
    nirfRank: null,
    nirfParticipated: false,
    evidenceLines: []
  };

  if (!text) return result;

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const addEvidence = (line) => {
    if (!result.evidenceLines.includes(line)) {
      result.evidenceLines.push(line);
    }
  };

  // Helper: push a normalized program code (dedup)
  const addProgram = (raw) => {
    const code = normalizeNbaProgram(raw);
    if (code && !result.nbaPrograms.includes(code)) {
      result.nbaPrograms.push(code);
    } else if (!code && !result.nbaPrograms.includes(raw.trim())) {
      // fallback: keep raw if normalization fails (will be flagged in verification)
      result.nbaPrograms.push(raw.trim());
    }
  };

  // -------------------------------------------------------------------------
  // 1. NAAC Grade & Cycle
  // -------------------------------------------------------------------------
  const naacGradeRegexes = [
    /Accredited\s+by\s+(?:National\s+Assessment\s+and\s+Accreditation\s+Council\s*\(NAAC\)|NAAC)\s+(?:with\s+)?Grade\s*['""]?([AB]\+?\+?)['""]?/i,
    /Accredited\s+with\s+Grade\s*['""]?([AB]\+?\+?)['""]?\s*by\s*NAAC/i,
    /Accredited\s+by\s*NAAC\s*(?:with\s+Grade\s+)?['""]?([AB]\+?\+?)['""]?/i,
    /NAAC\s+(?:with\s+)?Grade\s*['""]?([AB]\+?\+?)['""]?/i,
    /Grade\s*['""]?([AB]\+?\+?)['""]?\s*(?:by|from)?\s*NAAC/i,
    /Accredited\s+with\s+['""]?([AB]\+?\+?)['""]?\s+Grade/i,
    /NAAC\s+['""]?([AB]\+?\+?)['""]?\s+Grade/i
  ];

  const naacCycleRegexes = [
    /(?:cycle\s*(?:-|\b)?\s*(\d+))/i,
    /(\d+)(?:st|nd|rd|th)\s+cycle/i,
    /cycle\s*(\d+)/i
  ];

  for (const line of lines) {
    // NAAC Grade
    for (const regex of naacGradeRegexes) {
      const match = line.match(regex);
      if (match) {
        const grade = match[1].toUpperCase().replace(/['"]/g, "");
        if (NORMALIZED_NAAC_GRADES.includes(grade)) {
          result.naacGrade = grade;
          addEvidence(line);
          break;
        }
      }
    }

    // NAAC Cycle
    for (const regex of naacCycleRegexes) {
      const match = line.match(regex);
      if (match && /NAAC/i.test(line)) {
        result.naacCycle = parseInt(match[1] || match[2], 10);
        addEvidence(line);
        break;
      }
    }

    // -------------------------------------------------------------------------
    // 2. NBA Accreditation
    // -------------------------------------------------------------------------
    const isNbaLine = (
      /Accredited\s+by\s+National\s+Board\s+of\s+Accreditation/i.test(line) ||
      /Accredited\s+by\s+NBA/i.test(line) ||
      /\bNBA\b\s+Accredit/i.test(line) ||
      /Accredited\s+by\s+National\s+Board\s+of\s+Accreditation\s*\(NBA\)/i.test(line) ||
      (/National\s+Board\s+of\s+Accreditation/i.test(line) && /Accredited/i.test(line))
    );

    if (isNbaLine) {
      result.nbaAccredited = true;
      addEvidence(line);

      // Try to extract program names from the same line
      const rawCandidates = [
        "Computer Science Engineering", "Electronics & Communication Engineering",
        "Electrical & Electronics Engineering", "Mechanical Engineering",
        "Civil Engineering", "Information Technology", "Chemical Engineering",
        "MCA", "MBA", "UG Engineering", "PG Programs",
        "CSE", "ECE", "EEE", "ME", "CE", "CIVIL", "MECH", "IT", "CHEM"
      ];
      rawCandidates.forEach(raw => {
        const re = new RegExp(`\\b${raw.replace(/[&()+]/g, "\\$&")}\\b`, "i");
        if (re.test(line)) {
          addProgram(raw);
        }
      });
    }

    // -------------------------------------------------------------------------
    // 3. Autonomous Status
    // -------------------------------------------------------------------------
    if (/\bAutonomous\b/i.test(line)) {
      result.autonomous = true;
      addEvidence(line);
    }

    // -------------------------------------------------------------------------
    // 4. Affiliation
    // -------------------------------------------------------------------------
    let affMatch = false;
    if (/Osmania\s+University/i.test(line) || /\bOU\b/.test(line)) {
      result.affiliation = "OU";
      affMatch = true;
    } else if (
      /Jawaharlal\s+Nehru\s+Technological\s+University\s+Hyderabad/i.test(line) ||
      /\bJNTUH\b/i.test(line) ||
      /JNTU\s+Hyderabad/i.test(line)
    ) {
      result.affiliation = "JNTUH";
      affMatch = true;
    } else if (
      /Jawaharlal\s+Nehru\s+Technological\s+University\s+Kakinada/i.test(line) ||
      /\bJNTUK\b/i.test(line) ||
      /JNTU\s+Kakinada/i.test(line)
    ) {
      result.affiliation = "JNTUK";
      affMatch = true;
    } else if (/Kakatiya\s+University/i.test(line) || /\bKU\b/.test(line)) {
      result.affiliation = "KU";
      affMatch = true;
    }
    if (affMatch) {
      addEvidence(line);
    }

    // -------------------------------------------------------------------------
    // 5. UGC Recognition
    // -------------------------------------------------------------------------
    if (
      /\bUGC\b/i.test(line) ||
      /University\s+Grants\s+Commission/i.test(line) ||
      /2\(f\)/i.test(line) ||
      /12\(B\)/i.test(line) ||
      /12B/i.test(line)
    ) {
      result.ugcRecognized = true;
      addEvidence(line);
    }

    // -------------------------------------------------------------------------
    // 6. AICTE Approval
    // -------------------------------------------------------------------------
    if (
      /\bAICTE\b/i.test(line) ||
      /All\s+India\s+Council\s+for\s+Technical\s+Education/i.test(line)
    ) {
      result.aicteApproved = true;
      addEvidence(line);
    }

    // -------------------------------------------------------------------------
    // 7. NIRF Rank + Participation
    // -------------------------------------------------------------------------
    const nirfRankRegexes = [
      /NIRF\s*(?:Rank|Ranking)?\s*[:#-]?\s*(\d+)\b/i,
      /Ranked\s*(\d+)\s*(?:in|by)?\s*NIRF/i,
      /NIRF\s*-\s*(\d+)\b/i
    ];

    for (const regex of nirfRankRegexes) {
      const match = line.match(regex);
      if (match) {
        result.nirfRank = parseInt(match[1], 10);
        result.nirfParticipated = true;   // has a rank → definitely participated
        addEvidence(line);
        break;
      }
    }

    // Participation without a rank
    if (
      !result.nirfParticipated &&
      /\bNIRF\b/i.test(line) &&
      (
        /participat/i.test(line) ||
        /submitted\s+(?:for|to)\s+NIRF/i.test(line) ||
        /NIRF\s+(?:participant|applicant|institution)/i.test(line) ||
        /NIRF\s+(?:ranking|framework)/i.test(line)
      )
    ) {
      result.nirfParticipated = true;
      addEvidence(line);
    }
  }

  return result;
};
