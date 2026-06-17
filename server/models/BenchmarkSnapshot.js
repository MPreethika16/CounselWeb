import mongoose from "mongoose";

const benchmarkSnapshotSchema = new mongoose.Schema(
  {
    scraperName: {
      type: String,
      required: true,
      index: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
      index: true,
    },
    percentileRanking: {
      type: Number,
      required: true,
    },
    successRate: {
      type: Number,
      required: true,
    },
    durationMs: {
      type: Number,
      required: true,
    },
    roiScore: {
      type: Number,
      required: true,
    },
    benchmarkStatus: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

benchmarkSnapshotSchema.pre("save", function () {
  if (this.snapshotDate) {
    const d = new Date(this.snapshotDate);
    this.snapshotDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
});

// Unique index for scraperName and snapshotDate (normalized)
benchmarkSnapshotSchema.index({ scraperName: 1, snapshotDate: 1 }, { unique: true });

export default mongoose.model("BenchmarkSnapshot", benchmarkSnapshotSchema);
