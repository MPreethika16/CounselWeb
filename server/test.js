import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CollegeMaster from './models/CollegeMaster.js';

dotenv.config({ path: '.env' });

function checkReadiness(college) {
  const hasFee = !!college.officialData?.tuitionFee || !!college.officialData?.tuitionFeeMetadata?.value || !!college.officialData?.fees?.tuitionFee;
  const hasRank = !!college.officialData?.accreditation?.naacGrade;
  const hasPlacements = !!college.officialData?.placements?.highestPackage && !!college.officialData?.placements?.averagePackage;
  
  console.log({ hasFee, hasRank, hasPlacements });

  if (hasFee && hasRank && hasPlacements) return "READY";
  if (hasFee || hasRank || hasPlacements) return "PARTIALLY_READY";
  return "NOT_READY";
}

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const cbit = await CollegeMaster.findOne({ collegeCode: 'CBIT' });
  console.log(checkReadiness(cbit));
  await mongoose.disconnect();
}
test();
