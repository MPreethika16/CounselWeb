import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import {
  computeRecommendationFactors,
  computeReadinessSummary,
} from "../services/recommendationEngineService.js";
import {
  computeAcademicScore,
  computePlacementScore,
  computeInfrastructureScore,
} from "../services/rankingEngineService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to DB for recommendation factors verification...");
    await connectDB();

    const colleges = await CollegeMaster.find({});
    console.log(`Found ${colleges.length} colleges.\n`);

    const assertions = [];
    let passed = 0;
    let failed = 0;

    const assert = (label, condition, detail = "") => {
      if (condition) {
        passed++;
        assertions.push({ label, status: "PASSED", detail });
      } else {
        failed++;
        assertions.push({ label, status: "FAILED", detail });
        console.error(`  ✗ ${label}: ${detail}`);
      }
    };

    // ----- Global assertions -----

    // 1. All factors remain 0-100 (where non-null)
    let outOfRange = 0;
    for (const college of colleges) {
      const factors = computeRecommendationFactors(college);

      for (const key of ["academicStrength", "placementStrength", "infrastructureStrength", "trustStrength"]) {
        const val = factors[key];
        if (val != null && (val < 0 || val > 100)) {
          outOfRange++;
        }
      }
    }
    assert(
      "All computed factors are within 0-100 range",
      outOfRange === 0,
      outOfRange > 0 ? `${outOfRange} out-of-range values` : "All values in range"
    );

    // 2. affordabilityStrength is always null (Phase 2.9A)
    let fakeAffordability = 0;
    for (const college of colleges) {
      const factors = computeRecommendationFactors(college);
      if (factors.affordabilityStrength !== null) {
        fakeAffordability++;
      }
    }
    assert(
      "No fake affordability values",
      fakeAffordability === 0,
      fakeAffordability > 0
        ? `${fakeAffordability} colleges with non-null affordabilityStrength`
        : "All affordabilityStrength values are null"
    );

    // 3. locationStrength is always null (Phase 2.9A)
    let fakeLocation = 0;
    for (const college of colleges) {
      const factors = computeRecommendationFactors(college);
      if (factors.locationStrength !== null) {
        fakeLocation++;
      }
    }
    assert(
      "No fake location values",
      fakeLocation === 0,
      fakeLocation > 0
        ? `${fakeLocation} colleges with non-null locationStrength`
        : "All locationStrength values are null"
    );

    // 4. affordabilityDataAvailable is always false
    let affordAvail = 0;
    for (const college of colleges) {
      const factors = computeRecommendationFactors(college);
      if (factors.affordabilityDataAvailable !== false) affordAvail++;
    }
    assert(
      "affordabilityDataAvailable is false for all colleges",
      affordAvail === 0,
      affordAvail > 0 ? `${affordAvail} colleges report affordability available` : "Correct"
    );

    // 5. locationDataAvailable is always false
    let locAvail = 0;
    for (const college of colleges) {
      const factors = computeRecommendationFactors(college);
      if (factors.locationDataAvailable !== false) locAvail++;
    }
    assert(
      "locationDataAvailable is false for all colleges",
      locAvail === 0,
      locAvail > 0 ? `${locAvail} colleges report location available` : "Correct"
    );

    // 6. academicStrength matches normalized academic source score
    let academicMismatch = 0;
    for (const college of colleges) {
      const factors = computeRecommendationFactors(college);
      const expected = Math.max(0, Math.min(100, Math.round(computeAcademicScore(college))));
      if (factors.academicStrength !== expected) {
        academicMismatch++;
      }
    }
    assert(
      "academicStrength matches normalized academic source score",
      academicMismatch === 0,
      academicMismatch > 0
        ? `${academicMismatch} mismatches`
        : "All match"
    );

    // 7. placementStrength matches normalized placement source score
    let placementMismatch = 0;
    for (const college of colleges) {
      const factors = computeRecommendationFactors(college);
      const expected = Math.max(0, Math.min(100, Math.round(computePlacementScore(college))));
      if (factors.placementStrength !== expected) {
        placementMismatch++;
      }
    }
    assert(
      "placementStrength matches normalized placement source score",
      placementMismatch === 0,
      placementMismatch > 0
        ? `${placementMismatch} mismatches`
        : "All match"
    );

    // 8. infrastructureStrength matches normalized infrastructure source score
    let infraMismatch = 0;
    for (const college of colleges) {
      const factors = computeRecommendationFactors(college);
      const expected = Math.max(0, Math.min(100, Math.round(computeInfrastructureScore(college))));
      if (factors.infrastructureStrength !== expected) {
        infraMismatch++;
      }
    }
    assert(
      "infrastructureStrength matches normalized infrastructure source score",
      infraMismatch === 0,
      infraMismatch > 0
        ? `${infraMismatch} mismatches`
        : "All match"
    );

    // 9. Deterministic output — run twice, compare
    let nonDeterministic = 0;
    for (const college of colleges.slice(0, 20)) {
      const run1 = computeRecommendationFactors(college);
      const run2 = computeRecommendationFactors(college);
      if (
        run1.academicStrength !== run2.academicStrength ||
        run1.placementStrength !== run2.placementStrength ||
        run1.infrastructureStrength !== run2.infrastructureStrength ||
        run1.trustStrength !== run2.trustStrength ||
        run1.affordabilityStrength !== run2.affordabilityStrength ||
        run1.locationStrength !== run2.locationStrength
      ) {
        nonDeterministic++;
      }
    }
    assert(
      "Deterministic output across runs",
      nonDeterministic === 0,
      nonDeterministic > 0
        ? `${nonDeterministic} non-deterministic results`
        : "All deterministic"
    );

    // 10. Rankings and recommendation factors correlate logically
    // Colleges with higher ranking overallScore should generally have
    // higher average recommendation strength
    const collegesWithRanking = colleges.filter(
      (c) => (c.officialData?.ranking?.overallScore || c.officialData?.overallScore) > 0
    );
    if (collegesWithRanking.length >= 2) {
      const sorted = [...collegesWithRanking].sort(
        (a, b) => ((b.officialData?.ranking?.overallScore || b.officialData?.overallScore || 0) - (a.officialData?.ranking?.overallScore || a.officialData?.overallScore || 0))
      );
      const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
      const bottomHalf = sorted.slice(Math.ceil(sorted.length / 2));

      const avgStrength = (group) => {
        const sum = group.reduce((s, c) => {
          const f = computeRecommendationFactors(c);
          return s + f.academicStrength + f.placementStrength + f.infrastructureStrength;
        }, 0);
        return sum / (group.length * 3);
      };

      const topAvg = avgStrength(topHalf);
      const bottomAvg = avgStrength(bottomHalf);
      assert(
        "Higher-ranked colleges have higher average recommendation strength",
        topAvg >= bottomAvg,
        `Top-half avg: ${topAvg.toFixed(1)}, Bottom-half avg: ${bottomAvg.toFixed(1)}`
      );
    } else {
      assert(
        "Higher-ranked colleges have higher average recommendation strength",
        true,
        "Skipped — insufficient ranking data"
      );
    }

    // 11. Readiness reporting is correct
    let readinessErrors = 0;
    for (const college of colleges.slice(0, 20)) {
      const factors = computeRecommendationFactors(college);
      const readiness = computeReadinessSummary(factors);
      // Should have 4 available (academic, placement, infrastructure, trust)
      // and 2 unavailable (affordability, location)
      if (readiness.availableCount !== 4 || readiness.unavailableCount !== 2) {
        readinessErrors++;
      }
    }
    assert(
      "Readiness correctly reports 4 available, 2 unavailable factors",
      readinessErrors === 0,
      readinessErrors > 0
        ? `${readinessErrors} incorrect readiness reports`
        : "All correct"
    );

    // 12. Version is "2.9A"
    let versionErrors = 0;
    for (const college of colleges.slice(0, 10)) {
      const factors = computeRecommendationFactors(college);
      if (factors.version !== "2.9A") versionErrors++;
    }
    assert(
      "Version is 2.9A for all recommendation factors",
      versionErrors === 0,
      versionErrors > 0 ? `${versionErrors} incorrect versions` : "All correct"
    );

    // ----- Summary -----
    const overallStatus = failed === 0 ? "PASSED" : "FAILED";
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Recommendation Factors Verification: ${overallStatus}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`${"=".repeat(60)}\n`);

    // Write verification report
    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(
      reportsDir,
      "recommendation-factors-verification.json"
    );
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          overallStatus,
          totalAssertions: passed + failed,
          passed,
          failed,
          assertions,
        },
        null,
        2
      ),
      "utf8"
    );

    console.log(`Verification report: ${reportPath}`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Error during verification:", err);
    process.exit(1);
  }
};

run();
