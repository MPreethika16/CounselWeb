// server/services/qualityService.js

/**
 * Calculates scraped data quality for a single college across 5 key dimensions:
 *  1. contact      – phone/email present and confidence ≥ 50
 *  2. accreditation – NAAC grade present and confidence ≥ 50
 *  3. placements   – highestPackage > 0 and confidence ≥ 50
 *  4. facilities   – facilitiesCount ≥ 3
 *  5. freshness    – lastScrapedAt within 180 days
 *
 * Also accumulates missingCount, invalidCount, and staleCount.
 *
 * Quality levels:
 *   EXCELLENT  ≥ 80
 *   GOOD       ≥ 60
 *   FAIR       ≥ 40
 *   POOR        < 40
 */

const STALE_THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000; // 180 days
const CONFIDENCE_MIN = 50;
const TOTAL_DIMENSIONS = 6; // added academics

export function calculateQuality(college) {
  const od = college.officialData || {};
  const now = Date.now();

  let presentDimensions = 0;
  let missingCount = 0;
  let invalidCount = 0;
  let staleCount = 0;
  const breakdown = {};

  // ── 1. Contact ────────────────────────────────────────────────────────────
  const hasPhone = (od.contact?.phones?.length ?? 0) > 0;
  const hasEmail = (od.contact?.emails?.length ?? 0) > 0;
  const contactConf = od.contact?.confidence ?? 0;
  if (!hasPhone && !hasEmail) {
    missingCount++;
    breakdown.contact = "missing";
  } else if (contactConf < CONFIDENCE_MIN) {
    invalidCount++;
    breakdown.contact = "low_confidence";
  } else {
    presentDimensions++;
    breakdown.contact = "ok";
  }

  // ── 2. Accreditation ──────────────────────────────────────────────────────
  const naacGrade = od.accreditation?.naacGrade ?? "";
  const accredConf = od.accreditation?.confidence ?? 0;
  if (!naacGrade) {
    missingCount++;
    breakdown.accreditation = "missing";
  } else if (accredConf < CONFIDENCE_MIN) {
    invalidCount++;
    breakdown.accreditation = "low_confidence";
  } else {
    presentDimensions++;
    breakdown.accreditation = "ok";
  }

  // ── 3. Placements ─────────────────────────────────────────────────────────
  const highestPkg = od.placements?.highestPackage ?? 0;
  const placementConf = od.placements?.confidence ?? 0;
  if (!highestPkg || highestPkg <= 0) {
    missingCount++;
    breakdown.placements = "missing";
  } else if (placementConf < CONFIDENCE_MIN) {
    invalidCount++;
    breakdown.placements = "low_confidence";
  } else {
    presentDimensions++;
    breakdown.placements = "ok";
  }

  // ── 4. Facilities ─────────────────────────────────────────────────────────
  const facCount = od.facilitiesCount ?? 0;
  if (facCount <= 0) {
    missingCount++;
    breakdown.facilities = "missing";
  } else if (facCount < 3) {
    invalidCount++;
    breakdown.facilities = "insufficient";
  } else {
    presentDimensions++;
    breakdown.facilities = "ok";
  }

    // ── 6. Academics ─────────────────────────────────────────────────────────\n  const acad = od.academics || {};// may be undefined\n  if (!acad.programs?.length && !acad.departments?.length) {\n    missingCount++;\n    breakdown.academics = \"missing\";\n  } else if ((acad.confidence ?? 0) < CONFIDENCE_MIN) {\n    invalidCount++;\n    breakdown.academics = \"low_confidence\";\n  } else {\n    presentDimensions++;\n    breakdown.academics = \"ok\";\n  }
  const lastScraped = od.freshness?.lastScrapedAt
    ? new Date(od.freshness.lastScrapedAt).getTime()
    : null;
  if (!lastScraped) {
    missingCount++;
    breakdown.freshness = "missing";
  } else if (now - lastScraped > STALE_THRESHOLD_MS) {
    staleCount++;
    breakdown.freshness = "stale";
  } else {
    presentDimensions++;
    breakdown.freshness = "ok";
  }

  // ── Score & Level ─────────────────────────────────────────────────────────
  const qualityScore = Math.round((presentDimensions / TOTAL_DIMENSIONS) * 100);
  let qualityLevel;
  if (qualityScore >= 80) {
    qualityLevel = "EXCELLENT";
  } else if (qualityScore >= 60) {
    qualityLevel = "GOOD";
  } else if (qualityScore >= 40) {
    qualityLevel = "FAIR";
  } else {
    qualityLevel = "POOR";
  }

  return {
    collegeCode: college.collegeCode,
    collegeName: college.collegeName,
    qualityScore,
    qualityLevel,
    missingCount,
    invalidCount,
    staleCount,
    presentDimensions,
    totalDimensions: TOTAL_DIMENSIONS,
    breakdown
  };
}
