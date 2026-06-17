import mongoose from "mongoose";

const scraperOptimizationSchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    isSlow: {
      type: Boolean,
      default: false,
    },
    isHighCost: {
      type: Boolean,
      default: false,
    },
    isLowRoi: {
      type: Boolean,
      default: false,
    },
    // Allows overriding automatic logic natively for manual interventions
    manualPriorityOffset: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ScraperOptimization", scraperOptimizationSchema);
