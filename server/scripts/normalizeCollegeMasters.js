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

const KNOWN_ALIASES = {
  "VJEC": {
    shortName: "VNR VJIET",
    aliases: ["VNR", "VNRVJIET", "VNR VJIET"]
  },
  "CBIT": {
    shortName: "CBIT",
    aliases: ["CBIT", "Chaitanya Bharathi", "Chaitanya Bharathi Institute of Technology"]
  },
  "MGIT": {
    shortName: "MGIT",
    aliases: ["MGIT", "Mahatma Gandhi Institute of Technology"]
  },
  "VASV": {
    shortName: "Vasavi",
    aliases: ["Vasavi", "VASV", "Vasavi College of Engineering"]
  },
  "OUCE": {
    shortName: "OU College of Engineering",
    aliases: ["OUCE", "OU", "Osmania University College of Engineering"]
  },
  "JNTU": {
    shortName: "JNTUH College of Engineering",
    aliases: ["JNTU", "JNTUH", "JNTUH CEH"]
  }
};

const runNormalization = async () => {
  try {
    console.log("Connecting to the database...");
    await connectDB();
    console.log("Database connected. Starting normalization...\n");

    console.time("Fetching raw colleges data");
    // Use aggregation to fetch all representative data for unique college codes in a single query
    const rawColleges = await College.aggregate([
      { $sort: { year: -1 } },
      {
        $group: {
          _id: { $toUpper: { $trim: { input: "$collegeCode" } } },
          collegeCode: { $first: "$collegeCode" },
          collegeName: { $first: "$name" },
          district: { $first: "$district" },
          location: { $first: "$place" },
          affiliation: { $first: "$affiliated" }
        }
      }
    ]);
    console.timeEnd("Fetching raw colleges data");
    console.log(`Found ${rawColleges.length} unique college codes in College collection.\n`);

    console.time("Fetching existing CollegeMaster data");
    // Fetch all existing CollegeMaster records in a single query
    const allMasters = await CollegeMaster.find({}).sort({ createdAt: 1 }); // sorted oldest first
    console.timeEnd("Fetching existing CollegeMaster data");
    console.log(`Found ${allMasters.length} existing CollegeMaster records in database.\n`);

    // Group existing masters by code (case-insensitive uppercase key)
    const mastersMap = new Map();
    for (const master of allMasters) {
      const key = master.collegeCode.toUpperCase().trim();
      if (!mastersMap.has(key)) {
        mastersMap.set(key, []);
      }
      mastersMap.get(key).push(master);
    }

    let createdMasters = 0;
    let updatedMasters = 0;
    let mergedDuplicates = 0;

    for (const rawInfo of rawColleges) {
      if (!rawInfo.collegeCode) continue;
      const code = rawInfo.collegeCode.toUpperCase().trim();

      const mastersList = mastersMap.get(code) || [];

      let masterDoc;

      if (mastersList.length > 0) {
        // Keep the oldest record (sorted first because we sorted by createdAt in find query)
        masterDoc = mastersList[0];
        updatedMasters++;

        // Step 4: Resolve duplicates if multiple exist
        if (mastersList.length > 1) {
          const duplicates = mastersList.slice(1);
          console.log(`🔍 Found duplicate CollegeMaster records for code ${code}. Merging ${duplicates.length} records...`);

          const aliasesSet = new Set(masterDoc.aliases || []);
          
          for (const dup of duplicates) {
            // Merge aliases
            if (dup.aliases && Array.isArray(dup.aliases)) {
              dup.aliases.forEach(alias => aliasesSet.add(alias));
            }

            // Merge officialWebsite if oldest lacks it
            if (
              (!masterDoc.officialWebsite || !masterDoc.officialWebsite.url) &&
              dup.officialWebsite && dup.officialWebsite.url
            ) {
              masterDoc.officialWebsite = {
                url: dup.officialWebsite.url,
                confidence: dup.officialWebsite.confidence || 0,
                verified: dup.officialWebsite.verified || false,
                healthStatus: dup.officialWebsite.healthStatus || ""
              };
            }

            // Merge metadata createdFromAudit flag
            if (dup.metadata && dup.metadata.createdFromAudit) {
              masterDoc.metadata.createdFromAudit = true;
            }

            // Delete the duplicate from database
            await CollegeMaster.deleteOne({ _id: dup._id });
            mergedDuplicates++;
            console.log(`🗑️ Deleted duplicate CollegeMaster _id: ${dup._id} for code: ${code}`);
          }

          masterDoc.aliases = Array.from(aliasesSet);
        }

        // Step 2: Update missing fields only (do not overwrite existing)
        let isModified = false;

        if (!masterDoc.collegeName && rawInfo.collegeName) {
          masterDoc.collegeName = rawInfo.collegeName.trim();
          isModified = true;
        }
        if (!masterDoc.district && rawInfo.district) {
          masterDoc.district = rawInfo.district.trim();
          isModified = true;
        }
        if (!masterDoc.location && rawInfo.location) {
          masterDoc.location = rawInfo.location.trim();
          isModified = true;
        }
        if (!masterDoc.affiliation && rawInfo.affiliation) {
          masterDoc.affiliation = rawInfo.affiliation.trim();
          isModified = true;
        }

        // Ensure officialWebsite structure exists
        if (!masterDoc.officialWebsite) {
          masterDoc.officialWebsite = { url: "", confidence: 0, verified: false, healthStatus: "" };
          isModified = true;
        }

        // Ensure metadata structure exists
        if (!masterDoc.metadata) {
          masterDoc.metadata = { createdFromAudit: false, normalizedAt: null };
          isModified = true;
        }

        // Step 5: Alias Support
        if (KNOWN_ALIASES[code]) {
          const known = KNOWN_ALIASES[code];
          if (!masterDoc.shortName) {
            masterDoc.shortName = known.shortName;
            isModified = true;
          }
          const currentAliases = new Set(masterDoc.aliases || []);
          let aliasesAdded = false;
          for (const alias of known.aliases) {
            if (!currentAliases.has(alias)) {
              currentAliases.add(alias);
              aliasesAdded = true;
            }
          }
          if (aliasesAdded) {
            masterDoc.aliases = Array.from(currentAliases);
            isModified = true;
          }
        }

        if (isModified) {
          if (!masterDoc.metadata) {
            masterDoc.metadata = { createdFromAudit: false, normalizedAt: new Date() };
          } else {
            masterDoc.metadata.normalizedAt = new Date();
          }
          await masterDoc.save();
          console.log(`✅ Updated missing fields for CollegeMaster: ${code}`);
        }

      } else {
        // Step 3: Create new CollegeMaster
        masterDoc = new CollegeMaster({
          collegeCode: code,
          collegeName: rawInfo.collegeName ? rawInfo.collegeName.trim() : "",
          district: rawInfo.district ? rawInfo.district.trim() : "",
          location: rawInfo.location ? rawInfo.location.trim() : "",
          affiliation: rawInfo.affiliation ? rawInfo.affiliation.trim() : "",
          aliases: [],
          officialWebsite: {
            url: "",
            confidence: 0,
            verified: false,
            healthStatus: ""
          },
          discoveryStatus: "pending",
          metadata: {
            createdFromAudit: true,
            normalizedAt: new Date()
          }
        });

        // Step 5: Alias Support
        if (KNOWN_ALIASES[code]) {
          const known = KNOWN_ALIASES[code];
          masterDoc.shortName = known.shortName;
          masterDoc.aliases = known.aliases;
        }

        await masterDoc.save();
        createdMasters++;
        console.log(`✨ Created new CollegeMaster for code: ${code}`);
      }
    }

    const totalMastersAfterNormalization = await CollegeMaster.countDocuments();

    // Step 6: Generate report exports/normalization-report.json
    const reportData = {
      createdMasters,
      updatedMasters,
      mergedDuplicates,
      totalMastersAfterNormalization
    };

    // Ensure exports directory exists in project root
    const exportsDir = path.resolve(__dirname, "../../exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const reportPath = path.join(exportsDir, "normalization-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), "utf-8");
    console.log(`\nSuccessfully generated normalization report at: ${reportPath}`);

    // Print final report summary
    console.log("\n------------------------------------------");
    console.log("COLLEGE MASTER NORMALIZATION SUMMARY");
    console.log("------------------------------------------");
    console.log(`Created Masters: ${createdMasters}`);
    console.log(`Updated Masters: ${updatedMasters}`);
    console.log(`Merged Duplicates: ${mergedDuplicates}`);
    console.log(`Total Masters After Normalization: ${totalMastersAfterNormalization}`);
    console.log("------------------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during college master normalization:", error);
    process.exit(1);
  }
};

runNormalization();
