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
    enum: ["student", "institution", "admin"],
    default: "student"
  },
  collegeId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "College",
  default: null
},

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