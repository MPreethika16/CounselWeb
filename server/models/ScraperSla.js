import mongoose from "mongoose";

const scraperSlaSchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    targetSuccessPercent: {
      type: Number,
      required: true,
      default: 95,
    },
    targetUptimePercent: {
      type: Number,
      required: true,
      default: 99,
    },
    targetLatencyMs: {
      type: Number,
      required: true,
      default: 5000,
    },
    breachStatus: {
      type: Boolean,
      default: false,
      index: true,
    },
    breachStartedAt: {
      type: Date,
      default: null,
    },
    historicalBreachDurationMs: {
      type: Number,
      default: 0,
    },
    recordedSuccessPercent: {
      type: Number,
      default: 100,
    },
    recordedUptimePercent: {
      type: Number,
      default: 100,
    },
    recordedAvgLatencyMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ScraperSla", scraperSlaSchema);
