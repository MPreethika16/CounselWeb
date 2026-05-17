import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      default: "My Web Options"
    },

    inputs: {
      type: Object,
      default: {}
    },

    options: {
      type: [Object],
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Option", optionSchema);