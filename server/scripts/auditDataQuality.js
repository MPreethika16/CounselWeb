import mongoose from "mongoose";
import dotenv from "dotenv";
import { dataQualityAuditService } from "../services/dataQualityAuditService.js";

dotenv.config();

export async function runDataQualityAudit() {
  try {
    const result = await dataQualityAuditService.runQualityAudit();
    return result;
  } catch (error) {
    console.error("Data Quality Audit Error:", error);
    throw error;
  }
}

// For standalone execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log("Connected to MongoDB");
      const res = await runDataQualityAudit();
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch(console.error);
}
