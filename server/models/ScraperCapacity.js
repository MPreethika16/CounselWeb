import mongoose from "mongoose";

const scraperCapacitySchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    maxCapacity: {
      type: Number,
      required: true,
      default: 10,
    },
    activeJobs: {
      type: Number,
      default: 0,
    },
    queuedJobs: {
      type: Number,
      default: 0,
    },
    peakUtilizationPercent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ScraperCapacity", scraperCapacitySchema);
