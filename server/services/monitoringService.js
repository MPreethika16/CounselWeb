import { globalCache } from "./cacheService.js";
import { queryProfiler } from "./queryProfilerService.js";

const metrics = {
  requestCount: 0,
  errorCount: 0,
  startTime: Date.now()
};

export function trackRequest() {
  metrics.requestCount++;
}

export function trackError() {
  metrics.errorCount++;
}

export function getMetrics() {
  const memoryUsage = process.memoryUsage();
  return {
    uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
    traffic: {
      requests: metrics.requestCount,
      errors: metrics.errorCount,
      errorRate: metrics.requestCount > 0 ? (metrics.errorCount / metrics.requestCount).toFixed(4) : 0
    },
    performance: {
      slowQueries: queryProfiler.getSlowQueries().length,
      cacheHitRate: globalCache.getStats().hitRate
    },
    memory: {
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024)
    }
  };
}
