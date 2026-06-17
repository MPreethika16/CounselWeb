import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import recommendationStabilityService from '../services/recommendationStabilityService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate mock data to simulate recommendation snapshots.
 * @param {number} count 
 */
function generateMockSnapshots(count) {
  const oldSnapshot = [];
  const newSnapshot = [];

  for (let i = 1; i <= count; i++) {
    const collegeCode = `COLLEGE_${String(i).padStart(4, '0')}`;
    const collegeName = `Institute of Technology ${i}`;
    
    const baseScore = Math.random() * 100;
    const baseRank = i; // simple ranking for mock

    oldSnapshot.push({
      collegeCode,
      collegeName,
      rank: baseRank,
      score: baseScore,
      confidenceScore: Math.random()
    });

    // Simulate new snapshot with some stability and some changes
    // 90% stable, 10% some shift
    const isStable = Math.random() < 0.90;
    let rankShift = 0;
    let scoreShift = 0;

    if (!isStable) {
      rankShift = Math.floor(Math.random() * 60) - 20; // -20 to +40 rank shift
      scoreShift = Math.random() * 20 - 5; // -5 to +15 score shift
    } else {
      rankShift = Math.floor(Math.random() * 5) - 2; // -2 to +2 rank shift
      scoreShift = Math.random() * 2 - 1; // minor score shift
    }

    // Sometimes simulate filtered (drop 2% of colleges)
    const isFiltered = Math.random() < 0.02;

    if (!isFiltered) {
      newSnapshot.push({
        collegeCode,
        collegeName,
        rank: Math.max(1, baseRank + rankShift),
        score: Math.max(0, baseScore + scoreShift),
        confidenceScore: Math.random() // new confidence score
      });
    }
  }

  // Simulate newly surfaced colleges (add 30 new colleges)
  for (let i = 1; i <= 30; i++) {
    newSnapshot.push({
      collegeCode: `NEW_COLLEGE_${i}`,
      collegeName: `Newly Surfaced Institute ${i}`,
      rank: Math.floor(Math.random() * 500) + 1, // place somewhere in top 500
      score: 70 + Math.random() * 20,
      confidenceScore: 0.8 + Math.random() * 0.2
    });
  }

  // Re-sort the snapshots by rank to be realistic
  oldSnapshot.sort((a, b) => a.rank - b.rank);
  newSnapshot.sort((a, b) => a.rank - b.rank);

  // Fix ranks to be sequential after sorting
  oldSnapshot.forEach((c, idx) => c.rank = idx + 1);
  newSnapshot.forEach((c, idx) => c.rank = idx + 1);

  return { oldSnapshot, newSnapshot };
}

async function runAudit() {
  console.log('Generating recommendation snapshots...');
  const { oldSnapshot, newSnapshot } = generateMockSnapshots(1000); // Top 1000

  // We could slice this for Top 100, 500, 1000 but we'll do the full 1000 and pass TopN
  const top1000Audit = recommendationStabilityService.runFullAudit(oldSnapshot, newSnapshot, 1000);
  const top500Audit = recommendationStabilityService.runFullAudit(
    oldSnapshot.filter(r => r.rank <= 500), 
    newSnapshot.filter(r => r.rank <= 500), 
    500
  );
  const top100Audit = recommendationStabilityService.runFullAudit(
    oldSnapshot.filter(r => r.rank <= 100), 
    newSnapshot.filter(r => r.rank <= 100), 
    100
  );

  console.log('Analysis complete. Generating JSON reports...');

  const outputDir = path.join(__dirname, '../..');

  // Outputs based on Top 1000 for comprehensive reports
  fs.writeFileSync(path.join(outputDir, 'rank-delta-report.json'), JSON.stringify(top1000Audit.rankDeltas, null, 2));
  fs.writeFileSync(path.join(outputDir, 'score-delta-report.json'), JSON.stringify(top1000Audit.scoreAnalysis, null, 2));
  fs.writeFileSync(path.join(outputDir, 'newly-surfaced-colleges.json'), JSON.stringify(top1000Audit.newlySurfaced, null, 2));
  fs.writeFileSync(path.join(outputDir, 'filtered-colleges.json'), JSON.stringify(top1000Audit.filtered, null, 2));
  
  const remediationImpactSummary = {
    attributions: top1000Audit.attributions,
    metrics: top1000Audit.metrics
  };
  fs.writeFileSync(path.join(outputDir, 'remediation-impact-summary.json'), JSON.stringify(remediationImpactSummary, null, 2));

  const stabilityReport = {
    top100: { metrics: top100Audit.metrics, verdict: top100Audit.verdict },
    top500: { metrics: top500Audit.metrics, verdict: top500Audit.verdict },
    top1000: { metrics: top1000Audit.metrics, verdict: top1000Audit.verdict },
    overallVerdict: top1000Audit.verdict
  };
  fs.writeFileSync(path.join(outputDir, 'recommendation-stability-report.json'), JSON.stringify(stabilityReport, null, 2));

  console.log('Reports generated successfully.');
  console.log(`Overall Verdict: ${top1000Audit.verdict}`);
}

runAudit().catch(console.error);
