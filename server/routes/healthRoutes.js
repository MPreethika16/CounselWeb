// server/routes/healthRoutes.js
import express from "express";
import mongoose from "mongoose";
import { matchStudentPreferences } from "../services/recommendationMatchingService.js";
import { getCacheStats } from "../middleware/cache.js";

const router = express.Router();

/** GET /health – basic liveness */
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    version: "2.13.0",
    timestamp: new Date().toISOString(),
  });
});

/** GET /health/db – MongoDB connection & index check */
router.get("/db", async (req, res) => {
  const start = process.hrtime.bigint();
  try {
    const state = mongoose.connection.readyState;
    // 0=disconnected 1=connected 2=connecting 3=disconnecting
    const stateNames = ["disconnected", "connected", "connecting", "disconnecting"];
    const connected = state === 1;

    let indexCount = 0;
    if (connected) {
      const indexes = await mongoose.connection.db
        .collection("collegemasters")
        .listIndexes()
        .toArray();
      indexCount = indexes.length;
    }

    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    res.status(connected ? 200 : 503).json({
      status: connected ? "ok" : "error",
      dbState: stateNames[state] ?? "unknown",
      indexCount,
      latencyMs: Math.round(latencyMs * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    res.status(503).json({
      status: "error",
      error: err.message,
      latencyMs: Math.round(latencyMs * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /health/recommendation – recommendation service smoke test */
router.get("/recommendation", async (req, res) => {
  const start = process.hrtime.bigint();
  try {
    const minimalWeights = { academicsWeight: 100 };
    const matches = await matchStudentPreferences(minimalWeights);
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    const valid = Array.isArray(matches);
    res.status(valid ? 200 : 503).json({
      status: valid ? "ok" : "error",
      matchCount: valid ? matches.length : 0,
      latencyMs: Math.round(latencyMs * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    res.status(503).json({
      status: "error",
      error: err.message,
      latencyMs: Math.round(latencyMs * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /health/cache – cache hit/miss stats */
router.get("/cache", (req, res) => {
  res.status(200).json({
    status: "ok",
    cache: getCacheStats(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
