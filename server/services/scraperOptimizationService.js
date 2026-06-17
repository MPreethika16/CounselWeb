// server/services/scraperOptimizationService.js

/**
 * Calculates scraper optimization intelligence dynamically.
 * Correlates boolean flags into integer bounds natively generating structured textual opportunities successfully.
 */

export function calculateScraperOptimization(config) {
  if (!config) return null;

  let recommendationScore = 0;
  const optimizationOpportunities = [];

  // Slow: heavily penalized (we want things fast)
  if (config.isSlow) {
    recommendationScore += 30;
    optimizationOpportunities.push("Reduce execution timeouts or optimize network limits.");
  }

  // High Cost: deeply penalized 
  if (config.isHighCost) {
    recommendationScore += 30;
    optimizationOpportunities.push("Audit memory leaks and lower concurrent bandwidth usage.");
  }

  // Low ROI: strictly penalized
  if (config.isLowRoi) {
    recommendationScore += 40;
    optimizationOpportunities.push("Review selection logic - the scraper is failing too frequently to justify the cost.");
  }

  // Apply manual offset from engineering directly
  recommendationScore += (config.manualPriorityOffset || 0);

  // Bounds
  if (recommendationScore < 0) recommendationScore = 0;
  if (recommendationScore > 100) recommendationScore = 100;

  // Generate ranking weight directly based on score natively.
  // We'll use the score itself as the sorting key in the router.
  return {
    scraperName: config.scraperName,
    flags: {
      isSlow: config.isSlow || false,
      isHighCost: config.isHighCost || false,
      isLowRoi: config.isLowRoi || false
    },
    optimizationOpportunities,
    recommendationScore: Math.round(recommendationScore)
  };
}
