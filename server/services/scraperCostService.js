// server/services/scraperCostService.js

/**
 * Calculates scraper cost intelligence dynamically using fixed pricing heuristics.
 * 
 * Financial Heuristics:
 * - Requests: $0.0001 per request
 * - Bandwidth: $0.01 per GB
 * - Storage: $0.05 per GB
 * - Compute: $0.02 per hour
 */

export function calculateScraperCost(config) {
  if (!config) {
    return null;
  }

  const GB = 1024 * 1024 * 1024;
  const HOUR_MS = 60 * 60 * 1000;

  const totalRequests = config.totalRequests || 0;
  const totalBandwidthBytes = config.totalBandwidthBytes || 0;
  const totalStorageBytes = config.totalStorageBytes || 0;
  const totalComputeTimeMs = config.totalComputeTimeMs || 0;

  // Convert resources
  const bandwidthGB = totalBandwidthBytes / GB;
  const storageGB = totalStorageBytes / GB;
  const computeHours = totalComputeTimeMs / HOUR_MS;

  // Apply heuristics
  const requestCost = totalRequests * 0.0001;
  const bandwidthCost = bandwidthGB * 0.01;
  const storageCost = storageGB * 0.05;
  const computeCost = computeHours * 0.02;

  const estimatedTotalCost = requestCost + bandwidthCost + storageCost + computeCost;

  return {
    scraperName: config.scraperName,
    resources: {
      requests: totalRequests,
      bandwidthGB: Number(bandwidthGB.toFixed(4)),
      storageGB: Number(storageGB.toFixed(4)),
      computeHours: Number(computeHours.toFixed(4))
    },
    costs: {
      requestCost: Number(requestCost.toFixed(4)),
      bandwidthCost: Number(bandwidthCost.toFixed(4)),
      storageCost: Number(storageCost.toFixed(4)),
      computeCost: Number(computeCost.toFixed(4)),
      estimatedTotalCost: Number(estimatedTotalCost.toFixed(4))
    }
  };
}
