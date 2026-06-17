/** Clamp a number between min and max (replaces lodash.clamp) */
const clamp = (value, lower, upper) => Math.max(lower, Math.min(upper, value));

/** Helper to clamp a number to 0‑100 after rounding */
const normalize = (value) => clamp(Math.round(value), 0, 100);

/** Map NAAC grade to a 0‑100 score */
const naacGradeScore = (grade) => {
  const map = {
    "A++": 100,
    "A+": 95,
    "A": 90,
    "A-": 85,
    "B++": 80,
    "B+": 75,
    "B": 70,
    "B-": 65,
    "C++": 60,
    "C+": 55,
    "C": 50,
    "D": 40,
    "E": 30,
    "": 0,
    null: 0,
    undefined: 0,
  };
  return map[grade?.toUpperCase()] ?? 0;
};

/** Academic sub‑score (0‑100) */
export const computeAcademicScore = (college) => {
  const acc = college.officialData?.accreditation || {};
  const naac = normalize(naacGradeScore(acc.naacGrade));
  const nba = acc.nbaAccredited ? 15 : 0; // NBA adds up to 15 points
  const autonomy = acc.autonomous ? 10 : 0;
  const ugc = acc.ugcRecognized ? 10 : 0;
  const aicte = acc.aicteApproved ? 5 : 0;
  // max raw = 140
  const raw = naac + nba + autonomy + ugc + aicte;
  return normalize((raw / 140) * 100);
};

/** Infrastructure sub‑score (0‑100) */
export const computeInfrastructureScore = (college) => {
  const data = college.officialData || {};
  const coverage = normalize(data.facilityCoverageScore || 0);
  const quality = normalize(data.facilityQualityScore || 0);
  const gallery = normalize(data.gallery?.quality || 0);
  const raw = (coverage + quality + gallery) / 3;
  return normalize(raw);
};

/** Placement sub‑score (0‑100) */
export const computePlacementScore = (college) => {
  const placements = college.officialData?.placements || {};
  const highest = normalize(placements.highestPackage || 0);
  const average = normalize(placements.averagePackage || 0);
  const perc = normalize(placements.placementPercentage || 0);
  // Recruiter count – assume 100 recruiters = full score
  const recruiterScore = normalize((placements.recruiters?.length || 0) * 1);
  const sourceWeight = placements.sourceType === "official_pdf" ? 20 : 0;
  const raw = (highest + average + perc + recruiterScore + sourceWeight) / 5;
  return normalize(raw);
};

/** Base score before modifiers */
export const computeBaseScore = (college) => {
  const academic = computeAcademicScore(college);
  const infra = computeInfrastructureScore(college);
  const placement = computePlacementScore(college);
  // Weights: Academic 40%, Infrastructure 25%, Placement 35%
  return academic * 0.40 + infra * 0.25 + placement * 0.35;
};

/** Apply quality modifiers */
export const applyModifiers = (baseScore, college) => {
  // Trust modifier as multiplicative factor
  const trustScore = college.officialData?.trustScore?.score ?? 0;
  let trustModifier = 1.0;
  let trustModifierApplied = "0%";
  if (trustScore >= 90) {
    trustModifier = 1.05;
    trustModifierApplied = "+5%";
  } else if (trustScore >= 75) {
    trustModifier = 1.02;
    trustModifierApplied = "+2%";
  } else if (trustScore < 50) {
    trustModifier = 0.90;
    trustModifierApplied = "-10%";
  }

  // Completeness modifier as multiplicative factor
  const completenessScore = college.officialData?.profileCompleteness?.score ?? 0;
  let completenessModifier = 1.0;
  let completenessModifierApplied = "0%";
  if (completenessScore >= 90) {
    completenessModifier = 1.03;
    completenessModifierApplied = "+3%";
  } else if (completenessScore < 60) {
    completenessModifier = 0.95;
    completenessModifierApplied = "-5%";
  }

  // Website health penalty (subtractive)
  const healthStatus = college.officialWebsite?.health?.status ?? "healthy";
  let websitePenalty = 0;
  let websitePenaltyApplied = "0";
  if (healthStatus === "warning") {
    websitePenalty = 5;
    websitePenaltyApplied = "-5";
  } else if (healthStatus === "critical") {
    websitePenalty = 15;
    websitePenaltyApplied = "-15";
  }

  // Final calculation as per Phase 2.8A
  const finalScore = clamp(Math.round(baseScore * trustModifier * completenessModifier) - websitePenalty, 0, 100);

  // Explanation object contains contributions and applied modifiers
  const explanation = {
    academicContribution: computeAcademicScore(college),
    infrastructureContribution: computeInfrastructureScore(college),
    placementContribution: computePlacementScore(college),
    trustModifierApplied,
    completenessModifierApplied,
    websitePenaltyApplied,
  };

  return { finalScore, explanation };
};


/** Main ranking engine */
export const computeRanking = (college) => {
  const academicScore = computeAcademicScore(college);
  const infrastructureScore = computeInfrastructureScore(college);
  const placementScore = computePlacementScore(college);

  const base = computeBaseScore(college);
  const { finalScore, explanation } = applyModifiers(base, college);

  return {
    overallScore: finalScore,
    academicScore,
    infrastructureScore,
    placementScore,
    explanation,
    rankingVersion: "2.8A",
    calculatedAt: new Date(),
  };
};
