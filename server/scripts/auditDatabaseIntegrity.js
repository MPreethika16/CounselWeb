import mongoose from "mongoose";
import dotenv from "dotenv";
import { databaseAuditService } from "../services/databaseAuditService.js";

dotenv.config();

export async function runDatabaseIntegrityAudit() {
  try {
    const result = await databaseAuditService.runIntegrityAudit();
    return result;
  } catch (error) {
    console.error("Database Integrity Audit Error:", error);
    throw error;
  }
}

// For standalone execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log("Connected to MongoDB");
      const res = await runDatabaseIntegrityAudit();
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch(console.error);
}
