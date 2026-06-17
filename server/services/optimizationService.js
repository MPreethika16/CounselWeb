import { globalCache } from "./cacheService.js";
import { queryProfiler } from "./queryProfilerService.js";

export function getSystemHealth() {
  const memoryUsage = process.memoryUsage();
  
  return {
    status: "healthy",
    memory: {
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      externalMB: Math.round(memoryUsage.external / 1024 / 1024)
    },
    cache: globalCache.getStats(),
    slowQueries: queryProfiler.getSlowQueries().length
  };
}
