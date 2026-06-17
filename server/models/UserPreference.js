import mongoose from "mongoose";

const UserPreferenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Explicit Profile
  preferredCourses: [{ type: String }],
  budgetRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: null }
  },
  preferredStates: [{ type: String }],
  preferredCities: [{ type: String }],
  preferredCollegeType: { type: String, enum: ["Public", "Private", "Any"], default: "Any" },
  preferredAccreditation: [{ type: String }],
  hostelRequired: { type: Boolean, default: false },
  managementQuotaAllowed: { type: Boolean, default: true },

  // Dynamic Priorities (1-10)
  placementPriority: { type: Number, default: 5, min: 1, max: 10 },
  affordabilityPriority: { type: Number, default: 5, min: 1, max: 10 },
  rankingPriority: { type: Number, default: 5, min: 1, max: 10 },
  academicsPriority: { type: Number, default: 5, min: 1, max: 10 },

  // State Tracking
  savedColleges: [{ type: String }], // Array of collegeCodes
  viewHistory: [{
    collegeCode: String,
    viewedAt: { type: Date, default: Date.now }
  }],
  recommendedHistory: [{
    collegeCode: String,
    recommendedAt: { type: Date, default: Date.now }
  }],

  // Inferred Preferences (Machine learned from views)
  inferredPreferences: {
    frequentlyViewedCourses: [{ type: String }],
    frequentlyViewedStates: [{ type: String }],
    lastUpdated: { type: Date, default: Date.now }
  }
}, { timestamps: true });

const UserPreference = mongoose.model("UserPreference", UserPreferenceSchema);

export default UserPreference;
