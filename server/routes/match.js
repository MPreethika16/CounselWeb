// server/routes/match.js
import express from "express";
import { matchStudentPreferences } from "../services/recommendationMatchingService.js";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { API_VERSION } from "../config/apiVersion.js";
import { validateResponse } from "../utils/validation.js";
import schema from "../schemas/recommendationResponseSchema.json" with { type: "json" };
import { buildCacheKey, getCache, setCache } from "../middleware/cache.js";
import rateLimiter from "../middleware/rateLimiter.js";

const router = express.Router();

/** Simple payload validator for weight object */
function validatePayload(body) {
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push({ field: "payload", message: "Payload must be a JSON object" });
    return { valid: false, errors };
  }
  const weightKeys = [
    "academicsWeight",
    "placementsWeight",
    "infrastructureWeight",
    "trustWeight",
    "affordabilityWeight",
    "locationWeight",
  ];
  const provided = weightKeys.filter((k) => k in body);
  if (provided.length === 0) {
    errors.push({ field: "payload", message: "At least one weight must be provided" });
  }
  let sum = 0;
  for (const key of provided) {
    const val = body[key];
    if (typeof val !== "number" || isNaN(val)) {
      errors.push({ field: key, message: "Weight must be a numeric value" });
    } else if (val < 0) {
      errors.push({ field: key, message: "Weight cannot be negative" });
    } else {
      sum += val;
    }
  }
  if (sum === 0) {
    errors.push({ field: "payload", message: "All provided weights sum to zero" });
  }
  return { valid: errors.length === 0, errors };
}

/** Helper: parse integer query param with defaults */
function parseIntParam(value, defaultValue, min = 1, max = Infinity) {
  const num = parseInt(value, 10);
  if (isNaN(num)) return defaultValue;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

// Apply rate limiter to all routes in this router
router.use(rateLimiter);

router.post("/", async (req, res) => {
  // ----- Payload validation -----
  const { valid, errors } = validatePayload(req.body);
  if (!valid) {
    return res.status(400).json({ success: false, errors });
  }

  // ----- Query parameters -----
  const {
    minimumMatchScore = 0,
    minimumTrustScore = 0,
    minimumRankingScore = 0,
    sortBy = "matchScore",
    sortOrder = "desc",
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = parseIntParam(page, 1, 1);
  const limitNum = parseIntParam(limit, 20, 1, 100);

  // ----- Cache lookup -----
  const cacheKey = buildCacheKey(req.body, req.query);
  const cached = getCache(cacheKey);
  if (cached) {
    req.cacheStatus = "hit";
    return res.json(cached);
  }
  req.cacheStatus = "miss";

  // ----- Core matching -----
  let matches = await matchStudentPreferences(req.body);

  // ----- Warning normalization & deduplication -----
  matches = matches.map((item) => {
    const warnings = Array.isArray(item.explanation?.warnings)
      ? [...new Set(item.explanation.warnings)]
      : [];
    return { ...item, warnings };
  });

  // ----- Filtering -----
  matches = matches.filter((m) => {
    const passMatch = m.matchScore >= Number(minimumMatchScore);
    const passTrust = (m.trustScore ?? 0) >= Number(minimumTrustScore);
    const passRanking = (m.rankingScore ?? 0) >= Number(minimumRankingScore);
    return passMatch && passTrust && passRanking;
  });

  // ----- Sorting (deterministic) -----
  const asc = sortOrder.toLowerCase() === "asc";
  matches.sort((a, b) => {
    if (a.matchScore !== b.matchScore) {
      return asc ? a.matchScore - b.matchScore : b.matchScore - a.matchScore;
    }
    const aRank = a.rankingScore ?? 0;
    const bRank = b.rankingScore ?? 0;
    if (aRank !== bRank) {
      return asc ? aRank - bRank : bRank - aRank;
    }
    // Tertiary tie-break: collegeCode ASC always
    return a.collegeCode - b.collegeCode;
  });

  // ----- Pagination -----
  const totalItems = matches.length;
  const totalPages = Math.ceil(totalItems / limitNum) || 1;
  const startIdx = (pageNum - 1) * limitNum;
  const paged = matches.slice(startIdx, startIdx + limitNum);

  const responsePayload = {
    version: API_VERSION,
    generatedAt: new Date().toISOString(),
    meta: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
    data: paged,
  };

  // ----- Schema validation -----
  try {
    validateResponse(schema, responsePayload);
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, details: e.details });
  }

  // ----- Cache store -----
  setCache(cacheKey, responsePayload);

  // ----- Reporting -----
  try {
    mkdirSync(path.resolve("reports"), { recursive: true });
    writeFileSync(
      path.resolve("reports", "student-match-report.json"),
      JSON.stringify(responsePayload, null, 2)
    );
  } catch (_) {
    // Non-fatal – don't fail the request if write fails
  }

  return res.json(responsePayload);
});

export default router;
