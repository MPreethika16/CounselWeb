import TelanganaCoverageAuditService from './telanganaCoverageAuditService.js';

export default class TelanganaDataGapService {
  constructor() {
    this.coverageService = new TelanganaCoverageAuditService();
    this.benchmarkColleges = [
      "CBIT", "VNR VJIET", "Vasavi", "CVR", "GRIET", "MGIT", 
      "Vardhaman", "SNIST", "BV Raju Institute of Technology", 
      "MLRIT", "CMR College of Engineering & Technology", 
      "GNITS", "MVSR"
    ];
  }

  /**
   * Analysis 3: Recommendation Blocker Detection
   */
  detectBlockers(colleges) {
    const report = [];

    colleges.forEach(c => {
      // Only process if recommendation score is 0
      if ((c.ranking?.overallScore || 0) === 0) {
        const cov = this.coverageService.checkCoverage(c);
        const blockers = [];

        if (!cov.hasFees) blockers.push("MISSING_FEES");
        if (!cov.hasPlacements) blockers.push("MISSING_PLACEMENTS");
        if (!cov.hasNaac) blockers.push("MISSING_NAAC");
        if (!cov.hasRankings) blockers.push("MISSING_RANKINGS");

        if (blockers.length > 1) {
          blockers.push("MISSING_MULTIPLE_FIELDS");
        }

        report.push({
          collegeCode: c.collegeCode,
          collegeName: c.collegeName,
          blockers
        });
      }
    });

    return report;
  }

  /**
   * Analysis 4: Benchmark College Deep Audit
   */
  deepAuditBenchmarks(colleges, readinessScores) {
    const report = [];
    const benchmarkLowerNames = this.benchmarkColleges.map(name => name.toLowerCase());

    colleges.forEach(c => {
      const isBenchmark = benchmarkLowerNames.some(bn => 
        c.collegeName.toLowerCase().includes(bn) || 
        c.aliases?.some(a => a.toLowerCase().includes(bn))
      );

      if (isBenchmark) {
        const cov = this.coverageService.checkCoverage(c);
        const missingFields = [];

        if (!cov.hasFees) missingFields.push("fees");
        if (!cov.hasPlacements) missingFields.push("placements");
        if (!cov.hasNaac) missingFields.push("naac");
        if (!cov.hasRankings) missingFields.push("rankings");
        if (!cov.hasWebsite) missingFields.push("website");
        if (!cov.hasAcademics) missingFields.push("academics");
        if (!cov.hasAdmissions) missingFields.push("admissions");

        const scoreObj = readinessScores.find(rs => rs.collegeCode === c.collegeCode);

        report.push({
          collegeCode: c.collegeCode,
          collegeName: c.collegeName,
          currentDataAvailability: cov,
          missingFields,
          recommendationReadinessPercent: scoreObj ? scoreObj.readinessScore : 0
        });
      }
    });

    return report;
  }
}
