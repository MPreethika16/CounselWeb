// server/services/scraperFailureService.js

/**
 * Calculates scraper failure intelligence for a given scraper type.
 * Processes failed runs to extract:
 *  - timeout rate, dns failures, parse failures, blocked pages
 *  - top failing colleges
 */

export function calculateScraperFailures(scraperName, failedRuns) {
  if (!failedRuns || failedRuns.length === 0) {
    return {
      scraperName,
      totalFailures: 0,
      reasons: {
        timeout: { count: 0, percentage: 0 },
        dns: { count: 0, percentage: 0 },
        parse: { count: 0, percentage: 0 },
        blocked: { count: 0, percentage: 0 },
        other: { count: 0, percentage: 0 }
      },
      topFailingColleges: []
    };
  }

  const totalFailures = failedRuns.length;
  const reasonCounts = { timeout: 0, dns: 0, parse: 0, blocked: 0, other: 0 };
  const collegeFailures = {};

  for (const run of failedRuns) {
    // Tally reasons
    const reason = (run.failureReason || "").toLowerCase();
    if (reason.includes("timeout")) {
      reasonCounts.timeout++;
    } else if (reason.includes("dns") || reason.includes("enotfound")) {
      reasonCounts.dns++;
    } else if (reason.includes("parse") || reason.includes("syntax")) {
      reasonCounts.parse++;
    } else if (reason.includes("blocked") || run.statusCode === 403 || run.statusCode === 429) {
      reasonCounts.blocked++;
    } else {
      reasonCounts.other++;
    }

    // Tally colleges
    const code = run.collegeCode || "UNKNOWN";
    if (!collegeFailures[code]) {
      collegeFailures[code] = 0;
    }
    collegeFailures[code]++;
  }

  // Calculate percentages
  const reasons = {};
  for (const [key, count] of Object.entries(reasonCounts)) {
    reasons[key] = {
      count,
      percentage: Math.round((count / totalFailures) * 100)
    };
  }

  // Top failing colleges (sort desc by count, limit 5)
  const topFailingColleges = Object.entries(collegeFailures)
    .map(([collegeCode, count]) => ({ collegeCode, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    scraperName,
    totalFailures,
    reasons,
    topFailingColleges
  };
}
