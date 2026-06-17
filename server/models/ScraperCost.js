import mongoose from "mongoose";

const scraperCostSchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    totalBandwidthBytes: {
      type: Number,
      default: 0,
    },
    totalStorageBytes: {
      type: Number,
      default: 0,
    },
    totalComputeTimeMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ScraperCost", scraperCostSchema);
