import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { computeRanking, computeBaseScore, computeAcademicScore, computeInfrastructureScore, computePlacementScore } from '../services/rankingEngineService.js';

// Adjust the connection string as per existing env (example uses default localhost)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/counselweb';

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const College = mongoose.model('College', new mongoose.Schema({}, { strict: false }), 'colleges'); // collection name assumed

  const colleges = await College.find({});
  const hardeningReport = [];
  const verificationReport = { total: colleges.length, passed: 0, failed: 0, failures: [] };

  for (const college of colleges) {
    const ranking = computeRanking(college);
    const { overallScore, explanation } = ranking;

    // 0‑100 check
    const scoreInRange = overallScore >= 0 && overallScore <= 100;

    // deterministic ordering – recompute and compare
    const recomputed = computeRanking(college);
    const deterministic = recomputed.overallScore === overallScore;

    // Modifiers check – recompute expected value
    const base = computeBaseScore(college);
    const trustScore = college.officialData?.trustScore?.score ?? 0;
    let trustMod = 1.0;
    if (trustScore >= 90) trustMod = 1.05;
    else if (trustScore >= 75) trustMod = 1.02;
    else if (trustScore < 50) trustMod = 0.90;
    const completenessScore = college.officialData?.profileCompleteness?.score ?? 0;
    let compMod = 1.0;
    if (completenessScore >= 90) compMod = 1.03;
    else if (completenessScore < 60) compMod = 0.95;
    const health = college.officialWebsite?.health?.status ?? 'healthy';
    const penalty = health === 'warning' ? 5 : health === 'critical' ? 15 : 0;
    const expected = Math.min(100, Math.max(0, Math.round(base * trustMod * compMod) - penalty);
    const modifiersCorrect = expected === overallScore;

    // website penalty presence for critical sites
    const criticalPenaltyApplied = health === 'critical' ? explanation.websitePenaltyApplied === '-15' : true;

    // explanation populated
    const explanationPopulated = explanation &&
      typeof explanation.academicContribution === 'number' &&
      typeof explanation.infrastructureContribution === 'number' &&
      typeof explanation.placementContribution === 'number' &&
      typeof explanation.trustModifierApplied === 'string' &&
      typeof explanation.completenessModifierApplied === 'string' &&
      typeof explanation.websitePenaltyApplied === 'string';

    const allPass = scoreInRange && deterministic && modifiersCorrect && criticalPenaltyApplied && explanationPopulated;
    if (allPass) verificationReport.passed++;
    else {
      verificationReport.failed++;
      verificationReport.failures.push({ collegeId: college._id, issues: { scoreInRange, deterministic, modifiersCorrect, criticalPenaltyApplied, explanationPopulated } });
    }

    hardeningReport.push({ collegeId: college._id, baseScore: base, overallScore, explanation });
  }

  // Ensure reports directory exists
  const reportsDir = path.resolve('reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

  fs.writeFileSync(path.join(reportsDir, 'college-ranking-hardening-report.json'), JSON.stringify(hardeningReport, null, 2));
  fs.writeFileSync(path.join(reportsDir, 'college-ranking-hardening-verification.json'), JSON.stringify(verificationReport, null, 2));

  console.log('Verification completed. Reports written to ./reports');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
