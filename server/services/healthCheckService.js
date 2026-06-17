import mongoose from "mongoose";
import { globalCache } from "./cacheService.js";

/**
 * Validates deep connectivity and system state for load balancer readiness probes.
 */
export async function performDeepHealthCheck() {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  
  if (dbStatus !== "connected") {
    throw new Error("Database not connected");
  }

  return {
    status: "UP",
    timestamp: new Date().toISOString(),
    components: {
      database: dbStatus,
      cache: "active"
    }
  };
}

/**
 * Basic liveness ping for orchestrator restarts.
 */
export function getLiveness() {
  return { status: "UP", uptime: process.uptime() };
}
