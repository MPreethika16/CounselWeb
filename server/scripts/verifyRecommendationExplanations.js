import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";
import { matchStudentPreferences } from "../services/recommendationMatchingService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    console.log("Connecting to DB for verification...");
    await connectDB();

    const samplePayload = {
      academicsWeight: 40,
      placementsWeight: 30,
      infrastructureWeight: 20,
      trustWeight: 10
    };

    console.log("Running matches for verification assertions...");
    const matches1 = await matchStudentPreferences(samplePayload);
    const matches2 = await matchStudentPreferences(samplePayload);

    // Fetch original college details from DB to cross-reference
    const colleges = await CollegeMaster.find({}).lean();
    const collegeMap = new Map(colleges.map(c => [c.collegeCode, c]));

    const verification = {
      totalAssertions: 0,
      passed: 0,
      failed: 0,
      failures: []
    };

    const assert = (condition, message, details = "") => {
      verification.totalAssertions++;
      if (condition) {
        verification.passed++;
      } else {
        verification.failed++;
        verification.failures.push({ message, details });
        console.error(`❌ Assertion Failed: ${message}`, details);
      }
    };

    // 1. Assert explanations are deterministic (ordering and content remain identical across repeated runs)
    assert(
      matches1.length === matches2.length,
      "Deterministic matching length check",
      `First run: ${matches1.length}, Second run: ${matches2.length}`
    );

    // Deterministic check: compare explanations excluding generatedAt
    let deterministicMatch = true;
    for (let i = 0; i < matches1.length; i++) {
      if (matches1[i].collegeCode !== matches2[i].collegeCode || matches1[i].matchScore !== matches2[i].matchScore) {
        deterministicMatch = false;
        break;
      }
      const exp1 = matches1[i].explanation;
      const exp2 = matches2[i].explanation;
      // Clone without generatedAt for deterministic comparison
      const { generatedAt: _, ...exp1Copy } = exp1;
      const { generatedAt: __, ...exp2Copy } = exp2;
      if (JSON.stringify(exp1Copy) !== JSON.stringify(exp2Copy)) {
        deterministicMatch = false;
        break;
      }
    }
    assert(deterministicMatch, "Explanations are completely deterministic across repeated runs");

    // Track non-zero rankingScore count
    let nonZeroRankingCount = 0;

    // 2. Verify strengths, weaknesses, weaknessReasons, metadata, warnings, and duplicates for each match
    for (const match of matches1) {
      const dbCol = collegeMap.get(match.collegeCode);
      if (!dbCol) {
        assert(false, `College code ${match.collegeCode} not found in DB`);
        continue;
      }

      const officialData = dbCol.officialData || {};
      const factors = officialData.recommendationFactors || {};
      const exp = match.explanation || {};

      // Assert rankingScore matches DB overallScore
      const expectedRanking = officialData.ranking?.overallScore ?? null;
      assert(
        match.rankingScore === expectedRanking,
        `[${match.collegeCode}] rankingScore matches DB officialData.ranking.overallScore`,
        `Expected: ${expectedRanking}, Got: ${match.rankingScore}`
      );

      if (match.rankingScore > 0) {
        nonZeroRankingCount++;
      }

      // Assert strengths generated correctly
      const expectedStrengths = [];
      if (factors.academicStrength >= 75) expectedStrengths.push("academics");
      if (factors.placementStrength >= 75) expectedStrengths.push("placements");
      if (factors.infrastructureStrength >= 75) expectedStrengths.push("infrastructure");
      if (factors.trustStrength >= 75) expectedStrengths.push("trust");

      assert(
        JSON.stringify(exp.strengths.sort()) === JSON.stringify(expectedStrengths.sort()),
        `[${match.collegeCode}] strengths match raw recommendationFactors`,
        `Expected: ${JSON.stringify(expectedStrengths)}, Got: ${JSON.stringify(exp.strengths)}`
      );

      // Assert weaknesses generated correctly
      const expectedWeaknesses = [];
      if (factors.academicStrength !== undefined && factors.academicStrength < 50) expectedWeaknesses.push("academics");
      if (factors.placementStrength !== undefined && factors.placementStrength < 50) expectedWeaknesses.push("placements");
      if (factors.infrastructureStrength !== undefined && factors.infrastructureStrength < 50) expectedWeaknesses.push("infrastructure");
      if (factors.trustStrength !== undefined && factors.trustStrength < 50) expectedWeaknesses.push("trust");
      if (factors.affordabilityDataAvailable && factors.affordabilityStrength !== undefined && factors.affordabilityStrength < 50) {
        expectedWeaknesses.push("affordability");
      }
      if (factors.locationDataAvailable && factors.locationStrength !== undefined && factors.locationStrength < 50) {
        expectedWeaknesses.push("location");
      }

      assert(
        JSON.stringify(exp.weaknesses.sort()) === JSON.stringify(expectedWeaknesses.sort()),
        `[${match.collegeCode}] weaknesses match raw recommendationFactors`,
        `Expected: ${JSON.stringify(expectedWeaknesses)}, Got: ${JSON.stringify(exp.weaknesses)}`
      );

      // Assert warnings propagated correctly
      const expectedWarnings = [];
      const reviewFlags = officialData.trustScore?.reviewFlags || [];
      const reviewReasons = officialData.reviewStatus?.reviewReasons || [];
      const improvementFlags = officialData.reviewStatus?.improvementFlags || [];

      if (
        reviewFlags.includes("placement_outlier") ||
        reviewReasons.includes("placement_outlier") ||
        dbCol.placements?.suspicious === true ||
        dbCol.placements?.reviewRequired === true
      ) {
        expectedWarnings.push("placement_outlier");
      }
      if (
        reviewFlags.includes("website_unhealthy") ||
        reviewReasons.includes("website_unhealthy") ||
        dbCol.officialWebsite?.healthStatus === "critical" ||
        dbCol.officialWebsite?.health?.healthy === false ||
        dbCol.officialWebsite?.health?.status === "critical"
      ) {
        expectedWarnings.push("website_unhealthy");
      }
      if (
        reviewFlags.includes("affiliation_conflict") ||
        reviewReasons.includes("affiliation_conflict") ||
        dbCol.accreditation?.reviewRequired === true
      ) {
        expectedWarnings.push("affiliation_conflict");
      }
      if (
        (officialData.trustScore?.score !== undefined && officialData.trustScore.score < 50) ||
        improvementFlags.includes("low_trust_score") ||
        reviewFlags.includes("low_trust_score")
      ) {
        expectedWarnings.push("low_trust_score");
      }
      if (
        (officialData.profileCompleteness?.score !== undefined && officialData.profileCompleteness.score < 50) ||
        improvementFlags.includes("incomplete_profile")
      ) {
        expectedWarnings.push("incomplete_profile");
      }

      assert(
        JSON.stringify(exp.warnings.sort()) === JSON.stringify(expectedWarnings.sort()),
        `[${match.collegeCode}] warnings match DB review indicators`,
        `Expected: ${JSON.stringify(expectedWarnings)}, Got: ${JSON.stringify(exp.warnings)}`
      );

      // Assert no duplicate messages inside reasons, weaknesses, weaknessReasons, strengths, or warnings
      assert(
        new Set(exp.reasons).size === exp.reasons.length,
        `[${match.collegeCode}] no duplicate reasons`,
        `Reasons: ${JSON.stringify(exp.reasons)}`
      );
      assert(
        new Set(exp.weaknesses).size === exp.weaknesses.length,
        `[${match.collegeCode}] no duplicate weaknesses`,
        `Weaknesses: ${JSON.stringify(exp.weaknesses)}`
      );
      assert(
        new Set(exp.weaknessReasons).size === exp.weaknessReasons.length,
        `[${match.collegeCode}] no duplicate weaknessReasons`,
        `WeaknessReasons: ${JSON.stringify(exp.weaknessReasons)}`
      );
      assert(
        new Set(exp.warnings).size === exp.warnings.length,
        `[${match.collegeCode}] no duplicate warnings`,
        `Warnings: ${JSON.stringify(exp.warnings)}`
      );
      // New assertion for duplicate strengths
      assert(
        new Set(exp.strengths).size === exp.strengths.length,
        `[${match.collegeCode}] no duplicate strengths`,
        `Strengths: ${JSON.stringify(exp.strengths)}`
      );

      // Assert reason order matches contribution order descending
      // Also ensure that weaknessReasons correspond to weaknesses
      const weaknessReasonMap = {
        academics: "Academic indicators are currently below the platform average.",
        placements: "Placement information is limited or below expected benchmarks.",
        infrastructure: "Infrastructure coverage and facility quality appear limited.",
        trust: "Available institutional data requires further verification."
      };
      const expectedWeaknessReasons = exp.weaknesses.map(w => weaknessReasonMap[w]).filter(Boolean);
      assert(
        JSON.stringify(exp.weaknessReasons.sort()) === JSON.stringify(expectedWeaknessReasons.sort()),
        `[${match.collegeCode}] weaknessReasons match expected messages`,
        `Expected: ${JSON.stringify(expectedWeaknessReasons)}, Got: ${JSON.stringify(exp.weaknessReasons)}`
      );
      if (exp.reasons.length > 1) {
        const contributions = exp.reasons.map(reason => {
          if (reason.startsWith("Strong academic profile")) return match.factorBreakdown.academicStrength || 0;
          if (reason.startsWith("Strong placement performance")) return match.factorBreakdown.placementStrength || 0;
          if (reason.startsWith("Modern campus infrastructure")) return match.factorBreakdown.infrastructureStrength || 0;
          if (reason.startsWith("High trust score")) return match.factorBreakdown.trustStrength || 0;
          return 0;
        });

        let isOrdered = true;
        for (let idx = 1; idx < contributions.length; idx++) {
          if (contributions[idx] > contributions[idx - 1]) {
            isOrdered = false;
            break;
          }
        }

        assert(
          isOrdered,
          `[${match.collegeCode}] reason order matches contribution order descending`,
          `Reasons: ${JSON.stringify(exp.reasons)}, Contributions: ${JSON.stringify(contributions)}`
        );
        // Assert metadata fields
        assert(typeof exp.version === 'string' && exp.version === '2.11A', `[${match.collegeCode}] version metadata correct`, `Version: ${exp.version}`);
        const generatedTime = Date.parse(exp.generatedAt);
        assert(!isNaN(generatedTime), `[${match.collegeCode}] generatedAt is valid ISO timestamp`, `generatedAt: ${exp.generatedAt}`);
        assert(typeof exp.confidenceScore === 'number' && exp.confidenceScore >= 0 && exp.confidenceScore <= 100, `[${match.collegeCode}] confidenceScore within range`, `confidenceScore: ${exp.confidenceScore}`);
        // If rankingScore null, expect ranking_unavailable warning
        if (match.rankingScore === null) {
          assert(exp.warnings.includes('ranking_unavailable'), `[${match.collegeCode}] missing rankingScore yields ranking_unavailable warning`);
        }
      }
    }

    // Assert that we have at least one college with non-zero ranking score returned
    assert(
      nonZeroRankingCount > 0,
      `Non-zero ranking scores are returned for ranked colleges`,
      `Found ${nonZeroRankingCount} colleges with rankingScore > 0`
    );

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const verificationPath = path.join(reportsDir, "recommendation-explanations-verification-v3.json");
    fs.writeFileSync(verificationPath, JSON.stringify(verification, null, 2), "utf8");

    console.log(`\n================ Verification Results ================`);
    console.log(`Total Assertions: ${verification.totalAssertions}`);
    console.log(`Passed:           ${verification.passed}`);
    console.log(`Failed:           ${verification.failed}`);
    console.log(`Verification summary written to: ${verificationPath}`);

    process.exit(verification.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Error during verification:", err);
    process.exit(1);
  }
};

run();
