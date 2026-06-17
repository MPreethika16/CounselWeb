// scratch/diagValidation.js — run from project root: node server/scratch/diagValidation.js
import Ajv from "../node_modules/ajv/dist/ajv.js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "../node_modules/mongoose/lib/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const schema = JSON.parse(
  readFileSync(path.resolve(__dirname, "../schemas/recommendationResponseSchema.json"), "utf8")
);

const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
const validate = ajv.compile(schema);

await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 5 });
const { matchStudentPreferences } = await import("../services/recommendationMatchingService.js");
const matches = await matchStudentPreferences({ academicsWeight: 50, placementsWeight: 50 });

// Build a minimal response payload (first 3 items)
const payload = {
  version: "2.12.0",
  generatedAt: new Date().toISOString(),
  meta: { page: 1, limit: 20, totalItems: matches.length, totalPages: Math.ceil(matches.length / 20) || 1, hasNextPage: false, hasPreviousPage: false },
  data: matches.slice(0, 3),
};

const valid = validate(payload);
if (valid) {
  console.log("✅  Validation PASSED");
} else {
  console.log("❌  Validation FAILED — errors:");
  for (const err of validate.errors) {
    console.log(`  path: ${err.instancePath || "/"} | keyword: ${err.keyword} | msg: ${err.message} | params: ${JSON.stringify(err.params)}`);
  }
}

await mongoose.disconnect();
process.exit(0);
