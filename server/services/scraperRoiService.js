// server/services/scraperRoiService.js

/**
 * Calculates scraper ROI intelligence dynamically.
 * Correlates total costs against records produced to establish cost-per-record and final ROI scores.
 */

export function calculateScraperRoi(config) {
  if (!config) return null;

  const totalCostUsd = config.totalCostUsd || 0;
  const recordsProduced = config.recordsProduced || 0;
  const successRate = config.successRate || 0;

  // Cost per record
  let costPerRecord = 0;
  if (recordsProduced > 0) {
    costPerRecord = totalCostUsd / recordsProduced;
  } else if (totalCostUsd > 0) {
    // If costs exist but 0 records, the cost per record is effectively infinite, but we'll cap it or just output the total cost.
    costPerRecord = totalCostUsd;
  }

  // ROI Score Heuristic:
  // We want to reward high successRate and high recordsProduced, and penalize high costPerRecord.
  // Base score 100.
  // If costPerRecord > $0.10, subtract points.
  // If costPerRecord < $0.01, add points.
  // Scale with success rate.
  let roiScore = successRate; // Start with success rate (max 100)
  
  if (recordsProduced === 0 && totalCostUsd > 0) {
    roiScore = 0; // Worst possible ROI
  } else if (recordsProduced > 0) {
    if (costPerRecord <= 0.001) {
      roiScore += 20;
    } else if (costPerRecord > 0.05) {
      roiScore -= (costPerRecord * 100); // Penalty
    }
  }

  // Ensure bounds
  if (roiScore < 0) roiScore = 0;
  if (roiScore > 100) roiScore = 100;

  return {
    scraperName: config.scraperName,
    scrapeCost: Number(totalCostUsd.toFixed(4)),
    recordsProduced,
    successRate,
    costPerRecord: Number(costPerRecord.toFixed(4)),
    roiScore: Math.round(roiScore)
  };
}
