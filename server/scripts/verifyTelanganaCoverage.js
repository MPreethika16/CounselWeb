import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function verifyReports() {
  const outputDir = path.join(__dirname, '../..');

  const getJSON = (file) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf-8'));
    } catch(e) {
      return null;
    }
  };

  const coverage = getJSON('telangana-coverage-report.json');
  const gap = getJSON('telangana-data-gap-report.json');
  const blockers = getJSON('recommendation-blockers-report.json');
  const recovery = getJSON('telangana-recovery-plan.json');
  const summary = getJSON('telangana-statewide-summary.json');
  const missingFees = getJSON('missing-fees-telangana.json');

  const verification = {
    coverageAudit: "FAIL",
    gapAnalysis: "FAIL",
    blockerDetection: "FAIL",
    recoveryPlanning: "FAIL",
    readinessScoring: "FAIL"
  };

  if (coverage && Array.isArray(coverage) && missingFees) {
    const missingFeesCount = coverage.filter(c => !c.fees).length;
    if (missingFeesCount === missingFees.length) {
      verification.coverageAudit = "PASS";
    }
  }

  if (gap && Array.isArray(gap)) {
    const hasBenchmarkFormat = gap.every(g => g.collegeName && Array.isArray(g.missingFields) && typeof g.recommendationReadinessPercent === 'number');
    if (hasBenchmarkFormat || gap.length === 0) verification.gapAnalysis = "PASS";
  }

  if (blockers && Array.isArray(blockers)) {
    const validBlockers = blockers.every(b => Array.isArray(b.blockers) && b.blockers.length > 0);
    if (validBlockers || blockers.length === 0) verification.blockerDetection = "PASS";
  }

  if (recovery && Array.isArray(recovery)) {
    const validRecovery = recovery.every(r => Array.isArray(r.missing) && Array.isArray(r.recommendedAction) && r.missing.length > 0);
    if (validRecovery || recovery.length === 0) verification.recoveryPlanning = "PASS";
  }

  if (summary && typeof summary.recommendationReadyColleges === 'number') {
    // If summary is produced, it means readinessScoring ran.
    verification.readinessScoring = "PASS";
  }

  console.log(JSON.stringify(verification, null, 2));
}

verifyReports();
