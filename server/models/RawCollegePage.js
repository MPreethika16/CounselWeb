import mongoose from "mongoose";

const rawCollegePageSchema = new mongoose.Schema(
  {
    collegeCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    canonicalDomain: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    pageType: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    finalUrl: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    metaDescription: {
      type: String,
      default: "",
      trim: true,
    },
    html: {
      type: String,
      default: "",
    },
    text: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    statusCode: {
      type: Number,
      default: null,
    },
    crawlStatus: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    failureReason: {
      type: String,
      default: null,
    },
    crawledAt: {
      type: Date,
      default: Date.now,
    },
    contentHash: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound unique index to avoid duplicates
rawCollegePageSchema.index({ collegeCode: 1, url: 1 }, { unique: true });

// Add compound index for DB aggregation readiness (scraper health analytics)
rawCollegePageSchema.index({ pageType: 1, crawlStatus: 1, crawledAt: -1 });

export default mongoose.model("RawCollegePage", rawCollegePageSchema);
