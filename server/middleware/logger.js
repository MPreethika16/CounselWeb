// server/middleware/logger.js
import pino from "pino";
import crypto from "crypto";
import { recordRequest } from "../services/monitoringService.js";

const transport = pino.transport({
  targets: [
    {
      target: "pino/file",
      options: { destination: "logs/server.log", mkdir: true },
    },
    {
      target: "pino-pretty",
      options: { colorize: true },
    },
  ],
});

const logger = pino({ level: "info" }, transport);

/**
 * Express request logging middleware.
 * Attaches requestId to req and logs structured request/response details.
 */
export function requestLogger(req, res, next) {
  req.requestId = crypto.randomUUID();
  req.startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const executionTimeMs = Number(process.hrtime.bigint() - req.startTime) / 1_000_000;
    logger.info({
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      executionTimeMs: Math.round(executionTimeMs * 100) / 100,
      cacheStatus: req.cacheStatus ?? "n/a",
      filterParams: {
        minimumMatchScore: req.query.minimumMatchScore,
        minimumTrustScore: req.query.minimumTrustScore,
        minimumRankingScore: req.query.minimumRankingScore,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
      },
      paginationParams: {
        page: req.query.page,
        limit: req.query.limit,
      },
    });

    if (req.originalUrl.includes("/api/match")) {
      const isError = res.statusCode >= 400 && res.statusCode !== 429;
      recordRequest(executionTimeMs, isError);
    }
  });

  next();
}

export default logger;
