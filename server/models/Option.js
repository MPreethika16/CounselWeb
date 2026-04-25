import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    userId: String,
    options: Array
  },
  { timestamps: true }
);

const Option = mongoose.model("Option", optionSchema);

export default Option;