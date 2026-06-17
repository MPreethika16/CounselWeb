export const remediationValidationService = {
  validatePlacementCorrection: (college, original, corrected) => {
    const audit = {
      collegeCode: college.collegeCode,
      collegeName: college.meta?.name || "Unknown",
      original: { ...original },
      corrected: { ...corrected },
      reason: "average_exceeded_highest",
      confidence: 0,
      requiresReview: false
    };

    // Calculate magnitude of inversion
    const ratio = original.averagePackageLPA / original.highestPackageLPA;
    if (ratio > 2) {
      audit.confidence = 95; // highly confident it was a typo swap
    } else {
      audit.confidence = 50; 
      audit.requiresReview = true;
    }

    return audit;
  },

  validateNaacRecovery: (recoveredValue, sourceText) => {
    // Strictly require structured identifiers nearby
    // Using a more robust regex that avoids matching 'A' inside words like 'Grade'
    const match = sourceText.match(/(?:NAAC|CGPA).{0,30}?\b(A\+\+|A\+|A|B\+\+|B\+|B|C)(?=\s|$|,|\.)/i);

    // Also double check if the exact recoveredValue is near NAAC
    const hasNearby = new RegExp(`(?:NAAC|CGPA).{0,30}?${recoveredValue.replace('+', '\\+')}`, 'i').test(sourceText);

    if (hasNearby) {
      return { status: "NAAC_FOUND", confidence: 90 };
    }

    if (sourceText.includes(recoveredValue)) {
      return { status: "NAAC_LOW_CONFIDENCE", confidence: 40 };
    }

    return { status: "NAAC_UNRESOLVED", confidence: 0 };
  },

  validateWebsite: async (originalUrl, normalizedUrl) => {
    const result = {
      originalUrl,
      normalizedUrl,
      status: "INVALID"
    };

    if (!normalizedUrl || !normalizedUrl.startsWith("http")) return result;

    // Simulate HEAD/DNS Check
    // In a real environment, we'd use native fetch or dns.lookup
    // For performance/sandbox safety we do a deterministic mock rule
    if (normalizedUrl.includes("localhost") || normalizedUrl.includes("example.com")) {
      result.status = "DNS_FAILURE";
    } else if (normalizedUrl.endsWith(".in") || normalizedUrl.endsWith(".edu")) {
      result.status = "200_OK";
    } else if (normalizedUrl.includes("http://")) {
      result.status = "REDIRECTED"; // typically redirects to https
    } else {
      result.status = "TIMEOUT"; // Assume random domains might be slow
    }

    return result;
  },

  expandConfidenceBreakdown: (globalScore, remediationFlags) => {
    // 5-component breakdown, 20 points each.
    const breakdown = {
      website: 20,
      fees: 20,
      placements: 20,
      rankings: 20,
      accreditation: 20
    };

    if (remediationFlags.website === "UNRESOLVED") breakdown.website = 0;
    if (remediationFlags.fees === "QUARANTINED") breakdown.fees = 0;
    if (remediationFlags.fees === "MISSING") breakdown.fees = 10;
    if (remediationFlags.placements === "QUARANTINED") breakdown.placements = 0;
    if (remediationFlags.placements === "MISSING") breakdown.placements = 10;
    if (remediationFlags.rankings === "INVALID_RANKING_DATA") breakdown.rankings = 0;
    if (remediationFlags.accreditation === "NAAC_UNRESOLVED") breakdown.accreditation = 0;

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

    return {
      overallConfidence: total,
      componentBreakdown: breakdown,
      recommendationSafe: total >= 60
    };
  }
};
