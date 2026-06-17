import mongoose from "mongoose";

const scraperRoiSchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    totalCostUsd: {
      type: Number,
      default: 0,
    },
    recordsProduced: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number,
      default: 100, // Percentage 0-100
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ScraperRoi", scraperRoiSchema);
