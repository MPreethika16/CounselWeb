import { validateEnvironment } from "../config/envValidator.js";

/**
 * Validates full release readiness before boot.
 */
export function validateDeploymentReadiness() {
  // 1. Check Env Vars
  validateEnvironment();

  // 2. Validate Port Binding Constraints
  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    console.error("[FATAL] PORT must be a valid integer.");
    process.exit(1);
  }

  // 3. Output Release Context
  return {
    ready: true,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memoryLimit: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
  };
}
