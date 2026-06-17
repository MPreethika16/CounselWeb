import College from "../models/College.js";

const VALID_NAAC_GRADES = new Set(["A++", "A+", "A", "B++", "B+", "B", "C"]);
const URL_REGEX = /^https?:\/\/(?!localhost)(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

export const dataQualityAuditService = {
  runQualityAudit: async () => {
    let totalScanned = 0;
    
    // Website states
    const websiteStats = { VALID: 0, MISSING: 0, INVALID_FORMAT: 0 };
    
    // Anomaly counts
    const anomalies = {
      accreditation: 0,
      rankings: 0,
      fees: 0,
      placements: 0,
      courses: 0
    };

    // Coverage & Risk
    const coverage = { website: 0, fees: 0, placements: 0, rankings: 0, naac: 0, admissions: 0, academics: 0 };
    const risks = { LOW_RISK: 0, MEDIUM_RISK: 0, HIGH_RISK: 0 };

    const cursor = College.find().lean().cursor();

    for await (const doc of cursor) {
      totalScanned++;
      let anomalyScore = 0;
      const d = doc.officialData || {};
      const meta = doc.meta || {};

      // 1. Website Validation
      if (!d.website || d.website.trim() === "") {
        websiteStats.MISSING++;
        anomalyScore += 1;
      } else if (!URL_REGEX.test(d.website)) {
        websiteStats.INVALID_FORMAT++;
        anomalyScore += 2;
      } else {
        websiteStats.VALID++;
        coverage.website++;
      }

      // 2. Accreditation Audit
      let hasNaac = false;
      if (d.accreditation?.naacGrade) {
        hasNaac = true;
        coverage.naac++;
        if (!VALID_NAAC_GRADES.has(d.accreditation.naacGrade)) {
          anomalies.accreditation++;
          anomalyScore += 2;
        }
      }

      // 3. Rankings Audit
      if (d.rankings && d.rankings.length > 0) {
        coverage.rankings++;
        for (const r of d.rankings) {
          if (r.rank <= 0 || r.year < 2000 || r.year > new Date().getFullYear() + 1 || !r.agency) {
            anomalies.rankings++;
            anomalyScore += 1;
            break; // Count anomaly once per college
          }
        }
      }

      // 4. Fees Audit
      let hasFees = false;
      if (d.fees?.averageTuition || (d.fees?.feeStructure && d.fees.feeStructure.length > 0)) {
        hasFees = true;
        coverage.fees++;
        if (d.fees.averageTuition <= 0 || d.fees.averageTuition > 10000000) {
          anomalies.fees++;
          anomalyScore += 2;
        }
      } else {
        anomalyScore += 1;
      }

      // 5. Placement Audit
      let hasPlacements = false;
      if (d.placements && Object.keys(d.placements).length > 0) {
        if (d.placements.averagePackageLPA > 0) {
          hasPlacements = true;
          coverage.placements++;
        }
        
        const p = d.placements;
        if (
          (p.placementPercentage > 100 || p.placementPercentage < 0) ||
          (p.averagePackageLPA > p.highestPackageLPA) ||
          (p.averagePackageLPA < 0 || p.highestPackageLPA < 0)
        ) {
          anomalies.placements++;
          anomalyScore += 2;
        }
      } else {
        anomalyScore += 1;
      }

      // 6. Course Audit
      if (doc.courses?.ug || doc.courses?.pg) {
        const ugSet = new Set(doc.courses.ug || []);
        if (doc.courses.ug && ugSet.size !== doc.courses.ug.length) anomalies.courses++;
        // academics proxy coverage
        coverage.academics++;
      } else {
        anomalyScore += 1;
      }

      if (d.admissions && d.admissions.length > 0) coverage.admissions++;

      // Risk Classification
      if (anomalyScore === 0) risks.LOW_RISK++;
      else if (anomalyScore <= 3) risks.MEDIUM_RISK++;
      else risks.HIGH_RISK++;
    }

    // Convert coverage counts to percentages
    const cvgPct = {};
    if (totalScanned > 0) {
      for (const [k, v] of Object.entries(coverage)) {
        cvgPct[k] = ((v / totalScanned) * 100).toFixed(2) + "%";
      }
    }

    return {
      totalScanned,
      websiteStats,
      anomalies,
      coveragePercentages: cvgPct,
      risks
    };
  }
};
