import mongoose from "mongoose";

const scraperJobSchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },
    queuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastHeartbeatAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for queue utilization queries
scraperJobSchema.index({ scraperName: 1, status: 1 });

export default mongoose.model("ScraperJob", scraperJobSchema);
