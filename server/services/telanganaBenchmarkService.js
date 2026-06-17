class TelanganaBenchmarkService {
  constructor() {
    this.benchmarkColleges = [
      "JNTUH College of Engineering Hyderabad",
      "CBIT",
      "VNR VJIET",
      "Vasavi College of Engineering",
      "MGIT",
      "GRIET",
      "OU College of Engineering",
      "University College of Engineering Kakatiya University",
      "BV Raju Institute of Technology",
      "Vardhaman College of Engineering",
      "MLRIT",
      "CMR College of Engineering & Technology",
      "GNITS",
      "CVR College of Engineering",
      "MVSR Engineering College"
    ];
  }

  /**
   * Validate a benchmark college's data quality
   */
  validateBenchmarkCollege(college) {
    const validations = {
      collegeName: college.collegeName,
      officialWebsite: !!college.officialWebsite?.url,
      naacAccreditation: !!college.officialData?.accreditation?.naacGrade,
      nirfRanked: college.officialData?.accreditation?.nirfRank > 0,
      feeStructure: !!college.officialData?.fees?.tuitionFee || !!college.officialData?.fees?.annualFee,
      placementStats: !!college.officialData?.placements?.highestPackage || !!college.officialData?.placements?.placementPercentage,
      recommendationScore: college.ranking?.overallScore || 0,
      dataConfidenceScore: college.trustScore?.score || 0
    };

    const isPassed = validations.officialWebsite && 
                     validations.feeStructure && 
                     validations.placementStats && 
                     validations.dataConfidenceScore > 50;

    return { ...validations, isPassed };
  }

  /**
   * Generate explainability report for a college
   */
  generateExplainability(college) {
    return {
      collegeCode: college.collegeCode,
      collegeName: college.collegeName,
      overallScore: college.ranking?.overallScore || 0,
      academicsScore: college.ranking?.academicScore || 0,
      placementScore: college.ranking?.placementScore || 0,
      rankingScore: college.ranking?.infrastructureScore || 0, // Using infrastructure as ranking/other proxy
      feeScore: college.recommendationFactors?.affordabilityStrength || 0,
      confidenceScore: college.trustScore?.score || 0
    };
  }

  /**
   * Detect ranking anomalies
   * 1. Ranked unexpectedly high despite weak placements/accreditation.
   * 2. Top TS EAMCET colleges ranked unusually low.
   * 3. Missing/recovered data causing excessive score inflation.
   */
  detectAnomalies(college, rank, isBenchmark) {
    const anomalies = [];
    
    // 1. Ranked high despite weak placements
    if (rank <= 20 && (!college.officialData?.placements?.highestPackage && !college.officialData?.accreditation?.naacGrade)) {
      anomalies.push("Ranked top 20 despite weak placements and missing NAAC.");
    }

    // 2. Benchmark (Top TS EAMCET) ranked unusually low
    if (isBenchmark && rank > 50) {
      anomalies.push("Benchmark college ranked unusually low (outside top 50).");
    }

    // 3. Excessive score inflation (heuristic: score > 90 but trust score < 60)
    if ((college.ranking?.overallScore > 90) && (college.trustScore?.score < 60)) {
      anomalies.push("Score inflated despite low data confidence.");
    }

    return anomalies;
  }
}

export default new TelanganaBenchmarkService();
