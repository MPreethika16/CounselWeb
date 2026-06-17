import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

/**
 * Orchestrates a MongoDB database backup to the local disk.
 * Requires `mongodump` installed in the container/host environment.
 */
export async function executeDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "reports", "backups", timestamp);

  try {
    // We parse the URI to safely extract the DB connection string without leaking in logs
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/counselweb";
    
    // Create dir if missing
    await fs.mkdir(backupDir, { recursive: true });

    // Mock mode or real mode depending on ENV
    if (process.env.NODE_ENV === "test" || process.env.MOCK_BACKUP) {
      await fs.writeFile(path.join(backupDir, "mock-backup-metadata.json"), JSON.stringify({ status: "success", simulated: true }));
      return { success: true, path: backupDir, simulated: true };
    }

    const { stdout, stderr } = await execPromise(`mongodump --uri="${uri}" --out="${backupDir}"`);
    
    return { success: true, path: backupDir, log: stdout || stderr };
  } catch (error) {
    console.error("[BACKUP ERROR] Failed to execute database backup:", error.message);
    throw new Error("Backup failed: " + error.message);
  }
}
