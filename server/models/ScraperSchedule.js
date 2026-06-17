import mongoose from "mongoose";

const scraperScheduleSchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
    },
    executionFrequencyMs: {
      type: Number,
      required: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    nextRunAt: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ScraperSchedule", scraperScheduleSchema);
