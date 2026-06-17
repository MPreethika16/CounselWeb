import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { remediationValidationService } from "../services/remediationValidationService.js";
import { recommendationImpactService } from "../services/recommendationImpactService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runVerification() {
  console.log("Starting Verification of Remediation Hardening Rules...");
  const verifications = [];

  // 1. Placement Audit Structure
  const pAudit = remediationValidationService.validatePlacementCorrection(
    { collegeCode: "T1", meta: { name: "Test" } },
    { averagePackageLPA: 50, highestPackageLPA: 10 },
    { averagePackageLPA: 10, highestPackageLPA: 50 }
  );
  verifications.push({
    scenario: "Placement Swap Audit Generator",
    passed: pAudit.original.averagePackageLPA === 50 && pAudit.corrected.averagePackageLPA === 10 && pAudit.confidence > 90,
    note: "Maintained pristine original boundaries while scoring the fix confidence."
  });

  // 2. NAAC Strict Match
  const naacValid = remediationValidationService.validateNaacRecovery("A++", "The NAAC Grade: A++ was awarded");
  const naacInvalid = remediationValidationService.validateNaacRecovery("A++", "We are aiming to be an A++ university soon.");
  verifications.push({
    scenario: "NAAC Strict Context Regex",
    passed: naacValid.status === "NAAC_FOUND" && naacInvalid.status === "NAAC_LOW_CONFIDENCE",
    note: "Refused hallucinated/aspirational grades found in loose text."
  });

  // 3. DNS Head Mock
  const webValid = await remediationValidationService.validateWebsite("vit.ac.in", "https://vit.ac.in");
  const webInvalid = await remediationValidationService.validateWebsite("localhost", "http://localhost:3000");
  verifications.push({
    scenario: "Website Validation",
    passed: webValid.status === "200_OK" && webInvalid.status === "DNS_FAILURE",
    note: "Properly identified unreachable or stub domains."
  });

  // 4. Recommendation Delta
  const mockImpact = recommendationImpactService.analyzeImpact([
    {
      collegeCode: "DELTA_TEST",
      original: { placements: { averagePackageLPA: 0 } },
      remediated: { placements: { averagePackageLPA: 10 } }
    },
    {
      collegeCode: "STABLE",
      original: { placements: { averagePackageLPA: 5 } },
      remediated: { placements: { averagePackageLPA: 5 } }
    }
  ]);
  
  verifications.push({
    scenario: "Recommendation Engine Rank Delta",
    passed: mockImpact.summary.totalAnalyzed === 2 && mockImpact.impactLogs[0].rankChange !== 0,
    note: "Score simulator correctly picked up remediated payload shifts."
  });

  const report = {
    total: verifications.length,
    passed: verifications.filter(v => v.passed).length,
    status: verifications.every(v => v.passed) ? "HARDENED" : "FAILED",
    verifications
  };

  console.log(JSON.stringify(report.verifications, null, 2));

  await fs.writeFile(path.join(__dirname, "remediation-hardening-verification.json"), JSON.stringify(report, null, 2));
  console.log(`Verification: ${report.passed}/${report.total} Passed.`);
}

runVerification();
