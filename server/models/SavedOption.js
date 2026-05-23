import mongoose from "mongoose";

const OptionEntrySchema = new mongoose.Schema({
  collegeCode: {
    type: String,
    required: true
  },
  branchCode: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    required: true
  },
  riskLabel: {
    type: String,
    required: true
  }
}, { _id: false });

const savedOptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      default: "Saved Web Options"
    },
    inputs: {
      type: Object,
      default: {}
    },
    options: {
      type: [OptionEntrySchema],
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("SavedOption", savedOptionSchema);
