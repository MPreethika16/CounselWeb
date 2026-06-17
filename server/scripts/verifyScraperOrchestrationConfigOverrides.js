// server/scripts/verifyScraperOrchestrationConfigOverrides.js
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assert(name, condition, details = "") {
  if (condition) {
    console.log(`  [PASS] ${name}`);
  } else {
    console.error(`  [FAIL] ${name} - ${details}`);
    process.exit(1);
  }
}

// Define custom env overrides for this test
const testEnv = {
  HEARTBEAT_INTERVAL_MS: "2000",
  STUCK_JOB_TIMEOUT_MS: "10000",
  LOCK_TTL_MS: "30000",
  SHUTDOWN_TIMEOUT_MS: "5000"
};

(async () => {
  // Apply overrides temporarily
  for (const [k, v] of Object.entries(testEnv)) {
    process.env[k] = v;
  }

  const configPath = path.resolve(__dirname, "../config/orchestrationConfig.js");
  const configModule = await import(pathToFileURL(configPath));
  const { HEARTBEAT_INTERVAL_MS, STUCK_JOB_TIMEOUT_MS, LOCK_TTL_MS, SHUTDOWN_TIMEOUT_MS } = configModule;


  assert("HEARTBEAT_INTERVAL_MS honored", HEARTBEAT_INTERVAL_MS === 2000);
  assert("STUCK_JOB_TIMEOUT_MS honored", STUCK_JOB_TIMEOUT_MS === 10000);
  assert("LOCK_TTL_MS honored", LOCK_TTL_MS === 30000);
  assert("SHUTDOWN_TIMEOUT_MS honored", SHUTDOWN_TIMEOUT_MS === 5000);

  // Ensure defaults still work when env not set
  for (const k of Object.keys(testEnv)) delete process.env[k];

  // Re-import config to get defaults – add cache bust query to force fresh import
  const configPathDefault = configPath + `?cacheBust=${Date.now()}`;
  const { HEARTBEAT_INTERVAL_MS: hbDef, STUCK_JOB_TIMEOUT_MS: sjDef, LOCK_TTL_MS: ltDef, SHUTDOWN_TIMEOUT_MS: sdDef } = await import(pathToFileURL(configPathDefault));

  assert("HEARTBEAT_INTERVAL_MS default", hbDef === 5000);
  assert("STUCK_JOB_TIMEOUT_MS default", sjDef === 30000);
  assert("LOCK_TTL_MS default", ltDef === 60000);
  assert("SHUTDOWN_TIMEOUT_MS default", sdDef === 10000);

  // Write simple report files
  const reportDir = path.resolve(__dirname, "../../reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "orchestration-config-override-report.json"), JSON.stringify({ generated: new Date().toISOString() }, null, 2));
  fs.writeFileSync(path.join(reportDir, "orchestration-config-override-verification.json"), JSON.stringify({ passed: true }, null, 2));

  console.log("All config override tests passed.");
  process.exit(0);
})();
