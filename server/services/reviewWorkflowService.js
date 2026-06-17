/**
 * Phase 2.7B Hardening — Admin review workflow: queue priority, review reasons,
 * trust deficiencies, and non-blocking improvement flags.
 */

const preserveAdminMeta = (college, result) => ({
  ...result,
  reviewedBy: college.officialData?.reviewStatus?.reviewedBy || "",
  reviewedAt: college.officialData?.reviewStatus?.reviewedAt || null,
  notes: college.officialData?.reviewStatus?.notes || "",
});

/**
 * Helper to classify website health status.
 *
 * healthy: healthy === true
 * warning: healthy === false, and temporary error (TIMEOUT, etc.)
 * critical: healthy === false, and SSL invalid, domain expired, repeated failures, or stale > 30 days
 */
export const classifyWebsiteHealth = (health) => {
  if (!health || health.healthy === true) {
    return "healthy";
  }

  const isHttps = health.finalUrl ? health.finalUrl.startsWith("https:") : false;
  
  // 1. SSL invalid
  const isSslInvalid = health.sslValid === false || (isHttps && health.sslValid !== true);
  
  // 2. Explicit critical error codes
  const criticalErrors = ["CERT_HAS_EXPIRED", "DOMAIN_EXPIRED", "REPEATED_FAILURES", "INVALID_URL"];
  const isCriticalError = criticalErrors.includes(health.error);
  
  // 3. Unreachable for more than 30 days
  const isStaleFailure = health.lastCheckedAt && 
    (new Date() - new Date(health.lastCheckedAt)) > 30 * 24 * 60 * 60 * 1000;

  if (isSslInvalid || isCriticalError || isStaleFailure) {
    return "critical";
  }

  // Default for other unhealthy cases (temporary crawl failure, timeout, recent DNS failure)
  return "warning";
};

/**
 * Determine review status, queue priority, review reasons, trust deficiencies, and improvement flags.
 */
export const determineReviewStatus = (college) => {
  const currentStatus = college.officialData?.reviewStatus?.status;
  const trust = college.officialData?.trustScore || {};
  const completeness = college.officialData?.profileCompleteness || {};
  const accreditation = college.officialData?.accreditation || {};
  const placements = college.officialData?.placements || {};
  const health = college.officialWebsite?.health || {};

  // Website health status classification
  const healthStatus = classifyWebsiteHealth(health);

  // Trust deficiencies list using machine-readable identifiers
  const trustDeficiencies = [];
  const breakdown = trust.breakdown || {};
  if (typeof breakdown.galleryQuality === "number" && breakdown.galleryQuality < 10) {
    trustDeficiencies.push("gallery_quality_low");
  }
  if (typeof breakdown.contactQuality === "number" && breakdown.contactQuality < 10) {
    trustDeficiencies.push("contact_quality_low");
  }
  if (typeof breakdown.facilitiesQuality === "number" && breakdown.facilitiesQuality < 10) {
    trustDeficiencies.push("facilities_quality_low");
  }
  if (typeof breakdown.accreditationQuality === "number" && breakdown.accreditationQuality < 15) {
    trustDeficiencies.push("accreditation_quality_low");
  }
  if (typeof breakdown.placementQuality === "number" && breakdown.placementQuality < 15) {
    trustDeficiencies.push("placement_quality_low");
  }
  if (typeof breakdown.dataFreshness === "number" && breakdown.dataFreshness < 10) {
    trustDeficiencies.push("data_stale");
  }

  if (currentStatus === "approved") {
    return preserveAdminMeta(college, {
      status: "approved",
      reviewQueuePriority: "none",
      reviewReasons: [],
      improvementFlags: [],
      trustDeficiencies,
    });
  }

  if (currentStatus === "rejected") {
    return preserveAdminMeta(college, {
      status: "rejected",
      reviewQueuePriority: "none",
      reviewReasons: [],
      improvementFlags: [],
      trustDeficiencies,
    });
  }

  const reviewReasons = [];
  const improvementFlags = [];

  const trustScoreVal = typeof trust.score === "number" ? trust.score : 0;
  const completenessScoreVal = typeof completeness.score === "number" ? completeness.score : 0;

  // ── Critical triggers ──
  const hasPlacementOutlier =
    (trust.reviewFlags || []).includes("placement_outlier") ||
    placements.reviewRequired === true ||
    placements.suspicious === true;
  if (hasPlacementOutlier) {
    reviewReasons.push("placement_outlier");
  }

  const hasAffiliationConflict =
    (trust.reviewFlags || []).includes("affiliation_conflict");
  if (hasAffiliationConflict) {
    reviewReasons.push("affiliation_conflict");
  }

  // ── High triggers ──
  if (healthStatus === "critical") {
    reviewReasons.push("website_unhealthy");
  } else if (healthStatus === "warning") {
    improvementFlags.push("website_warning");
  }

  if (accreditation.reviewRequired === true) {
    reviewReasons.push("accreditation_review_required");
  }

  // ── Medium triggers ──
  if (trustScoreVal < 40) {
    reviewReasons.push("very_low_trust_score");
  }

  // ── Improvement flags (never queue alone) ──
  if (trustScoreVal < 60) {
    improvementFlags.push("low_trust_score");
  }
  if (completenessScoreVal < 70) {
    improvementFlags.push("incomplete_profile");
  }

  // ── Priority & status ──
  let reviewQueuePriority = "none";
  let status = "approved";

  if (reviewReasons.length > 0) {
    status = "pending_review";

    // Assign priority based on precedence: Critical > High > Medium
    if (
      reviewReasons.includes("placement_outlier") ||
      reviewReasons.includes("affiliation_conflict")
    ) {
      reviewQueuePriority = "Critical";
    } else if (
      reviewReasons.includes("website_unhealthy") ||
      reviewReasons.includes("accreditation_review_required")
    ) {
      reviewQueuePriority = "High";
    } else if (reviewReasons.includes("very_low_trust_score")) {
      reviewQueuePriority = "Medium";
    }
  } else {
    // If no queue triggers:
    // Both website_warning and clean profiles are "not_required" — "approved" is reserved for admin sign-off
    status = "not_required";
  }

  return preserveAdminMeta(college, {
    status,
    reviewQueuePriority,
    reviewReasons,
    improvementFlags,
    trustDeficiencies,
  });
};

/**
 * Aggregate queue metrics from an array of { reviewStatus } detail rows.
 */
export const buildReviewQueueMetrics = (details) => {
  let critical = 0;
  let high = 0;
  let medium = 0;
  let notRequired = 0;
  let warnings = 0;

  for (const row of details) {
    const rs = row.reviewStatus || row;
    
    // Count warnings (colleges with website health status warning or flag website_warning)
    if (rs.improvementFlags && rs.improvementFlags.includes("website_warning")) {
      warnings++;
    }

    if (rs.status === "approved" || rs.status === "rejected") {
      notRequired++;
      continue;
    }

    if (rs.reviewQueuePriority === "Critical") critical++;
    else if (rs.reviewQueuePriority === "High") high++;
    else if (rs.reviewQueuePriority === "Medium") medium++;
    else notRequired++;
  }

  return { critical, high, medium, notRequired, warnings };
};
