import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import UserPreference from "../models/UserPreference.js";
import {
  getPreferences,
  updatePreferences,
  getPersonalizedRecommendations,
  saveCollege,
  removeSavedCollege,
  getSavedColleges,
  logViewHistory,
  getHistory,
  getInferredPreferences
} from "../services/personalizationService.js";
import * as recommendationService from "../services/recommendationService.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOCK_COLLEGES = [
  {
    collegeCode: "COL_1",
    name: "Perfect Fit College",
    state: "Karnataka",
    city: "Bangalore",
    overallScore: 80,
    subscores: { placementScore: 100, affordabilityScore: 100, rankingScore: 60, academicsScore: 60 },
    officialData: {
      fees: [{ tuitionFee: 50000 }],
      academics: { ugCourses: [{ name: "B.Tech Computer Science" }] },
      placements: { placementPercentage: 90 },
      accreditation: { nirfRank: 50 }
    }
  },
  {
    collegeCode: "COL_2",
    name: "Expensive Mismatch College",
    state: "Maharashtra",
    city: "Mumbai",
    overallScore: 90,
    subscores: { placementScore: 100, affordabilityScore: 20, rankingScore: 100, academicsScore: 100 },
    officialData: {
      fees: [{ tuitionFee: 500000 }],
      academics: { ugCourses: [{ name: "B.Tech Civil" }] },
      placements: { placementPercentage: 95 },
      accreditation: { nirfRank: 10 }
    }
  }
];

let MOCK_USER_DB = {};

async function verifyPersonalization() {
  const report = {
    totalTested: 0,
    passed: 0,
    failed: 0,
    failures: []
  };
  const verifications = [];

  // Mocks
  UserPreference.findOne = (query) => ({
    lean: async () => MOCK_USER_DB[query.userId] || null
  });

  UserPreference.findOneAndUpdate = (query, update, options) => {
    const mockQuery = {
      lean: async () => {
        let prefs = MOCK_USER_DB[query.userId];
        if (!prefs && options && options.upsert) {
          prefs = { userId: query.userId, savedColleges: [], viewHistory: [], recommendedHistory: [], inferredPreferences: {} };
          MOCK_USER_DB[query.userId] = prefs;
        }
        if (!prefs) return null;

        if (update.$set) {
          Object.assign(prefs, update.$set);
        }
        if (update.$addToSet && update.$addToSet.savedColleges) {
          if (!prefs.savedColleges.includes(update.$addToSet.savedColleges)) {
            prefs.savedColleges.push(update.$addToSet.savedColleges);
          }
        }
        if (update.$pull && update.$pull.savedColleges) {
          prefs.savedColleges = prefs.savedColleges.filter(c => c !== update.$pull.savedColleges);
        }
        if (update.$push && update.$push.viewHistory) {
          prefs.viewHistory.push(update.$push.viewHistory);
        }
        if (update.$push && update.$push.recommendedHistory) {
          if (update.$push.recommendedHistory.$each) {
            prefs.recommendedHistory.push(...update.$push.recommendedHistory.$each);
          } else {
            prefs.recommendedHistory.push(update.$push.recommendedHistory);
          }
        }
        return prefs;
      },
      then: function(resolve, reject) {
        this.lean().then(resolve).catch(reject);
      }
    };
    return mockQuery;
  };

  UserPreference.updateOne = async (query, update) => {
    let prefs = MOCK_USER_DB[query.userId];
    if (prefs && update.$set) {
      Object.assign(prefs, update.$set);
    }
    return { modifiedCount: 1 };
  };

  // Override saving to do nothing but return the object
  UserPreference.prototype.save = async function() {
    MOCK_USER_DB[this.userId] = { ...this.toObject(), savedColleges: [], viewHistory: [], recommendedHistory: [], inferredPreferences: {} };
  };

  CollegeMaster.find = () => {
    return {
      lean: async () => JSON.parse(JSON.stringify(MOCK_COLLEGES))
    };
  };

  const runTest = async (scenario, fn) => {
    report.totalTested++;
    try {
      const passed = await fn();
      if (passed) {
        report.passed++;
        verifications.push({ scenario, passed: true });
      } else {
        report.failed++;
        report.failures.push({ scenario, reason: "Validation failed" });
        verifications.push({ scenario, passed: false });
        console.error("Failed on:", scenario);
      }
    } catch (e) {
      report.failed++;
      report.failures.push({ scenario, reason: e.message });
      verifications.push({ scenario, passed: false, error: e.message });
      console.error("Exception on:", scenario, e);
    }
  };

  const userId = "test_user";

  await runTest("empty preferences", async () => {
    MOCK_USER_DB = {}; // Reset
    const recs = await getPersonalizedRecommendations(userId);
    // Since preferences are empty, personalizedScore should roughly equal overallScore (base weight)
    return recs.data[0].personalizedScore > 0;
  });

  await runTest("budget matching", async () => {
    await updatePreferences(userId, { budgetRange: { max: 100000 } });
    const recs = await getPersonalizedRecommendations(userId);
    const col1 = recs.data.find(c => c.collegeCode === "COL_1"); // Cost 50000
    const col2 = recs.data.find(c => c.collegeCode === "COL_2"); // Cost 500000
    return col1.personalizedScore > col2.personalizedScore; // COL_1 should rank higher due to budget match
  });

  await runTest("location matching", async () => {
    await updatePreferences(userId, { budgetRange: { max: null }, preferredCities: ["Mumbai"] });
    const recs = await getPersonalizedRecommendations(userId);
    const col1 = recs.data.find(c => c.collegeCode === "COL_1");
    const col2 = recs.data.find(c => c.collegeCode === "COL_2"); // Mumbai
    return col2.personalizedScore > col1.personalizedScore; // COL_2 should rank higher due to location match
  });

  await runTest("course matching", async () => {
    await updatePreferences(userId, { preferredCities: [], preferredCourses: ["computer science"] });
    const recs = await getPersonalizedRecommendations(userId);
    const col1 = recs.data.find(c => c.collegeCode === "COL_1"); // Has CS
    const col2 = recs.data.find(c => c.collegeCode === "COL_2"); // Has Civil
    return col1.personalizedScore > col2.personalizedScore; 
  });

  await runTest("saved colleges", async () => {
    await saveCollege(userId, "COL_1");
    let saved = await getSavedColleges(userId);
    if (saved.length !== 1 || saved[0] !== "COL_1") return false;
    
    await removeSavedCollege(userId, "COL_1");
    saved = await getSavedColleges(userId);
    return saved.length === 0;
  });

  await runTest("recommendation history", async () => {
    const history = await getHistory(userId);
    return history.recommendedHistory.length > 0; // Should be populated by getPersonalizedRecommendations
  });

  await runTest("inferred preferences", async () => {
    await logViewHistory(userId, "COL_1");
    // wait for async inference
    await new Promise(r => setTimeout(r, 50));
    const inferred = await getInferredPreferences(userId);
    return inferred.frequentlyViewedCourses !== undefined;
  });

  await runTest("deterministic output", async () => {
    const recs1 = await getPersonalizedRecommendations(userId);
    const recs2 = await getPersonalizedRecommendations(userId);
    return recs1.data[0].collegeCode === recs2.data[0].collegeCode;
  });

  // Output
  await fs.writeFile(
    path.join(__dirname, "personalization-report.json"),
    JSON.stringify(report, null, 2)
  );

  await fs.writeFile(
    path.join(__dirname, "personalization-verification.json"),
    JSON.stringify(verifications, null, 2)
  );

  console.log("Verification complete.");
  console.log(`Passed: ${report.passed}/${report.totalTested}`);
}

verifyPersonalization();
