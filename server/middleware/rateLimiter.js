// server/middleware/rateLimiter.js
import rateLimit from "express-rate-limit";
import { recordRateLimit } from "../services/monitoringService.js";

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10); // 1 min
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? "60", 10);

const rateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
    retryAfterMs: WINDOW_MS,
  },
  handler(req, res, next, options) {
    // Abuse logging
    console.warn(
      JSON.stringify({
        event: "rate_limit_exceeded",
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString(),
      })
    );
    recordRateLimit();
    res.status(options.statusCode).json(options.message);
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith("/health");
  },
});

export default rateLimiter;
