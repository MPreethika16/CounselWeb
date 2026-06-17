import mongoose from "mongoose";

/**
 * Tracks and logs slow queries in Mongoose.
 */
class QueryProfilerService {
  constructor() {
    this.slowQueries = [];
    this.thresholdMs = 100; // Log queries taking longer than 100ms
  }

  /**
   * Wrapper to profile a specific promise execution.
   */
  async profile(queryName, promise) {
    const start = process.hrtime.bigint();
    try {
      const result = await promise;
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;

      if (durationMs > this.thresholdMs) {
        this.logSlowQuery(queryName, durationMs);
      }
      return result;
    } catch (error) {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      this.logSlowQuery(`[FAILED] ${queryName}`, durationMs);
      throw error;
    }
  }

  logSlowQuery(name, durationMs) {
    const log = { name, durationMs: Math.round(durationMs), timestamp: new Date() };
    this.slowQueries.push(log);
    // Keep max 100 logs in memory
    if (this.slowQueries.length > 100) this.slowQueries.shift();
    console.warn(`[SLOW QUERY] ${name} took ${log.durationMs}ms`);
  }

  getSlowQueries() {
    return this.slowQueries;
  }
}

export const queryProfiler = new QueryProfilerService();
