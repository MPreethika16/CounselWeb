import { getPersonalizedRecommendations } from "./personalizationService.js";
import { getOverviewDashboard } from "./dashboardService.js";

/**
 * Validates data consistency across boundaries.
 */
export async function validateDataConsistency(userId) {
  let isConsistent = true;
  const reasons = [];

  // 1. Recommendation vs Personalization boundaries
  const recs = await getPersonalizedRecommendations(userId, {});
  if (recs.data) {
    for (const c of recs.data) {
      if (c.overallScore < 0 || c.overallScore > 100) {
        isConsistent = false;
        reasons.push(`College ${c.collegeCode} overallScore out of bounds`);
      }
      if (c.personalizedScore < 0 || c.personalizedScore > 100) {
        isConsistent = false;
        reasons.push(`College ${c.collegeCode} personalizedScore out of bounds`);
      }
    }
  }

  // 2. Dashboard consistency
  const dash = await getOverviewDashboard();
  if (dash.overallCoverage < 0 || dash.overallCoverage > 100) {
    isConsistent = false;
    reasons.push("Dashboard overall coverage out of bounds");
  }

  return { isConsistent, reasons };
}

export function validateApiContract(responseObject) {
  if (!responseObject.hasOwnProperty("success")) return false;
  if (!responseObject.hasOwnProperty("data") && !responseObject.hasOwnProperty("colleges")) return false;
  return true;
}
