import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["student", "college"],
      default: "student"
    },

    // 🔽 Optional fields (filled later)

    rank: {
      type: Number,
      default: null
    },

    category: {
      type: String,
      default: null
    },

    preferences: {
      type: [String],
      default: []
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);