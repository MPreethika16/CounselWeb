// server/middleware/cache.js
import NodeCache from "node-cache";
import crypto from "crypto";

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? "300", 10); // 5 min default
const CACHE_MAX_KEYS = parseInt(process.env.CACHE_MAX_KEYS ?? "500", 10);

const cache = new NodeCache({ stdTTL: CACHE_TTL, maxKeys: CACHE_MAX_KEYS, useClones: false });

// Metrics
let hits = 0;
let misses = 0;

/**
 * Produces a stable SHA-256 cache key from the combination of:
 *   - request body (weights)
 *   - filter query params (minimumMatchScore, minimumTrustScore, minimumRankingScore)
 *   - sort params (sortBy, sortOrder)
 *   - pagination params (page, limit)
 */
export function buildCacheKey(body, query) {
  const { minimumMatchScore = 0, minimumTrustScore = 0, minimumRankingScore = 0,
          sortBy = "matchScore", sortOrder = "desc", page = "1", limit = "20" } = query;
  const payload = {
    weights: body,
    filters: { minimumMatchScore, minimumTrustScore, minimumRankingScore },
    sort: { sortBy, sortOrder },
    pagination: { page, limit },
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** Retrieve a cached value. Returns undefined on miss. */
export function getCache(key) {
  const value = cache.get(key);
  if (value !== undefined) {
    hits++;
    return value;
  }
  misses++;
  return undefined;
}

/** Store a value in cache. */
export function setCache(key, value) {
  cache.set(key, value);
}

/** Return current cache statistics. */
export function getCacheStats() {
  const total = hits + misses;
  return {
    hits,
    misses,
    size: cache.keys().length,
    hitRate: total > 0 ? Number(((hits / total) * 100).toFixed(2)) : 0,
  };
}
