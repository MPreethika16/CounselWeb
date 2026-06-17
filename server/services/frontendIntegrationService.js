/**
 * Adapts backend payloads for frontend consumption.
 */

export function formatCollegeDetailsForUI(collegeMasterDoc) {
  if (!collegeMasterDoc) return null;

  const data = collegeMasterDoc.officialData || {};
  
  return {
    meta: {
      collegeCode: collegeMasterDoc.collegeCode,
      name: collegeMasterDoc.collegeName,
      shortName: collegeMasterDoc.shortName,
      location: `${collegeMasterDoc.city}, ${collegeMasterDoc.state}`,
      coverImage: data.coverImage || "",
      logo: data.gallery?.value?.find(g => g.category === "logo")?.url || ""
    },
    academics: {
      programsCount: data.academics?.programs?.length || 0,
      facultyRatio: data.academics?.studentFacultyRatio || "N/A",
      topDepartments: data.academics?.departments?.slice(0, 3) || []
    },
    placements: {
      highestPackageLPA: data.placements?.highestPackage ? (data.placements.highestPackage / 100000).toFixed(1) : "N/A",
      averagePackageLPA: data.placements?.averagePackage ? (data.placements.averagePackage / 100000).toFixed(1) : "N/A",
      placementRate: data.placements?.placementPercentage ? `${data.placements.placementPercentage}%` : "N/A"
    },
    fees: {
      averageTuition: data.fees?.[0]?.tuitionFee || "N/A",
      currency: "INR"
    },
    accreditation: {
      nirfRank: data.accreditation?.nirfRank || "Not Ranked",
      naacGrade: data.accreditation?.naacGrade || "N/A",
      autonomous: data.accreditation?.autonomous || false
    },
    trust: {
      freshnessClassification: data.freshness?.classification || "CRITICAL",
      lastVerified: data.freshness?.lastVerifiedAt || null,
      confidenceScore: collegeMasterDoc.trustScore?.score || 0
    }
  };
}

export function buildComparisonPayload(colleges) {
  return colleges.map(college => formatCollegeDetailsForUI(college));
}

export function formatRecommendationReasons(scoredCollege) {
  const reasons = [];
  
  if (scoredCollege.subscores?.placementScore > 80) {
    reasons.push("Outstanding placement records.");
  }
  if (scoredCollege.subscores?.affordabilityScore > 80) {
    reasons.push("Highly affordable tuition fees.");
  }
  if (scoredCollege.subscores?.academicsScore > 80) {
    reasons.push("Top-tier academic programs and faculty ratio.");
  }

  return {
    ...scoredCollege,
    uiHighlights: reasons
  };
}
