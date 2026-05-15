import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema(
  {
    // Basic Details
    name: {
      type: String,
      required: true,
    },

    collegeCode: {
      type: String,
      required: true,
      index: true,
    },

    branch: {
      type: String,
      required: true,
    },

    branchCode: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    gender: {
      type: String,
      required: true,
    },

    cutoff: {
      type: Number,
      required: true,
    },

    fees: {
      type: Number,
      default: 0,
    },

    district: {
      type: String,
      default: "",
    },

    place: {
      type: String,
      default: "",
    },

    affiliated: {
      type: String,
      default: "",
    },

    // Ranking Information
    ranking: {
      nirf: {
        type: Number,
        default: null,
      },

      nba: {
        type: Boolean,
        default: false,
      },

      naac: {
  type: String,
  default: ""
},

      rankingText: {
  type: [String],
  default: []
}
    },

    // Placement Information
    placements: {
      avgPackage: {
        type: Number,
        default: null,
      },

      medianPackage: {
        type: Number,
        default: null,
      },

      highestPackage: {
        type: Number,
        default: null,
      },

      placementPercentage: {
        type: Number,
        default: null,
      },
    },

    // Facilities Information
    facilities: {
      hostel: {
        type: Boolean,
        default: false,
      },

      sports: {
        type: Boolean,
        default: false,
      },

      library: {
        type: Boolean,
        default: false,
      },

      wifi: {
        type: Boolean,
        default: false,
      },

      labs: {
        type: Boolean,
        default: false,
      },

      transport: {
        type: Boolean,
        default: false,
      },

      events: {
        type: Boolean,
        default: false,
      },

      ncc: {
        type: Boolean,
        default: false,
      },

      nss: {
        type: Boolean,
        default: false,
      },
    },

    // Reviews
    reviews: {
  type: [String],
  default: []
},

    // Image Gallery
    gallery: [
      {
        type: String,
      },
    ],

    // Source URL
    sourceUrl: {
      type: String,
      default: "",
    },

    // Last Scrape Timestamp
    lastScrapedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to speed up predictor queries
collegeSchema.index({
  category: 1,
  gender: 1,
  cutoff: 1,
});

// Prevent duplicate rows for same college/branch/category/gender
collegeSchema.index(
  {
    collegeCode: 1,
    branchCode: 1,
    category: 1,
    gender: 1,
  },
  {
    unique: true,
  },
);

export default mongoose.model("College", collegeSchema);
