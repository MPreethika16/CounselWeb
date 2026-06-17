import TelanganaCoverageAuditService from './telanganaCoverageAuditService.js';

export default class TelanganaRecoveryPlannerService {
  constructor() {
    this.coverageService = new TelanganaCoverageAuditService();
  }

  /**
   * Analysis 6: Recommendation Readiness Score
   * Scoring:
   * Website = 15
   * Academics = 15
   * Fees = 20
   * Placements = 20
   * Rankings = 15
   * Accreditation (NAAC) = 15
   */
  calculateReadinessScores(colleges) {
    return colleges.map(c => {
      const cov = this.coverageService.checkCoverage(c);
      let score = 0;

      if (cov.hasWebsite) score += 15;
      if (cov.hasAcademics) score += 15;
      if (cov.hasFees) score += 20;
      if (cov.hasPlacements) score += 20;
      if (cov.hasRankings) score += 15;
      if (cov.hasNaac) score += 15;

      return {
        collegeCode: c.collegeCode,
        collegeName: c.collegeName,
        readinessScore: score
      };
    });
  }

  /**
   * Analysis 5: Recovery Planning
   */
  generateRecoveryPlan(colleges) {
    const plan = [];

    colleges.forEach(c => {
      const cov = this.coverageService.checkCoverage(c);
      const missing = [];
      const recommendedAction = [];

      if (!cov.hasFees) {
        missing.push("fees");
        recommendedAction.push("rerun_fee_scraper");
      }
      if (!cov.hasPlacements) {
        missing.push("placements");
        recommendedAction.push("rerun_placement_scraper");
      }
      if (!cov.hasNaac) {
        missing.push("naac");
        recommendedAction.push("rerun_accreditation_scraper");
      }
      if (!cov.hasRankings) {
        missing.push("rankings");
        recommendedAction.push("rerun_ranking_scraper");
      }
      if (!cov.hasWebsite) {
        missing.push("website");
        recommendedAction.push("manual_website_verification");
      }
      if (!cov.hasAcademics) {
        missing.push("academics");
        recommendedAction.push("rerun_academics_scraper");
      }

      if (missing.length > 0) {
        plan.push({
          collegeCode: c.collegeCode,
          collegeName: c.collegeName,
          missing,
          recommendedAction
        });
      }
    });

    return plan;
  }
}
