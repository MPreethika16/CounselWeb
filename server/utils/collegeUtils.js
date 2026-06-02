import College from "../models/College.js";

let cachedHas2025 = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60000; // 1 minute TTL

export async function checkHas2025() {
  const now = Date.now();
  if (cachedHas2025 !== null && now < cacheExpiry) {
    return cachedHas2025;
  }
  const exists = await College.exists({ year: 2025 });
  cachedHas2025 = !!exists;
  cacheExpiry = now + CACHE_TTL_MS;
  return cachedHas2025;
}

export async function resolveSelectedYear(rawYear) {
  let year = 2025;
  if (rawYear !== undefined && rawYear !== null && rawYear !== "") {
    const parsed = Number(rawYear);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      year = parsed;
    } else {
      // Treat invalid years as NaN, defaulting to 2025 (which then falls back to 2024 if 2025 has no data)
      year = 2025;
    }
  }

  const has2025 = await checkHas2025();
  if (year === 2025 && !has2025) {
    return 2024;
  }
  return [2024, 2025].includes(year) ? year : 2025;
}
