// server/services/freshnessService.js

/**
 * Calculate data freshness score based on the most recent scrape or verification date.
 * 
 * Score ranges from 0 to 100.
 * Decay logic: Linearly degrades over 180 days.
 * 0 days old = 100
 * 180+ days old = 0
 * 
 * Classification bounds:
 * >= 80: FRESH
 * >= 50: AGING
 * >= 20: STALE
 * < 20: CRITICAL
 * 
 * @param {Date|null} lastScrapedAt 
 * @param {Date|null} lastVerifiedAt 
 * @returns {Object} { score: Number, classification: String }
 */
export function calculateFreshness(lastScrapedAt, lastVerifiedAt) {
  // If no scrape date or invalid, it's instantly critical
  if (!lastScrapedAt || isNaN(new Date(lastScrapedAt).getTime())) {
    return { score: 0, classification: "CRITICAL" };
  }

  const now = new Date();
  
  // Use the most recent of the two dates
  let mostRecentDate = null;
  if (lastVerifiedAt && !isNaN(new Date(lastVerifiedAt).getTime())) {
    mostRecentDate = new Date(Math.max(new Date(lastVerifiedAt).getTime(), new Date(lastScrapedAt).getTime()));
  } else {
    mostRecentDate = new Date(lastScrapedAt);
  }

  // Use UTC milliseconds for timezone independent decay calculation
  const nowMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
  const dateMs = Date.UTC(mostRecentDate.getUTCFullYear(), mostRecentDate.getUTCMonth(), mostRecentDate.getUTCDate(), mostRecentDate.getUTCHours(), mostRecentDate.getUTCMinutes(), mostRecentDate.getUTCSeconds());
  
  const daysOld = Math.max(0, (nowMs - dateMs) / (1000 * 60 * 60 * 24));

  // Linear decay over 180 days
  let score = 100 - (daysOld * (100 / 180));
  score = Math.max(0, Math.min(100, Math.round(score)));

  let classification = "CRITICAL";
  if (score >= 80) {
    classification = "FRESH";
  } else if (score >= 50) {
    classification = "AGING";
  } else if (score >= 20) {
    classification = "STALE";
  }

  return { score, classification };
}
