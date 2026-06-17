import mongoose from "mongoose";

const scraperAlertSchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL", "FATAL"],
      default: "WARNING",
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for quick active alert fetching
scraperAlertSchema.index({ scraperName: 1, isResolved: 1 });

export default mongoose.model("ScraperAlert", scraperAlertSchema);
