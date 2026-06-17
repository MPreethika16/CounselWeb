import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAudit() {
  const outputDir = path.join(__dirname, '../..');
  const backlogPath = path.join(outputDir, 'phase-3.1-scraper-backlog.json');
  
  if (!fs.existsSync(backlogPath)) {
    console.error("Backlog file not found.");
    return;
  }
  
  const backlog = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
  console.log(`Loaded ${backlog.length} items from backlog.`);

  // Data structures
  const inventoryReport = {};
  const sourceImpactMap = {};
  const fieldImpactMap = {};
  
  // Track total unique colleges
  const allColleges = new Set();
  
  // Pass 1: Aggregation
  for (const item of backlog) {
    allColleges.add(item.collegeCode);

    // 1. Inventory Report Grouping
    const invKey = `${item.targetSource}|${item.field}|${item.reason}`;
    if (!inventoryReport[invKey]) {
      inventoryReport[invKey] = {
        targetSource: item.targetSource,
        field: item.field,
        failureReason: item.reason,
        count: 0
      };
    }
    inventoryReport[invKey].count++;

    // 2. Source Impact Grouping
    if (!sourceImpactMap[item.targetSource]) {
      sourceImpactMap[item.targetSource] = {
        source: item.targetSource,
        affectedCollegesSet: new Set(),
        missingFields: 0
      };
    }
    sourceImpactMap[item.targetSource].affectedCollegesSet.add(item.collegeCode);
    sourceImpactMap[item.targetSource].missingFields++;

    // 3. Field Impact Grouping
    if (!fieldImpactMap[item.field]) {
      fieldImpactMap[item.field] = {
        field: item.field,
        affectedCollegesSet: new Set()
      };
    }
    fieldImpactMap[item.field].affectedCollegesSet.add(item.collegeCode);
  }

  // Finalize Inventory Report
  const backlogInventoryReport = Object.values(inventoryReport).sort((a, b) => b.count - a.count);
  fs.writeFileSync(path.join(outputDir, 'backlog-inventory-report.json'), JSON.stringify(backlogInventoryReport, null, 2));

  // Finalize Source Impact Report
  const sourceImpactReport = Object.values(sourceImpactMap).map(s => ({
    source: s.source,
    affectedColleges: s.affectedCollegesSet.size,
    missingFields: s.missingFields,
    percentageOfBacklog: Number(((s.missingFields / backlog.length) * 100).toFixed(2))
  })).sort((a, b) => b.missingFields - a.missingFields);
  fs.writeFileSync(path.join(outputDir, 'source-impact-report.json'), JSON.stringify(sourceImpactReport, null, 2));

  // Finalize Recommendation Blocker Report
  const blockerSeverityLevel = (count, total) => {
    const ratio = count / total;
    if (ratio >= 0.8) return "CRITICAL";
    if (ratio >= 0.5) return "HIGH";
    if (ratio >= 0.2) return "MEDIUM";
    return "LOW";
  };
  
  const totalColleges = allColleges.size || 159;
  
  const recommendationBlockerReport = Object.values(fieldImpactMap).map(f => ({
    field: f.field,
    affectedColleges: f.affectedCollegesSet.size,
    blockerSeverity: blockerSeverityLevel(f.affectedCollegesSet.size, totalColleges)
  })).sort((a, b) => b.affectedColleges - a.affectedColleges);
  fs.writeFileSync(path.join(outputDir, 'recommendation-blocker-report.json'), JSON.stringify(recommendationBlockerReport, null, 2));

  // Finalize Recovery ROI Model
  const complexityMap = {
    "Official Website": "HIGH", // Custom DOM structures per site
    "AICTE/NAAC/NIRF": "MEDIUM", // Standardized but requires specific integration/PDF parsing
    "AICTE": "MEDIUM",
    "NAAC": "MEDIUM",
    "NIRF": "LOW", // Simple static lists
    "Search_Aggregation": "MEDIUM"
  };

  const recoveryRoiReport = sourceImpactReport.map(s => {
    let gainPotential = "LOW";
    if (s.affectedColleges > totalColleges * 0.7) gainPotential = "HIGH";
    else if (s.affectedColleges > totalColleges * 0.4) gainPotential = "MEDIUM";

    return {
      source: s.source,
      fieldsRecoverable: s.missingFields,
      affectedColleges: s.affectedColleges,
      recommendationGainPotential: gainPotential,
      implementationComplexity: complexityMap[s.source] || "MEDIUM"
    };
  });
  fs.writeFileSync(path.join(outputDir, 'recovery-roi-report.json'), JSON.stringify(recoveryRoiReport, null, 2));

  // Finalize Priority Plan
  // Priority: HIGH gain / LOW-MEDIUM complexity first.
  const scoreRoi = (roi) => {
    let score = 0;
    if (roi.recommendationGainPotential === "HIGH") score += 100;
    if (roi.recommendationGainPotential === "MEDIUM") score += 50;
    
    if (roi.implementationComplexity === "LOW") score += 50;
    if (roi.implementationComplexity === "MEDIUM") score += 25;
    
    return score + (roi.affectedColleges * 0.1); // Tie-breaker
  };
  
  const phase31PriorityPlan = [...recoveryRoiReport]
    .sort((a, b) => scoreRoi(b) - scoreRoi(a))
    .map((s, idx) => ({
      priority: idx + 1,
      source: s.source,
      reason: `Gain Potential: ${s.recommendationGainPotential}, Complexity: ${s.implementationComplexity}`
    }));
  fs.writeFileSync(path.join(outputDir, 'phase-3.1-priority-plan.json'), JSON.stringify(phase31PriorityPlan, null, 2));

  // Finalize Readiness Projection
  // If we recover everything in backlog, what happens? All backlog fields are fulfilled.
  // Currently, recommendationReady is 0 based on Phase 3.0 summary. 
  // If all backlog items (which represent missing data) are recovered, all 159 become ready.
  const readinessProjectionReport = {
    currentReadinessScore: 0,
    maxPotentialReadinessScore: 100,
    theoreticalReadyColleges: totalColleges,
    recommendedNextTarget: phase31PriorityPlan[0]?.source || "None"
  };
  fs.writeFileSync(path.join(outputDir, 'readiness-projection-report.json'), JSON.stringify(readinessProjectionReport, null, 2));

  // Summary Report
  const summaryReport = {
    totalBacklogSize: backlog.length,
    topMissingFields: recommendationBlockerReport.slice(0, 3).map(f => f.field),
    topAffectedSources: sourceImpactReport.slice(0, 2).map(s => s.source),
    highestRoiRecoveryPath: phase31PriorityPlan[0]?.source,
    expectedRecommendationReadinessGains: `Potential to unlock ${totalColleges} colleges`,
    executionOrder: phase31PriorityPlan.map(p => p.source)
  };
  fs.writeFileSync(path.join(outputDir, 'phase-3.0A-summary-report.json'), JSON.stringify(summaryReport, null, 2));

  console.log("Phase 3.0A Backlog Prioritization Analysis completed successfully.");
}

runAudit();
