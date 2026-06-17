import mongoose from "mongoose";

const scraperBenchmarkSchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    successRate: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    roiScore: {
      type: Number,
      default: 0,
    },
    costUsd: {
      type: Number,
      default: 0,
    },
    totalRuns: {
      type: Number,
      default: 0,
    },
    trend7d: {
      type: Number,
      default: 0,
    },
    trend30d: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ScraperBenchmark", scraperBenchmarkSchema);
