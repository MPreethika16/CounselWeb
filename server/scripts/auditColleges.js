import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import College from "../models/College.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from the server root directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const runAudit = async () => {
  try {
    console.log("Connecting to the database...");
    await connectDB();
    console.log("Database connected. Starting audit...\n");

    // 1. Total College documents
    const totalCollegeRecords = await College.countDocuments();

    // 2. Unique college codes
    const uniqueCollegeCodesList = await College.distinct("collegeCode");
    const uniqueCollegeCodesCount = uniqueCollegeCodesList.length;

    // 3. Unique college names
    const uniqueCollegeNamesList = await College.distinct("name");
    const uniqueCollegeNamesCount = uniqueCollegeNamesList.length;

    // 4. Total CollegeMaster documents
    const collegeMasterRecords = await CollegeMaster.countDocuments();

    // 5. Colleges missing CollegeMaster records (Case 1)
    const masterCodesList = await CollegeMaster.distinct("collegeCode");
    const masterCodesSet = new Set(masterCodesList.map(c => c.toUpperCase()));
    
    const missingCollegeCodes = uniqueCollegeCodesList.filter(
      code => !masterCodesSet.has(code.toUpperCase())
    );

    const missingCollegeMasters = [];
    for (const code of missingCollegeCodes) {
      const colDoc = await College.findOne({ collegeCode: code });
      missingCollegeMasters.push({
        collegeCode: code,
        collegeName: colDoc ? colDoc.name : "Unknown College Name"
      });
    }

    // 6. Duplicate CollegeMaster records (Case 3)
    const duplicateMastersGroup = await CollegeMaster.aggregate([
      { $group: { _id: "$collegeCode", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    const duplicateMasterProfilesCount = duplicateMastersGroup.length;

    // 7. Duplicate college codes / Case 5: Same code with multiple names (in College collection)
    const codeToNames = await College.aggregate([
      { $group: { _id: "$collegeCode", names: { $addToSet: "$name" } } },
      { $match: { "names.1": { $exists: true } } }
    ]);

    // 8. Duplicate college names / Case 4: Same college name with multiple codes (in College collection)
    const nameToCodes = await College.aggregate([
      { $group: { _id: "$name", codes: { $addToSet: "$collegeCode" } } },
      { $match: { "codes.1": { $exists: true } } }
    ]);

    // Case 2: CollegeMaster exists but collegeCode not found in College collection
    const collegeCodesSet = new Set(uniqueCollegeCodesList.map(c => c.toUpperCase()));
    const orphanCollegeMasters = masterCodesList.filter(
      code => !collegeCodesSet.has(code.toUpperCase())
    );

    // 9. Missing districts in existing CollegeMaster records
    const missingDistrict = await CollegeMaster.countDocuments({
      $or: [
        { district: { $exists: false } },
        { district: null },
        { district: "" }
      ]
    });

    // 10. Missing locations in existing CollegeMaster records
    const missingLocation = await CollegeMaster.countDocuments({
      $or: [
        { location: { $exists: false } },
        { location: null },
        { location: "" }
      ]
    });

    // 11. Missing affiliations in existing CollegeMaster records
    const missingAffiliation = await CollegeMaster.countDocuments({
      $or: [
        { affiliation: { $exists: false } },
        { affiliation: null },
        { affiliation: "" }
      ]
    });

    // 12. Missing official website URLs in existing CollegeMaster records
    const missingOfficialWebsite = await CollegeMaster.countDocuments({
      $or: [
        { "officialWebsite.url": { $exists: false } },
        { "officialWebsite.url": null },
        { "officialWebsite.url": "" }
      ]
    });

    // Output formatted console report
    console.log("------------------------------------------");
    console.log("COLLEGE DATABASE AUDIT");
    console.log("------------------------------------------\n");
    console.log(`Total College Records:\n${totalCollegeRecords}\n`);
    console.log(`Unique College Codes:\n${uniqueCollegeCodesCount}\n`);
    console.log(`Unique College Names:\n${uniqueCollegeNamesCount}\n`);
    console.log(`CollegeMaster Records:\n${collegeMasterRecords}\n`);
    console.log(`Missing CollegeMaster:\n${missingCollegeCodes.length}\n`);
    console.log(`Duplicate Master Profiles:\n${duplicateMasterProfilesCount}\n`);
    console.log(`Missing District:\n${missingDistrict}\n`);
    console.log(`Missing Location:\n${missingLocation}\n`);
    console.log(`Missing Affiliation:\n${missingAffiliation}\n`);
    console.log(`Missing Official Website:\n${missingOfficialWebsite}\n`);
    console.log("------------------------------------------\n");

    // Construct export audit report structure
    const reportData = {
      generatedAt: new Date().toISOString(),
      totalCollegeRecords,
      uniqueCollegeCodes: uniqueCollegeCodesCount,
      collegeMasterRecords,
      missingCollegeMasters,
      auditValidations: {
        case1_missingCollegeMasters: missingCollegeMasters,
        case2_orphanCollegeMasters: orphanCollegeMasters.map(code => ({ collegeCode: code })),
        case3_duplicateMasterProfiles: duplicateMastersGroup.map(item => ({ collegeCode: item._id, count: item.count })),
        case4_sameNameMultipleCodes: nameToCodes.map(item => ({ name: item._id, codes: item.codes })),
        case5_sameCodeMultipleNames: codeToNames.map(item => ({ collegeCode: item._id, names: item.names }))
      }
    };

    // Ensure exports directory exists in project root
    const exportsDir = path.resolve(__dirname, "../../exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const reportPath = path.join(exportsDir, "audit-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), "utf-8");
    console.log(`Successfully generated audit report at: ${reportPath}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during college database audit:", error);
    process.exit(1);
  }
};

runAudit();
