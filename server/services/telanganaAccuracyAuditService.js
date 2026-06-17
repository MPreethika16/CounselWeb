export default class TelanganaAccuracyAuditService {
  constructor() {
    this.benchmarkColleges = [
      "CBIT", "VNR VJIET", "Vasavi", "CVR", "Vardhaman", "GRIET", 
      "MGIT", "JNTUH UCEH", "BV Raju Institute", "Malla Reddy Engineering College"
    ];
  }

  // 1. Verify Dataset Coverage
  calculateCoverage(colleges) {
    let fees = 0, placements = 0, naac = 0, rankings = 0, academics = 0, website = 0;
    
    colleges.forEach(c => {
      if (c.officialData?.fees?.tuitionFee || c.officialData?.fees?.annualFee) fees++;
      if (c.officialData?.placements?.highestPackage || c.officialData?.placements?.placementPercentage) placements++;
      if (c.officialData?.accreditation?.naacGrade) naac++;
      if (c.ranking?.overallScore > 0 || (c.officialData?.rankings && c.officialData.rankings.length > 0)) rankings++;
      if (c.officialData?.academics?.departments?.length > 0 || c.officialData?.academics?.programs?.length > 0) academics++;
      if (c.officialWebsite?.url) website++;
    });

    const total = colleges.length;
    const complete = colleges.filter(c => 
      (c.officialData?.fees?.tuitionFee || c.officialData?.fees?.annualFee) &&
      (c.officialData?.placements?.highestPackage || c.officialData?.placements?.placementPercentage) &&
      c.officialData?.accreditation?.naacGrade &&
      c.officialWebsite?.url
    ).length;

    return {
      totalDiscovered: total,
      totalComplete: complete,
      coveragePercentages: {
        fees: total > 0 ? (fees / total) * 100 : 0,
        placements: total > 0 ? (placements / total) * 100 : 0,
        naac: total > 0 ? (naac / total) * 100 : 0,
        rankings: total > 0 ? (rankings / total) * 100 : 0,
        academics: total > 0 ? (academics / total) * 100 : 0,
        officialWebsite: total > 0 ? (website / total) * 100 : 0
      }
    };
  }

  // 2. Official Website Validation
  validateWebsites(colleges) {
    const verified = [];
    const invalid = [];

    colleges.forEach(c => {
      const url = c.officialWebsite?.url;
      const isReachable = c.officialWebsite?.health?.healthy;
      const isRedirected = c.officialWebsite?.health?.redirected;
      const isVerified = c.officialWebsite?.verified;
      const healthStatus = c.officialWebsite?.health?.status;

      const report = {
        collegeCode: c.collegeCode,
        collegeName: c.collegeName,
        url,
        exists: !!url,
        reachable: !!isReachable,
        belongsToCollege: !!isVerified,
        redirectDetected: !!isRedirected,
        deadDomain: healthStatus === 'critical' || (url && !isReachable && isReachable !== null)
      };

      if (report.exists && report.reachable) {
        verified.push(report);
      } else {
        invalid.push({
          ...report,
          reason: !report.exists ? "MISSING_URL" : "UNREACHABLE_DOMAIN"
        });
      }
    });

    return { verified, invalid };
  }

  // 3. Placement Accuracy Audit
  auditPlacements(colleges) {
    const report = [];

    colleges.forEach(c => {
      const p = c.officialData?.placements;
      if (!p) return;

      const hasData = !!(p.highestPackage || p.averagePackage || p.placementPercentage);
      if (!hasData) return;

      const anomalies = [];
      let isAccurate = true;

      if (p.highestPackage && p.averagePackage && p.highestPackage < p.averagePackage) {
        anomalies.push("HIGHEST_PACKAGE_LESS_THAN_AVERAGE");
        isAccurate = false;
      }
      if (p.placementPercentage && p.placementPercentage > 100) {
        anomalies.push("PLACEMENT_PERCENTAGE_OVER_100");
        isAccurate = false;
      }
      if (p.totalPlacedStudents && p.totalOffers && p.totalPlacedStudents > p.totalOffers) {
        anomalies.push("PLACED_STUDENTS_EXCEEDS_OFFERS");
        isAccurate = false;
      }

      report.push({
        collegeCode: c.collegeCode,
        collegeName: c.collegeName,
        highestPackage: p.highestPackage || "MISSING",
        averagePackage: p.averagePackage || "MISSING",
        placementPercentage: p.placementPercentage || "MISSING",
        anomalies,
        status: isAccurate ? (anomalies.length === 0 ? "VERIFIED" : "RECOVERED") : "INVALID"
      });
    });

    return report;
  }

  // 4. Fee Accuracy Audit
  auditFees(colleges) {
    const report = [];

    colleges.forEach(c => {
      const f = c.officialData?.fees;
      if (!f || (!f.tuitionFee && !f.annualFee)) return;

      const anomalies = [];
      let status = "VERIFIED";

      if (f.tuitionFee !== null && f.tuitionFee <= 0) {
        anomalies.push("NON_POSITIVE_FEE");
        status = "INVALID";
      }
      if (f.tuitionFee !== null && f.tuitionFee > 5000000) {
        anomalies.push("IMPOSSIBLE_FEE_VALUE");
        status = "INVALID";
      }
      if (f.tuitionFee && f.annualFee && f.tuitionFee === f.annualFee) {
        anomalies.push("DUPLICATE_FEE_RECORD");
      }

      report.push({
        collegeCode: c.collegeCode,
        collegeName: c.collegeName,
        tuitionFee: f.tuitionFee || "MISSING",
        annualFee: f.annualFee || "MISSING",
        anomalies,
        status
      });
    });

    return report;
  }

  // 5. NAAC Verification
  verifyNaac(colleges) {
    const report = [];
    const validGrades = ["A++", "A+", "A", "B++", "B+", "B", "C", "D"];

    colleges.forEach(c => {
      const naac = c.officialData?.accreditation;
      if (!naac || !naac.naacGrade) return;

      const anomalies = [];
      let status = "VERIFIED";

      if (!validGrades.includes(naac.naacGrade.toUpperCase())) {
        anomalies.push("INVALID_GRADE_FORMAT");
        status = "INVALID";
      }
      if (!naac.sourceUrl) {
        anomalies.push("MISSING_SOURCE_URL");
      }
      if (naac.confidence < 50) {
        anomalies.push("LOW_CONFIDENCE_EXTRACTION");
      }

      report.push({
        collegeCode: c.collegeCode,
        collegeName: c.collegeName,
        grade: naac.naacGrade,
        sourceUrl: naac.sourceUrl || "MISSING",
        confidence: naac.confidence || 0,
        anomalies,
        status
      });
    });

    return report;
  }

  // 6. Ranking Verification
  verifyRankings(colleges) {
    const notRanked = [];
    const missingData = [];
    const invalidData = [];
    const verified = [];

    colleges.forEach(c => {
      const rankings = c.officialData?.rankings || [];
      if (rankings.length === 0) {
        if ((c.ranking?.overallScore || 0) === 0) {
          notRanked.push({ collegeCode: c.collegeCode, collegeName: c.collegeName, status: "NOT_RANKED" });
        } else {
          missingData.push({ collegeCode: c.collegeCode, collegeName: c.collegeName, status: "MISSING_DATA" });
        }
        return;
      }

      rankings.forEach(r => {
        if (!r.agency || !r.year || !r.rank) {
          invalidData.push({
            collegeCode: c.collegeCode,
            collegeName: c.collegeName,
            ranking: r,
            reason: "MISSING_MANDATORY_FIELD",
            status: "INVALID_DATA"
          });
        } else {
          verified.push({
            collegeCode: c.collegeCode,
            collegeName: c.collegeName,
            agency: r.agency,
            year: r.year,
            rank: r.rank,
            status: "VERIFIED"
          });
        }
      });
    });

    return { notRanked, missingData, invalidData, verified };
  }

  // 7. Recommendation Explainability
  generateExplainability(colleges) {
    const sorted = [...colleges].sort((a, b) => (b.ranking?.overallScore || 0) - (a.ranking?.overallScore || 0));
    const top100 = sorted.slice(0, 100);

    return top100.map((c, index) => ({
      collegeCode: c.collegeCode,
      collegeName: c.collegeName,
      overallScore: c.ranking?.overallScore || 0,
      academicsScore: c.ranking?.academicScore || 0,
      placementScore: c.ranking?.placementScore || 0,
      rankingScore: c.ranking?.infrastructureScore || 0,
      feeScore: c.recommendationFactors?.affordabilityStrength || 0,
      confidenceScore: c.trustScore?.score || 0,
      dataConfidence: c.trustScore?.score || 0,
      rank: index + 1
    }));
  }

  // 8. Benchmark Validation
  validateBenchmarks(colleges) {
    const report = [];
    const benchmarkLowerNames = this.benchmarkColleges.map(name => name.toLowerCase());

    colleges.forEach(c => {
      const isBenchmark = benchmarkLowerNames.some(bn => 
        c.collegeName.toLowerCase().includes(bn) || 
        c.aliases?.some(a => a.toLowerCase().includes(bn))
      );

      if (isBenchmark) {
        report.push({
          collegeCode: c.collegeCode,
          collegeName: c.collegeName,
          websiteExists: !!c.officialWebsite?.url,
          feesExists: !!(c.officialData?.fees?.tuitionFee || c.officialData?.fees?.annualFee),
          placementsExists: !!(c.officialData?.placements?.highestPackage || c.officialData?.placements?.placementPercentage),
          naacExists: !!c.officialData?.accreditation?.naacGrade,
          rankingsExists: !!(c.officialData?.rankings && c.officialData.rankings.length > 0),
          recommendationScore: c.ranking?.overallScore || 0,
          confidenceScore: c.trustScore?.score || 0
        });
      }
    });

    return report;
  }

  // 9. Recommendation Sanity Check
  detectRecommendationAnomalies(colleges) {
    const sorted = [...colleges].sort((a, b) => (b.ranking?.overallScore || 0) - (a.ranking?.overallScore || 0));
    const anomalies = [];

    sorted.forEach((c, index) => {
      const rank = index + 1;
      const score = c.ranking?.overallScore || 0;
      const conf = c.trustScore?.score || 0;
      const hasMissingData = !(c.officialData?.fees?.tuitionFee || c.officialData?.fees?.annualFee) || !(c.officialData?.placements?.highestPackage);

      // Ranked suspiciously high (>80 score) despite missing data
      if (rank <= 20 && hasMissingData && score > 0) {
        anomalies.push({
          collegeCode: c.collegeCode,
          collegeName: c.collegeName,
          rank,
          score,
          anomaly: "MISSING_DATA_HIGH_RANK",
          description: "Missing core data but received high rank."
        });
      }

      // Suspiciously high score despite low confidence
      if (score > 80 && conf < 50) {
        anomalies.push({
          collegeCode: c.collegeCode,
          collegeName: c.collegeName,
          rank,
          score,
          anomaly: "LOW_CONFIDENCE_HIGH_SCORE",
          description: "Ranked highly despite low data confidence."
        });
      }

      // High confidence but very low score (could be correct, but flagged for sanity check)
      if (score < 10 && conf > 90) {
        anomalies.push({
          collegeCode: c.collegeCode,
          collegeName: c.collegeName,
          rank,
          score,
          anomaly: "HIGH_CONFIDENCE_LOW_SCORE",
          description: "High confidence data resulted in extremely low score."
        });
      }
    });

    return anomalies;
  }
}
