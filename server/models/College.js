import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema(
  {
    // BASIC DETAILS
    name: String,
    collegeCode: String,
    branch: String,
    branchCode: String,

    category: String,
    gender: String,

    district: String,
    place: String,

    cutoff: Number,
    fees: Number,

    // 🔥 NEW: RANKING
    ranking: {
      nirf: Number, // lower is better (1 = best)
      nba: Boolean, // true = accredited
    },

    // 🔥 NEW: PLACEMENTS
    placements: {
      avgPackage: Number, // average salary
      highestPackage: Number, // highest salary
    },

    // 🔥 NEW: FACILITIES
    facilities: {
      hostel: Boolean,
      sports: Boolean,
      ncc: Boolean,
      nss: Boolean,
      events: Boolean,
    },
  },
  { timestamps: true },
);

export default mongoose.model("College", collegeSchema);
