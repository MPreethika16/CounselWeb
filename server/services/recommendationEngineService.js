import {
  computeAcademicScore,
  computePlacementScore,
  computeInfrastructureScore,
} from "./rankingEngineService.js";

/**
 * Recommendation Engine Service — Phase 2.9 + 2.9A
 *
 * Computes normalized recommendation factors for a college.
 * These factors power the student-preference matching engine.
 *
 * Hardening (2.9A):
 * - affordabilityStrength is null (no fee data available)
 * - locationStrength is null (no geocoding data available)
 * - Both carry explicit availability flags
 */

/**
 * Normalize a 0-100 score to a 0-100 strength value.
 * Handles edge cases (null, undefined, NaN).
 */
const normalizeStrength = (value) => {
  if (value == null || isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

/**
 * Compute trust strength from trust score breakdown.
 * Uses the composite trust score directly (already 0-100).
 */
const computeTrustStrength = (college) => {
  const trustScore = college.officialData?.trustScore?.score ?? 0;
  return normalizeStrength(trustScore);
};

/**
 * Extract location metadata from available fields.
 * Does NOT fabricate a location score — returns metadata only.
 */
const extractLocationMetadata = (college) => {
  const address = college.officialData?.address || {};
  return {
    city: address.city || college.location || "",
    state: address.state || "",
    district: address.district || college.district || "",
    geoAvailable: false, // No geocoding data currently available
  };
};

/**
 * Compute all recommendation factors for a single college.
 *
 * Returns the recommendation factors object with:
 * - academicStrength: normalized academic score (0-100)
 * - placementStrength: normalized placement score (0-100)
 * - infrastructureStrength: normalized infrastructure score (0-100)
 * - trustStrength: normalized trust score (0-100)
 * - affordabilityStrength: null (no fee data)
 * - locationStrength: null (no geo data)
 * - affordabilityDataAvailable: false
 * - locationDataAvailable: false
 * - locationMetadata: { city, state, district, geoAvailable }
 * - calculatedAt: Date
 * - version: "2.9A"
 */
export const computeRecommendationFactors = (college) => {
  const academicStrength = normalizeStrength(computeAcademicScore(college));
  const placementStrength = normalizeStrength(computePlacementScore(college));
  const infrastructureStrength = normalizeStrength(computeInfrastructureScore(college));
  const trustStrength = computeTrustStrength(college);
  const locationMetadata = extractLocationMetadata(college);

  return {
    // Real computed factors
    academicStrength,
    placementStrength,
    infrastructureStrength,
    trustStrength,

    // Unavailable factors (Phase 2.9A hardening — no fake data)
    affordabilityStrength: null,
    locationStrength: null,

    // Availability flags
    affordabilityDataAvailable: false,
    locationDataAvailable: false,

    // Metadata
    locationMetadata,
    calculatedAt: new Date(),
    version: "2.9A",
  };
};

/**
 * Compute recommendation readiness summary.
 * Reports which factors are available and which are missing.
 */
export const computeReadinessSummary = (factors) => {
  const available = [];
  const unavailable = [];

  if (factors.academicStrength != null) available.push("academic");
  else unavailable.push("academic");

  if (factors.placementStrength != null) available.push("placement");
  else unavailable.push("placement");

  if (factors.infrastructureStrength != null) available.push("infrastructure");
  else unavailable.push("infrastructure");

  if (factors.trustStrength != null) available.push("trust");
  else unavailable.push("trust");

  if (factors.affordabilityDataAvailable) available.push("affordability");
  else unavailable.push("affordability");

  if (factors.locationDataAvailable) available.push("location");
  else unavailable.push("location");

  return {
    totalFactors: 6,
    availableCount: available.length,
    unavailableCount: unavailable.length,
    available,
    unavailable,
    readinessPercent: Math.round((available.length / 6) * 100),
  };
};
