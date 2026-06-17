import CollegeMaster from "../models/CollegeMaster.js";
import { scoreCollege } from "./recommendationScoringService.js";

/**
 * Service to aggregate and compare up to 5 colleges side by side.
 */
export async function compareColleges(collegeCodes) {
  if (!Array.isArray(collegeCodes) || collegeCodes.length === 0) {
    return [];
  }
  
  // Limit to 5
  const codes = collegeCodes.slice(0, 5);

  const colleges = await CollegeMaster.find({ collegeCode: { $in: codes } }).lean();

  const comparison = colleges.map(c => {
    const scored = scoreCollege(c);
    const data = c.officialData || {};

    // Compute fee range
    const fees = data.fees || [];
    const tuitionFees = fees.map(f => f.tuitionFee).filter(Boolean);
    const minFee = tuitionFees.length ? Math.min(...tuitionFees) : null;
    const maxFee = tuitionFees.length ? Math.max(...tuitionFees) : null;

    return {
      collegeCode: c.collegeCode,
      name: c.name,
      state: c.state || "Unknown",
      overallScore: scored.overallScore,
      placementScore: scored.subscores.placementScore,
      affordabilityScore: scored.subscores.affordabilityScore,
      rankingScore: scored.subscores.rankingScore,
      accreditationScore: scored.subscores.accreditationScore,
      highestPackage: data.placements?.highestPackage || null,
      placementPercentage: data.placements?.placementPercentage || null,
      feeRange: minFee ? `${minFee} - ${maxFee}` : "Unknown",
      nirfRank: data.accreditation?.nirfRank || "Not Ranked",
      naacGrade: data.accreditation?.naacGrade || "Unaccredited",
      nbaAccredited: data.accreditation?.nbaAccredited || false,
      managementQuota: data.admissions?.managementQuotaAvailable || false,
      recommendationReasons: scored.recommendationReasons
    };
  });

  return comparison;
}
