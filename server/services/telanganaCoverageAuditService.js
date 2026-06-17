export default class TelanganaCoverageAuditService {
  /**
   * Analysis 1: Telangana College Inventory
   */
  generateInventory(colleges) {
    return colleges.map(c => ({
      collegeCode: c.collegeCode || `UNK_${Math.random()}`,
      collegeName: c.collegeName,
      website: c.officialWebsite?.url || '',
      state: 'Telangana'
    }));
  }

  /**
   * Helper to check specific fields
   */
  checkCoverage(c) {
    const hasFees = !!(c.officialData?.fees?.tuitionFee || c.officialData?.fees?.annualFee);
    const hasPlacements = !!(c.officialData?.placements?.highestPackage || c.officialData?.placements?.placementPercentage);
    const hasNaac = !!c.officialData?.accreditation?.naacGrade;
    const hasRankings = !!c.ranking?.overallScore || (c.officialData?.rankings && c.officialData.rankings.length > 0);
    const hasWebsite = !!c.officialWebsite?.url;
    const hasAcademics = !!(c.officialData?.academics?.departments?.length > 0 || c.officialData?.academics?.programs?.length > 0);
    const hasAdmissions = !!(c.officialData?.admissions?.eligibilityCriteria?.length > 0 || c.officialData?.admissions?.eamcetRanks);

    return { hasFees, hasPlacements, hasNaac, hasRankings, hasWebsite, hasAcademics, hasAdmissions };
  }

  /**
   * Analysis 2: Data Coverage Audit
   */
  generateCoverageAudit(colleges) {
    return colleges.map(c => {
      const cov = this.checkCoverage(c);
      return {
        collegeCode: c.collegeCode,
        collegeName: c.collegeName,
        fees: cov.hasFees,
        placements: cov.hasPlacements,
        naac: cov.hasNaac,
        rankings: cov.hasRankings
      };
    });
  }

  /**
   * Analysis 7: Statewide Summary
   */
  generateStatewideSummary(colleges, readinessScores) {
    let totalReady = 0;
    let missingFeesCount = 0;
    let missingPlacementsCount = 0;
    let missingNaacCount = 0;
    let missingRankingsCount = 0;
    let scoringZeroCount = 0;

    colleges.forEach((c) => {
      const cov = this.checkCoverage(c);
      
      if (!cov.hasFees) missingFeesCount++;
      if (!cov.hasPlacements) missingPlacementsCount++;
      if (!cov.hasNaac) missingNaacCount++;
      if (!cov.hasRankings) missingRankingsCount++;
      
      if ((c.ranking?.overallScore || 0) === 0) {
        scoringZeroCount++;
      }

      const score = readinessScores.find(rs => rs.collegeCode === c.collegeCode)?.readinessScore || 0;
      if (score >= 80) totalReady++;
    });

    const total = colleges.length;

    return {
      totalTelanganaColleges: total,
      recommendationReadyColleges: totalReady,
      incompleteColleges: total - totalReady,
      collegesMissingFees: missingFeesCount,
      collegesMissingPlacements: missingPlacementsCount,
      collegesMissingNaac: missingNaacCount,
      collegesMissingRankings: missingRankingsCount,
      collegesCurrentlyScoringZero: scoringZeroCount,
      estimatedRecommendationCoveragePercent: total > 0 ? (totalReady / total) * 100 : 0
    };
  }
}
