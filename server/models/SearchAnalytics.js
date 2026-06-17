import mongoose from "mongoose";

const SearchAnalyticsSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: ["college", "course", "city"],
    required: true,
    index: true
  },
  count: {
    type: Number,
    default: 1
  },
  lastSearchedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast upserts and sorting
SearchAnalyticsSchema.index({ type: 1, count: -1 });
SearchAnalyticsSchema.index({ query: 1, type: 1 }, { unique: true });

const SearchAnalytics = mongoose.model("SearchAnalytics", SearchAnalyticsSchema);

export default SearchAnalytics;
