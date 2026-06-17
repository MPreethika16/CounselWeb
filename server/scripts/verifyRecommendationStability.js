import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function verifyReports() {
  const outputDir = path.join(__dirname, '../..');
  
  const stabilityReport = JSON.parse(fs.readFileSync(path.join(outputDir, 'recommendation-stability-report.json'), 'utf-8'));
  const rankDeltas = JSON.parse(fs.readFileSync(path.join(outputDir, 'rank-delta-report.json'), 'utf-8'));
  const scoreDeltas = JSON.parse(fs.readFileSync(path.join(outputDir, 'score-delta-report.json'), 'utf-8'));
  const newlySurfaced = JSON.parse(fs.readFileSync(path.join(outputDir, 'newly-surfaced-colleges.json'), 'utf-8'));
  const filtered = JSON.parse(fs.readFileSync(path.join(outputDir, 'filtered-colleges.json'), 'utf-8'));
  const remediationImpact = JSON.parse(fs.readFileSync(path.join(outputDir, 'remediation-impact-summary.json'), 'utf-8'));

  const verification = {
    rankDeltaAnalysis: "FAIL",
    scoreDeltaAnalysis: "FAIL",
    newCollegeDetection: "FAIL",
    filteredCollegeDetection: "FAIL",
    rootCauseAttribution: "FAIL",
    integrityVerdict: "FAIL"
  };

  // Verify rank deltas
  const hasValidRankDeltas = rankDeltas.every(d => d.rankDelta === d.oldRank - d.newRank && d.classification);
  if (hasValidRankDeltas) verification.rankDeltaAnalysis = "PASS";

  // Verify score deltas
  const hasValidScoreDeltas = scoreDeltas.deltas.every(d => Math.abs(d.scoreDelta - (d.newScore - d.oldScore)) < 0.001);
  if (hasValidScoreDeltas && typeof scoreDeltas.aggregations.averageScoreChange === 'number') verification.scoreDeltaAnalysis = "PASS";

  // Verify newly surfaced
  const validNewColleges = newlySurfaced.every(d => d.oldRank === null && d.newRank > 0 && d.reason === 'RECOVERED_DATA');
  if (validNewColleges || newlySurfaced.length === 0) verification.newCollegeDetection = "PASS";

  // Verify filtered colleges
  const validFiltered = filtered.every(d => d.reason);
  if (validFiltered || filtered.length === 0) verification.filteredCollegeDetection = "PASS";

  // Verify attributions
  const allowedCauses = ['WEBSITE_RECOVERY', 'NAAC_RECOVERY', 'RANKING_RECOVERY', 'FEES_RECOVERY', 'PLACEMENT_RECOVERY', 'MULTIPLE_FACTORS'];
  const validAttributions = remediationImpact.attributions.every(d => allowedCauses.includes(d.rootCause));
  if (validAttributions) verification.rootCauseAttribution = "PASS";

  // Verify Integrity Verdict matches metrics
  const m = remediationImpact.metrics;
  let expectedVerdict = 'WARNING';
  if (m.stableRecommendationsPercent >= 90 && m.majorRankChangesPercent < 2) expectedVerdict = 'PASS';
  if (m.stableRecommendationsPercent < 75 || m.majorRankChangesPercent > 10) expectedVerdict = 'FAIL';
  
  if (stabilityReport.top1000.verdict === expectedVerdict) verification.integrityVerdict = "PASS";

  console.log(JSON.stringify(verification, null, 2));
}

verifyReports();
