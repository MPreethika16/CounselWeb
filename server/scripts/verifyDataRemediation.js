import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dataRemediationService } from "../services/dataRemediationService.js";
import { dataConfidenceService } from "../services/dataConfidenceService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function verifyRemediationLogic() {
  console.log("Starting Verification of Remediation & Validation Rules...");
  const verifications = [];

  // 1. Anomaly Detection & Recovery (Website)
  const webTest1 = dataRemediationService.remediateWebsite("http://vit.ac.in ");
  verifications.push({
    scenario: "URL Normalization",
    passed: webTest1.mutated && webTest1.value === "https://vit.ac.in",
    note: "Successfully upgraded protocol and trimmed whitespace."
  });

  const webTest2 = dataRemediationService.remediateWebsite("invalid-domain");
  verifications.push({
    scenario: "URL Regex Validation",
    passed: webTest2.status === "UNRESOLVED_WEBSITE",
    note: "Successfully caught malformed URL."
  });

  // 2. Placements
  const placeTest = dataRemediationService.remediatePlacement({ averagePackageLPA: 50, highestPackageLPA: 8, placementPercentage: 90 });
  verifications.push({
    scenario: "Placement Field Inversion",
    passed: placeTest.mutated && placeTest.value.averagePackageLPA === 8 && placeTest.value.highestPackageLPA === 50,
    note: "Successfully inverted illogical average/highest boundaries."
  });

  const placeQuarantine = dataRemediationService.remediatePlacement({ averagePackageLPA: -5, highestPackageLPA: 10, placementPercentage: 110 });
  verifications.push({
    scenario: "Placement Quarantine",
    passed: placeQuarantine.status === "QUARANTINED",
    note: "Safely isolated impossible placement logic."
  });

  // 3. Confidence Scoring
  const confTest = dataConfidenceService.calculateConfidenceScore({}, {
    website: { status: "VALID" },
    placements: { status: "QUARANTINED" }, // -30
    fees: { status: "UNRESOLVED_FEE" }, // -20
    rankings: { status: "VALID" },
    naac: { status: "NAAC_NOT_AVAILABLE" }
  });
  
  verifications.push({
    scenario: "Safety Guards (Confidence Drop)",
    passed: confTest.score === 50 && confTest.confidenceCategory === "LOW" && !confTest.recommendationSafe,
    note: "High-risk errors correctly tanked score below the 60 threshold."
  });

  const report = {
    total: verifications.length,
    passed: verifications.filter(v => v.passed).length,
    status: verifications.every(v => v.passed) ? "REMEDIATION_SAFE" : "FAILED"
  };

  await fs.writeFile(path.join(__dirname, "remediation-verification-report.json"), JSON.stringify(report, null, 2));
  console.log(`Verification: ${report.passed}/${report.total} Passed.`);
}

verifyRemediationLogic();
