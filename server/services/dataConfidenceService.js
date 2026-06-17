export const dataConfidenceService = {
  calculateConfidenceScore: (college, remediationResults) => {
    let score = 100;
    const notes = [];

    // Missing Data (Minor Deductions)
    if (remediationResults.website.status === "UNRESOLVED_WEBSITE") {
      score -= 5;
      notes.push("Missing or invalid website");
    }

    if (remediationResults.rankings.status === "NOT_RANKED") {
      // Not penalized heavily, just a fact of the college.
      notes.push("College is not ranked");
    } else if (remediationResults.rankings.status === "INVALID_RANKING_DATA") {
      score -= 10;
      notes.push("Corrupt ranking data quarantined");
    }

    if (remediationResults.naac.status === "NAAC_NOT_AVAILABLE") {
      notes.push("NAAC data missing (not penalized)");
    } else if (remediationResults.naac.status === "NAAC_UNRESOLVED") {
      score -= 5;
      notes.push("Invalid NAAC grade quarantined");
    }

    // High Risk Anomalies (Heavy Deductions)
    if (remediationResults.fees.status === "UNRESOLVED_FEE") {
      score -= 20;
      notes.push("Fee data quarantined (Impossible values)");
    } else if (remediationResults.fees.status === "MISSING") {
      score -= 10;
      notes.push("Fee data completely missing");
    }

    if (remediationResults.placements.status === "QUARANTINED") {
      score -= 30;
      notes.push("Placement logic corrupted (e.g. Rate > 100%)");
    } else if (remediationResults.placements.status === "MISSING") {
      score -= 10; // Missing is better than corrupt, but impacts recommendation utility.
      notes.push("Placement data missing");
    }

    score = Math.max(0, score);

    return {
      score,
      confidenceCategory: score >= 80 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW",
      recommendationSafe: score >= 60,
      notes
    };
  }
};
