// recommendationExplanationService.js
// Core explanation engine for college recommendations.
// Generates strengths, weaknesses, weaknessReasons, reasons, warnings, summary, version, generatedAt, confidenceScore.

/**
 * Generates user-friendly natural language explanations, strengths, weaknesses,
 * weaknessReasons, reasons, warnings, summary, version, generatedAt, confidenceScore.
 * @param {Object} college - the college document (lean)
 * @param {number} matchScore - the computed matchScore for this college
 * @param {Object} breakdown - contribution breakdown of factors (optional)
 * @returns {Object} explanation object containing all fields.
 */
export function generateExplanation(college, matchScore, breakdown = {}) {
  const strengths = [];
  const weaknesses = [];
  const weaknessReasons = [];
  const reasonCandidates = [];
  const warnings = [];

  const officialData = college.officialData || {};
  const factors = officialData.recommendationFactors || {};
  const trustScoreObj = officialData.trustScore || {};
  const profileCompleteness = officialData.profileCompleteness || {};
  const reviewStatus = officialData.reviewStatus || {};
  const placements = officialData.placements || {};
  const accreditation = officialData.accreditation || {};
  const officialWebsite = college.officialWebsite || {};

  // Strengths & reasons
  if (factors.academicStrength >= 75) {
    strengths.push("academics");
    reasonCandidates.push({
      text: "Strong academic profile supported by accreditation and rankings.",
      contribution: breakdown.academicStrength || 0,
      factor: "academicStrength"
    });
  }
  if (factors.placementStrength >= 75) {
    strengths.push("placements");
    reasonCandidates.push({
      text: "Strong placement performance with above-average recruiter coverage.",
      contribution: breakdown.placementStrength || 0,
      factor: "placementStrength"
    });
  }
  if (factors.infrastructureStrength >= 75) {
    strengths.push("infrastructure");
    reasonCandidates.push({
      text: "Modern campus infrastructure with comprehensive facility coverage.",
      contribution: breakdown.infrastructureStrength || 0,
      factor: "infraStructureStrength"
    });
  }
  if (factors.trustStrength >= 75) {
    strengths.push("trust");
    reasonCandidates.push({
      text: "High trust score based on verified institutional data.",
      contribution: breakdown.trustStrength || 0,
      factor: "trustStrength"
    });
  }

  // Sort reasons: contribution desc, then factor name asc for determinism
  reasonCandidates.sort((a, b) => {
    if (b.contribution !== a.contribution) return b.contribution - a.contribution;
    return a.factor.localeCompare(b.factor);
  });
  const reasons = reasonCandidates.map(c => c.text);

  // Weaknesses & reasons
  const weaknessMap = {
    academics: "Academic indicators are currently below the platform average.",
    placements: "Placement information is limited or below expected benchmarks.",
    infrastructure: "Infrastructure coverage and facility quality appear limited.",
    trust: "Available institutional data requires further verification."
  };
  if (factors.academicStrength !== undefined && factors.academicStrength < 50) {
    weaknesses.push("academics");
    weaknessReasons.push(weaknessMap.academics);
  }
  if (factors.placementStrength !== undefined && factors.placementStrength < 50) {
    weaknesses.push("placements");
    weaknessReasons.push(weaknessMap.placements);
  }
  if (factors.infrastructureStrength !== undefined && factors.infrastructureStrength < 50) {
    weaknesses.push("infrastructure");
    weaknessReasons.push(weaknessMap.infrastructure);
  }
  if (factors.trustStrength !== undefined && factors.trustStrength < 50) {
    weaknesses.push("trust");
    weaknessReasons.push(weaknessMap.trust);
  }
  if (factors.affordabilityDataAvailable && factors.affordabilityStrength !== undefined && factors.affordabilityStrength < 50) {
    weaknesses.push("affordability");
    // No specific reason defined for affordability in spec.
  }
  if (factors.locationDataAvailable && factors.locationStrength !== undefined && factors.locationStrength < 50) {
    weaknesses.push("location");
    // No specific reason defined for location in spec.
  }

  // Warnings propagation (existing logic)
  const reviewFlags = trustScoreObj.reviewFlags || [];
  const reviewReasons = reviewStatus.reviewReasons || [];
  const improvementFlags = reviewStatus.improvementFlags || [];

  const addWarningIf = (cond, flag) => { if (cond) warnings.push(flag); };

  addWarningIf(
    reviewFlags.includes("placement_outlier") ||
    reviewReasons.includes("placement_outlier") ||
    placements.suspicious === true ||
    placements.reviewRequired === true,
    "placement_outlier"
  );
  addWarningIf(
    reviewFlags.includes("website_unhealthy") ||
    reviewReasons.includes("website_unhealthy") ||
    officialWebsite.healthStatus === "critical" ||
    officialWebsite.health?.healthy === false ||
    officialWebsite.health?.status === "critical",
    "website_unhealthy"
  );
  addWarningIf(
    reviewFlags.includes("affiliation_conflict") ||
    reviewReasons.includes("affiliation_conflict") ||
    accreditation.reviewRequired === true,
    "affiliation_conflict"
  );

  // Additional supported warnings (optional)
  const additionalSupported = [
    "data_stale",
    "gallery_quality_low",
    "contact_quality_low",
    "facilities_quality_low",
    "accreditation_quality_low",
    "placement_quality_low",
    "incomplete_profile",
    "placement_outlier",
    "affiliation_conflict"
  ];
  additionalSupported.forEach(flag => {
    if (reviewFlags.includes(flag) || reviewReasons.includes(flag) || improvementFlags.includes(flag)) {
      warnings.push(flag);
    }
  });

  // Summary based on matchScore
  let summary = "";
  if (matchScore >= 75) summary = "Strong overall match driven primarily by academics and trust indicators.";
  else if (matchScore >= 50) summary = "Moderate match with several strengths but some areas requiring consideration.";
  else summary = "Limited match due to weak performance across multiple recommendation factors.";

  // Metadata
  // Updated metadata and confidence score handling
  const version = "2.11A";
  const generatedAt = new Date().toISOString();
  const trust = trustScoreObj.score ?? 0;
  const profile = profileCompleteness.score ?? 0;
  // Base confidence from trust and profile completeness
  let confidenceScore = (trust * 0.5) + (profile * 0.5);
  // Reduce confidence if ranking data is missing
  if (officialData.ranking?.overallScore == null) {
    confidenceScore *= 0.8; // penalize 20%
    warnings.push('ranking_unavailable');
  }
  // Reduce confidence if trust score is missing
  if (trustScoreObj.score == null) {
    confidenceScore *= 0.9; // penalize 10%
  }
  // Determine if core recommendation factors are present
  const coreFactors = ["academicStrength", "placementStrength", "infrastructureStrength", "trustStrength"];
  const hasCoreFactors = coreFactors.some(f => factors[f] !== undefined && factors[f] !== null);
  if (!hasCoreFactors) {
    // Insufficient data handling
    warnings.push("insufficient_data");
    if (!summary) summary = "Insufficient data to generate a detailed recommendation.";
    // Clamp confidence to a low value (<=25)
    confidenceScore = Math.min(confidenceScore, 25);
  }
  // Clamp final confidence score between 0 and 100
  confidenceScore = Math.max(0, Math.min(100, confidenceScore));

  // Deduplicate and sort strengths deterministically
  const dedupedStrengths = Array.from(new Set(strengths)).sort();
  const dedupedWeaknesses = Array.from(new Set(weaknesses));
  const dedupedWeaknessReasons = Array.from(new Set(weaknessReasons));
  const dedupedReasons = Array.from(new Set(reasons));
  const dedupedWarnings = Array.from(new Set(warnings));

  // Return explanation object
  return {
    matchScore,
    strengths: dedupedStrengths,
    weaknesses: dedupedWeaknesses,
    weaknessReasons: dedupedWeaknessReasons,
    reasons: dedupedReasons,
    warnings: dedupedWarnings,
    summary,
    version,
    generatedAt,
    confidenceScore: Number(confidenceScore.toFixed(2))
  };
}
