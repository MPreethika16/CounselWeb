/**
 * Service to compute the recommendation score for a single college.
 */

const WEIGHTS = {
  placements: 0.25,
  rankings: 0.20,
  accreditation: 0.15,
  affordability: 0.20,
  academics: 0.15,
  admissions: 0.05
};

export function scoreCollege(college) {
  const data = college.officialData || {};
  const reasons = [];

  let placementScore = 0;
  let rankingScore = 0;
  let accreditationScore = 0;
  let affordabilityScore = 0;
  let academicsScore = 0;
  let admissionScore = 0;

  let availableWeights = 0;
  let weightedScore = 0;

  // 1. Placements (Max 100)
  const plac = data.placements || {};
  let hasPlacData = false;
  if (plac.placementPercentage) {
    placementScore += Math.min(plac.placementPercentage, 100) * 0.5; // 50 pts max
    hasPlacData = true;
  }
  if (plac.highestPackage) {
    // 50LPA = 50 pts, capping at 50 pts
    placementScore += Math.min((plac.highestPackage / 100000) * 2, 50); // Divide by 100,000 (1 Lakh)
    hasPlacData = true;
  }
  if (hasPlacData) {
    availableWeights += WEIGHTS.placements;
    weightedScore += placementScore * WEIGHTS.placements;
    if (placementScore > 80) reasons.push("Excellent placement record and highest packages.");
    else if (placementScore > 50) reasons.push("Good placement opportunities.");
  }

  // 2. Rankings (Max 100)
  const ranks = data.rankings || [];
  let nirfRank = null;
  let hasRankData = false;
  for (const r of ranks) {
    if (r.agency === "NIRF" && (!nirfRank || r.rank < nirfRank)) {
      nirfRank = r.rank;
    }
  }
  if (nirfRank) {
    // Top 1 = 100 pts, Top 100 = 50 pts, Top 200 = 0 pts. Linear scale.
    rankingScore = Math.max(100 - (nirfRank * 0.5), 0);
    hasRankData = true;
  } else if (ranks.length > 0) {
    rankingScore = 40; // Base score for having other rankings
    hasRankData = true;
  }
  if (hasRankData) {
    availableWeights += WEIGHTS.rankings;
    weightedScore += rankingScore * WEIGHTS.rankings;
    if (nirfRank && nirfRank <= 50) reasons.push(`Top 50 NIRF Ranking (${nirfRank}).`);
  }

  // 3. Accreditation (Max 100)
  const acc = data.accreditation || {};
  let hasAccData = false;
  const naacWeights = { "A++": 100, "A+": 85, "A": 70, "B++": 55, "B+": 40, "B": 25, "C": 10 };
  if (acc.naacGrade && naacWeights[acc.naacGrade]) {
    accreditationScore += naacWeights[acc.naacGrade] * 0.7; // 70 pts
    hasAccData = true;
  }
  if (acc.nbaAccredited) {
    accreditationScore += 30; // 30 pts
    hasAccData = true;
  }
  if (hasAccData) {
    availableWeights += WEIGHTS.accreditation;
    weightedScore += accreditationScore * WEIGHTS.accreditation;
    if (acc.naacGrade === "A++") reasons.push("Highest NAAC A++ Accreditation.");
  }

  // 4. Affordability (Max 100)
  const fees = data.fees || [];
  let avgFee = 0;
  let feeCount = 0;
  for (const f of fees) {
    if (f.tuitionFee) {
      avgFee += f.tuitionFee;
      feeCount++;
    }
  }
  if (feeCount > 0) {
    avgFee /= feeCount;
    // Lower fee is better. Assume 5 Lakh is expensive (0 pts), 50k is cheap (100 pts)
    const feeInLakhs = avgFee / 100000;
    affordabilityScore = Math.max(100 - (feeInLakhs * 20), 0);
    availableWeights += WEIGHTS.affordability;
    weightedScore += affordabilityScore * WEIGHTS.affordability;
    if (affordabilityScore > 80) reasons.push("Highly affordable tuition fees.");
  }

  // 5. Academics (Max 100)
  const acad = data.academics || {};
  let courseCount = (acad.ugCourses ? acad.ugCourses.length : 0) + (acad.pgCourses ? acad.pgCourses.length : 0);
  if (courseCount > 0) {
    academicsScore = Math.min(courseCount * 5, 100);
    availableWeights += WEIGHTS.academics;
    weightedScore += academicsScore * WEIGHTS.academics;
    if (courseCount > 15) reasons.push("Wide variety of course offerings.");
  }

  // 6. Admissions (Max 100)
  const adm = data.admissions || {};
  let hasAdmData = false;
  if (adm.entranceExams && adm.entranceExams.length > 0) {
    admissionScore += Math.min(adm.entranceExams.length * 20, 50);
    hasAdmData = true;
  }
  if (adm.managementQuotaAvailable) {
    admissionScore += 25;
    hasAdmData = true;
  }
  if (adm.eligibilityCriteria && adm.eligibilityCriteria.length > 0) {
    admissionScore += 25;
    hasAdmData = true;
  }
  if (hasAdmData) {
    availableWeights += WEIGHTS.admissions;
    weightedScore += admissionScore * WEIGHTS.admissions;
  }

  // Calculate Overall Score based on known categories only
  let overallScore = 0;
  if (availableWeights > 0) {
    overallScore = Math.round(weightedScore / availableWeights);
  }

  const missingData = [];
  if (!hasPlacData) missingData.push("placements");
  if (!hasRankData) missingData.push("rankings");
  if (!hasAccData) missingData.push("accreditation");
  if (feeCount === 0) missingData.push("fees");
  if (courseCount === 0) missingData.push("academics");
  if (!hasAdmData) missingData.push("admissions");

  return {
    collegeCode: college.collegeCode,
    overallScore,
    subscores: {
      placementScore: hasPlacData ? Math.round(placementScore) : null,
      rankingScore: hasRankData ? Math.round(rankingScore) : null,
      accreditationScore: hasAccData ? Math.round(accreditationScore) : null,
      affordabilityScore: feeCount > 0 ? Math.round(affordabilityScore) : null,
      academicsScore: courseCount > 0 ? Math.round(academicsScore) : null,
      admissionScore: hasAdmData ? Math.round(admissionScore) : null
    },
    recommendationReasons: reasons.length > 0 ? reasons : ["Solid overall academic foundation."],
    confidence: acc.confidence || 50, // Base confidence metric
    missingData
  };
}
