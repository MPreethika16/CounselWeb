import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema({
  name: String,
  collegeCode: String,
  branch: String,
  branchCode: String,
  category: String,
  gender: String,
  cutoff: Number,
  district: String,
  fees: Number,
  affiliated: String,
  place: String
});

collegeSchema.index({ category: 1, gender: 1 });
collegeSchema.index({ district: 1 });
collegeSchema.index({ branch: 1 });
collegeSchema.index({ fees: 1 });
collegeSchema.index({ cutoff: 1 });
const College = mongoose.model("College", collegeSchema);

export default College;