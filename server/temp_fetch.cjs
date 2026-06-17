const mongoose = require('mongoose');
require('dotenv').config({path: '.env'});
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const cols = await mongoose.connection.collection('collegemasters')
    .find({ collegeCode: { $nin: ['AARM','ACEG','AITH','ANRK'] } })
    .limit(20).toArray();
  console.log(JSON.stringify(cols.map(c => ({
    code: c.collegeCode,
    name: c.collegeName,
    isAuto: c.officialData?.accreditation?.autonomous || false,
    isWebsiteActive: c.officialWebsite?.health?.healthy || false,
    district: c.district || 'Unknown'
  })), null, 2));
  process.exit(0);
});
