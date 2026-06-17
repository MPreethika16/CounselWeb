// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";
import optionRoutes from "./routes/optionsRoutes.js";
import collegeRoutes from "./routes/collegeRoutes.js";
import predictRoutes from "./routes/predictRoutes.js";
import webOptionsRoutes from "./routes/webOptionsRoutes.js";
import institutionRoutes from "./routes/institutionRoutes.js";
import compareRoutes from "./routes/compareRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import savedOptionsRoutes from "./routes/savedOptionsRoutes.js";
import districtRoutes from "./routes/districtRoutes.js";
import matchRoutes from "./routes/match.js";
import healthRoutes from "./routes/healthRoutes.js";
import freshnessRoutes from "./routes/freshnessRoutes.js";
import coverageRoutes from "./routes/coverageRoutes.js";
import qualityRoutes from "./routes/qualityRoutes.js";
import scraperHealthRoutes from "./routes/scraperHealthRoutes.js";
import scraperExecutionRoutes from "./routes/scraperExecutionRoutes.js";
import scraperTrendRoutes from "./routes/scraperTrendRoutes.js";
import scraperFailureRoutes from "./routes/scraperFailureRoutes.js";
import scraperSourceRoutes from "./routes/scraperSourceRoutes.js";
import scraperCoverageRoutes from "./routes/scraperCoverageRoutes.js";
import scraperQueueRoutes from "./routes/scraperQueueRoutes.js";
import scraperSchedulerRoutes from "./routes/scraperSchedulerRoutes.js";
import scraperAlertRoutes from "./routes/scraperAlertRoutes.js";
import scraperSlaRoutes from "./routes/scraperSlaRoutes.js";
import scraperCapacityRoutes from "./routes/scraperCapacityRoutes.js";
import scraperCostRoutes from "./routes/scraperCostRoutes.js";
import scraperRoiRoutes from "./routes/scraperRoiRoutes.js";
import scraperOptimizationRoutes from "./routes/scraperOptimizationRoutes.js";
import scraperBenchmarkRoutes from "./routes/scraperBenchmarkRoutes.js";
import benchmarkDashboardRoutes from "./routes/benchmarkDashboardRoutes.js";
import benchmarkSnapshotRoutes from "./routes/benchmarkSnapshotRoutes.js";
import benchmarkForecastRoutes from "./routes/benchmarkForecastRoutes.js";
import forecastDashboardRoutes from "./routes/forecastDashboardRoutes.js";
import scraperOrchestrationRoutes from "./routes/scraperOrchestrationRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import personalizationRoutes from "./routes/personalizationRoutes.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";
import { requestLogger } from "./middleware/logger.js";
import { getCacheStats } from "./middleware/cache.js";
import { getMetrics } from "./services/monitoringService.js";
import mongoose from "mongoose";
import { gracefulShutdown } from "./services/scraperWorkerService.js";
import { cleanupLocks } from "./services/scraperLockService.js";

dotenv.config();

const app = express();

// Connect DB
connectDB();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Security Headers
app.use(helmet());

// Data Sanitization against NoSQL Query Injection
app.use(mongoSanitize());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." }
});
// Apply to all routes
app.use('/api/', limiter);

// Structured request logging
app.use(requestLogger);

// OpenAPI / Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Health endpoints
app.use("/health", healthRoutes);

// Legacy /api/health kept for backwards compatibility
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "CounselWise API is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/current-phase", (req, res) => {
  res.json({
    name: "Phase I: Web Options Selection",
    deadline: "2026-06-15T23:59:00.000Z"
  });
});

// Cache and monitoring metrics endpoint
app.get("/api/metrics", (req, res) => {
  res.json({ ...getMetrics(), timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", districtRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/options", optionRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/predictor", predictRoutes);
app.use("/api/web-options", webOptionsRoutes);
app.use("/api/institution", institutionRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/saved-options", savedOptionsRoutes);

// Recommendation & Search endpoints
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/personalization", personalizationRoutes);
app.use("/api/match", matchRoutes);

// Freshness & Recrawl API
app.use("/api/freshness", freshnessRoutes);

// Coverage Analytics API
app.use("/api/coverage", coverageRoutes);

// Data Quality Analytics API
app.use("/api/quality", qualityRoutes);

// Scraper Health Analytics API
app.use("/api/scraper-health", scraperHealthRoutes);

// Scraper Execution Analytics API
app.use("/api/scraper-execution", scraperExecutionRoutes);

// Scraper Trend Analytics API
app.use("/api/scraper-trends", scraperTrendRoutes);

// Scraper Failure Intelligence API
app.use("/api/scraper-failures", scraperFailureRoutes);

// Scraper Source Intelligence API
app.use("/api/scraper-sources", scraperSourceRoutes);

// Scraper Coverage Intelligence API
app.use("/api/scraper-coverage", scraperCoverageRoutes);

// Scraper Queue Intelligence API
app.use("/api/scraper-queue", scraperQueueRoutes);

// Scraper Scheduler Intelligence API
app.use("/api/scraper-scheduler", scraperSchedulerRoutes);

// Scraper Alert Intelligence API
app.use("/api/scraper-alerts", scraperAlertRoutes);

// Scraper SLA Intelligence API
app.use("/api/scraper-sla", scraperSlaRoutes);

// Scraper Capacity Intelligence API
app.use("/api/scraper-capacity", scraperCapacityRoutes);

// Scraper Cost Intelligence API
app.use("/api/scraper-cost", scraperCostRoutes);

// Scraper ROI Intelligence API
app.use("/api/scraper-roi", scraperRoiRoutes);

// Scraper Optimization Intelligence API
app.use("/api/scraper-optimization", scraperOptimizationRoutes);

// Scraper Benchmark Intelligence API
app.use("/api/scraper-benchmarks", scraperBenchmarkRoutes);

// Benchmark Dashboard API
app.use("/api/benchmark-dashboard", benchmarkDashboardRoutes);

// Benchmark Snapshot API
app.use("/api/benchmark-snapshots", benchmarkSnapshotRoutes);

// Benchmark Forecast API
app.use("/api/benchmark-forecast", benchmarkForecastRoutes);

// Forecast Dashboard API
app.use("/api/forecast-dashboard", forecastDashboardRoutes);

// Scraper Orchestration API
app.use("/api/orchestration", scraperOrchestrationRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Define PORT
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`Health:     http://localhost:${PORT}/health`);
});

// Graceful shutdown on process signals
process.on('SIGINT', async () => {
  console.log('Received SIGINT – shutting down');
  try {
    await gracefulShutdown();
    await cleanupLocks();
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error during SIGINT shutdown:', e);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM – shutting down');
  try {
    await gracefulShutdown();
    await cleanupLocks();
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error during SIGTERM shutdown:', e);
  }
  process.exit(0);
});