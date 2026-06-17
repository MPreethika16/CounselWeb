/*
 * scoreUtils.js – helper utilities for recommendation matching scoring
 * Provides functions to normalize user‑provided weight objects, clamp scores to a range,
 * and apply a factor weight to a numeric value.
 */

/**
 * Normalize a weights object so that all values sum to 1.
 * Missing or non‑numeric entries default to 0.
 * If the total sum is 0, returns an object with equal weights.
 *
 * @param {Object} weights - e.g. { academicStrength: 3, placementStrength: 1 }
 * @returns {Object} normalized weights with the same keys.
 */
export function normalizeWeights(weights) {
  const result = {};
  let total = 0;
  for (const key in weights) {
    const value = Number(weights[key]);
    const val = isNaN(value) ? 0 : value;
    result[key] = val;
    total += val;
  }
  if (total === 0) {
    const keys = Object.keys(result);
    const equal = keys.length ? 1 / keys.length : 0;
    keys.forEach((k) => (result[k] = equal));
    return result;
  }
  for (const key in result) {
    result[key] = result[key] / total;
  }
  return result;
}

/**
 * Clamp a numeric score to the inclusive range [0, 100].
 * Guarantees the score is a finite number.
 *
 * @param {number} score
 * @returns {number}
 */
export function clampScore(score) {
  let s = Number(score);
  if (!isFinite(s) || isNaN(s)) s = 0;
  if (s < 0) return 0;
  if (s > 100) return 100;
  return s;
}

/**
 * Apply a factor weight to a raw value.
 * Multiplying the raw value (0‑100) by the normalized weight (0‑1) and returning a
 * clamped contribution.
 *
 * @param {number} rawValue – the factor's raw score (0‑100)
 * @param {number} weight – the normalized weight (0‑1)
 * @returns {number}
 */
export function applyFactor(rawValue, weight) {
  return clampScore(rawValue * weight);
}

export default {
  normalizeWeights,
  clampScore,
  applyFactor,
};
