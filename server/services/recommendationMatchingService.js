import College from '../models/CollegeMaster.js';
import { normalizeWeights, applyFactor } from '../utils/scoreUtils.js';
import { generateExplanation } from './recommendationExplanationService.js';

/**
 * Compute effective weights based on the student's normalized weights and the
 * availability flags present in a college's recommendationFactors.
 * Returns a map where each weight key maps to an effective weight expressed as
 * a percentage (0-100). Only factors whose `dataAvailable` flag is true are
 * considered; the remaining weights are redistributed proportionally.
 */
export function computeEffectiveWeights(normalized, factors) {
  const weightDefs = [
    { key: 'academicsWeight', flag: null },
    { key: 'placementsWeight', flag: null },
    { key: 'infrastructureWeight', flag: null },
    { key: 'trustWeight', flag: null },
    { key: 'affordabilityWeight', flag: 'affordabilityDataAvailable' },
    { key: 'locationWeight', flag: 'locationDataAvailable' },
  ];

  const usable = weightDefs.filter(w => {
    const wgt = normalized[w.key];
    if (!wgt || wgt <= 0) return false;
    if (w.flag && !factors[w.flag]) return false;
    return true;
  });

  const total = usable.reduce((sum, w) => sum + normalized[w.key], 0);
  const effective = {};
  if (total === 0) return effective;

  usable.forEach(w => {
    effective[w.key] = (normalized[w.key] / total) * 100;
  });

  return effective;
}

/**
 * Match student preferences against all colleges.
 * @param {Object} payload - Weight object using the new keys:
 *   academicsWeight, placementsWeight, infrastructureWeight, trustWeight,
 *   affordabilityWeight (optional), locationWeight (optional)
 * @returns {Promise<Array>} Sorted list of match objects.
 */
export async function matchStudentPreferences(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload');
  }

  const normalized = normalizeWeights(payload);

  // Retrieve colleges along with all fields required for both matching and explanation
  const colleges = await College.find(
    {},
    {
      collegeCode: 1,
      collegeName: 1,
      officialWebsite: 1,
      "officialData.recommendationFactors": 1,
      "officialData.trustScore": 1,
      "officialData.profileCompleteness": 1,
      "officialData.reviewStatus": 1,
      "officialData.placements": 1,
      "officialData.accreditation": 1,
      "officialData.ranking": 1,
    }
  ).lean();

  const results = colleges.map(col => {
    const officialData = col.officialData || {};
    const factors = officialData.recommendationFactors || {};
    const effectiveWeights = computeEffectiveWeights(normalized, factors);
    const breakdown = {};
    let matchScore = 0;

    const addContribution = (weightKey, factorKey) => {
      const weight = effectiveWeights[weightKey];
      if (weight && weight > 0) {
        const raw = Number(factors[factorKey] ?? 0);
        const contribution = applyFactor(raw, weight / 100);
        breakdown[factorKey] = Number(contribution.toFixed(2));
        matchScore += contribution;
      }
    };

    addContribution('academicsWeight', 'academicStrength');
    addContribution('placementsWeight', 'placementStrength');
    addContribution('infrastructureWeight', 'infrastructureStrength');
    addContribution('trustWeight', 'trustStrength');
    addContribution('affordabilityWeight', 'affordabilityStrength');
    addContribution('locationWeight', 'locationStrength');

    if (matchScore > 100) matchScore = 100;

    const finalMatchScore = Number(matchScore.toFixed(2));
    const explanation = generateExplanation(col, finalMatchScore, breakdown);

    const result = {
      collegeCode: col.collegeCode,
      collegeName: col.collegeName,
      matchScore: finalMatchScore,
      factorBreakdown: breakdown,
      effectiveWeights,
      explanation,
      rankingScore: officialData.ranking?.overallScore ?? null,
      trustScore: officialData.trustScore?.score ?? null,
    };

    // Add warning if rankingScore is unavailable
    if (result.rankingScore === null) {
      result.explanation.warnings.push("ranking_unavailable");
    }

    return result;
  });

  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if ((b.rankingScore ?? 0) !== (a.rankingScore ?? 0))
      return (b.rankingScore ?? 0) - (a.rankingScore ?? 0);
    return a.collegeCode - b.collegeCode;
  });

  return results;
}

