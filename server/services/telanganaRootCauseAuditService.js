export default class TelanganaRootCauseAuditService {
  /**
   * Determine the failure stage for a college
   */
  analyzePipelineStage(college) {
    const report = {
      collegeCode: college.collegeCode,
      collegeName: college.collegeName,
      discoveryStatus: college.discoveryStatus,
      attemptedPages: college.officialData?.coverageDetails?.attemptedPages || 0,
      failedPages: college.officialData?.coverageDetails?.failedPages || 0,
      extractedAt: {
        fees: college.officialData?.fees?.extractedAt || null,
        placements: college.officialData?.placements?.extractedAt || null,
        academics: college.officialData?.academics?.extractedAt || null,
        naac: college.officialData?.accreditation?.extractedAt || null
      },
      normalizedAt: college.metadata?.normalizedAt || null,
      calculatedAt: college.ranking?.calculatedAt || null,
      score: college.ranking?.overallScore || 0
    };

    let lastSuccessfulStage = "None";
    let failureStage = "Discovery";
    let rootCause = "Discovery failed or not started";
    let recommendedFix = "Run discovery scraper";

    // 1. Discovery Stage
    if (["discovered", "verified"].includes(college.discoveryStatus) || college.officialWebsite?.url) {
      lastSuccessfulStage = "Discovery";
      failureStage = "Scraper Execution";
      rootCause = "Scraper job never executed or attempted pages is 0";
      recommendedFix = "Dispatch scraper jobs for official website";
    }

    // 2. Scraper Execution Stage
    if (report.attemptedPages > 0) {
      lastSuccessfulStage = "Scraper Execution";
      failureStage = "Extraction";
      rootCause = "Scraper visited pages but extracted no structured data (parsers failed)";
      recommendedFix = "Fix parser selectors for fees, placements, and NAAC";
      
      if (report.failedPages > 0 && report.failedPages === report.attemptedPages) {
        rootCause = "All attempted pages failed (network errors, timeouts, or 404s)";
        recommendedFix = "Check proxy pool, wait for site to come online, or fix URL patterns";
      }
    }

    // 3. Extraction Stage
    const anyExtracted = Object.values(report.extractedAt).some(t => t !== null);
    if (anyExtracted) {
      lastSuccessfulStage = "Extraction";
      failureStage = "Normalization";
      rootCause = "Extracted data failed schema validation and was dropped during normalization";
      recommendedFix = "Review normalizer logs for schema mismatches";
    }

    // 4. Normalization Stage
    if (report.normalizedAt !== null) {
      lastSuccessfulStage = "Normalization";
      failureStage = "Database Write";
      rootCause = "Normalized data was nullified or overwritten during database update";
      recommendedFix = "Check database update logic (e.g. $set dropping empty fields instead of preserving)";
    }

    // 5. Database Write & Recommendation Input
    // If the overall score is 0 but we have a calculatedAt, the recommendation engine ran but failed due to missing inputs
    if (report.calculatedAt !== null) {
      lastSuccessfulStage = "Recommendation Input";
      if (report.score === 0) {
        failureStage = "Recommendation Generation";
        rootCause = "Recommendation engine executed but output 0 due to critical missing dependencies (fees, placements)";
        recommendedFix = "Ensure extraction stage populates mandatory recommendation fields";
      } else {
        failureStage = "None";
        rootCause = "None";
        recommendedFix = "None";
        lastSuccessfulStage = "Complete";
      }
    }

    // Edge case based on Phase 2.0 findings: websites exist but attemptedPages is 0
    if (lastSuccessfulStage === "Discovery" && report.attemptedPages === 0) {
      failureStage = "Scraper Execution";
      rootCause = "Scraper workers are not picking up the queue, or tasks are failing before execution";
      recommendedFix = "Inspect worker queue health and job dispatch logic";
    }

    return {
      ...report,
      lastSuccessfulStage,
      failureStage,
      rootCause,
      recommendedFix
    };
  }

  generateReports(colleges) {
    const pipelineStageReport = [];
    const scraperFailureReport = [];
    const parserFailureReport = [];
    const normalizationFailureReport = [];
    const databaseWriteReport = [];
    const recommendationInputReport = [];
    const summary = {
      totalAnalyzed: colleges.length,
      failingAtDiscovery: 0,
      failingAtScraping: 0,
      failingAtParsing: 0,
      failingAtNormalization: 0,
      failingAtDatabaseWrites: 0,
      reachingRecommendationWithMissingData: 0,
      primaryRootCauseStage: "Unknown"
    };

    colleges.forEach(c => {
      const analysis = this.analyzePipelineStage(c);
      
      pipelineStageReport.push({
        collegeCode: analysis.collegeCode,
        collegeName: analysis.collegeName,
        lastSuccessfulStage: analysis.lastSuccessfulStage,
        failureStage: analysis.failureStage,
        rootCause: analysis.rootCause,
        recommendedFix: analysis.recommendedFix
      });

      if (analysis.failureStage === "Discovery") {
        summary.failingAtDiscovery++;
      } else if (analysis.failureStage === "Scraper Execution") {
        summary.failingAtScraping++;
        scraperFailureReport.push(analysis);
      } else if (analysis.failureStage === "Extraction") {
        summary.failingAtParsing++;
        parserFailureReport.push(analysis);
      } else if (analysis.failureStage === "Normalization") {
        summary.failingAtNormalization++;
        normalizationFailureReport.push(analysis);
      } else if (analysis.failureStage === "Database Write") {
        summary.failingAtDatabaseWrites++;
        databaseWriteReport.push(analysis);
      } else if (analysis.failureStage === "Recommendation Generation") {
        summary.reachingRecommendationWithMissingData++;
        recommendationInputReport.push(analysis);
      }
    });

    // Identify the SINGLE stage responsible
    const failureCounts = {
      "Discovery": summary.failingAtDiscovery,
      "Scraper Execution": summary.failingAtScraping,
      "Extraction": summary.failingAtParsing,
      "Normalization": summary.failingAtNormalization,
      "Database Write": summary.failingAtDatabaseWrites,
      "Recommendation Generation": summary.reachingRecommendationWithMissingData
    };

    let maxFailures = 0;
    for (const [stage, count] of Object.entries(failureCounts)) {
      if (count > maxFailures) {
        maxFailures = count;
        summary.primaryRootCauseStage = stage;
      }
    }

    return {
      pipelineStageReport,
      scraperFailureReport,
      parserFailureReport,
      normalizationFailureReport,
      databaseWriteReport,
      recommendationInputReport,
      summary
    };
  }
}
