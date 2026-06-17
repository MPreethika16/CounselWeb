// server/config/orchestrationConfig.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env if present
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function parsePositiveInt(value, defaultValue) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

export const HEARTBEAT_INTERVAL_MS = parsePositiveInt(process.env.HEARTBEAT_INTERVAL_MS, 5000);
export const STUCK_JOB_TIMEOUT_MS = parsePositiveInt(process.env.STUCK_JOB_TIMEOUT_MS, 30000);
export const LOCK_TTL_MS = parsePositiveInt(process.env.LOCK_TTL_MS, 60000);
export const SHUTDOWN_TIMEOUT_MS = parsePositiveInt(process.env.SHUTDOWN_TIMEOUT_MS, 10000);

// Export a validation helper (optional)
export function getConfig() {
  return {
    HEARTBEAT_INTERVAL_MS,
    STUCK_JOB_TIMEOUT_MS,
    LOCK_TTL_MS,
    SHUTDOWN_TIMEOUT_MS,
  };
}
