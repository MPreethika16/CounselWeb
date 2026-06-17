import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import CollegeMaster from "../models/CollegeMaster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Hardcoded references map for candidates lookup
const CANDIDATE_MAP = {
  "BOMA": ["http://www.bomma.ac.in", "http://www.bomma.edu.in", "http://www.bomma.in"],
  "KLRT": ["http://www.klr.ac.in", "http://www.klr.edu.in", "http://www.klrcolleges.com"],
  "MNRT": ["http://www.mnrindia.org", "http://www.mnr.ac.in", "http://www.mnrcet.ac.in"],
  "MOTK": ["http://www.mist.ac.in", "http://www.mtist.ac.in", "http://www.motherteresa.ac.in", "http://www.mist.edu.in"],
  "MRCW": ["https://www.mallareddyecw.com", "http://www.mrecw.ac.in", "http://www.mrecw.edu.in", "http://www.mallasreddy.com"],
  "NGMA": ["http://www.nigama.ac.in", "http://www.nigama.edu.in", "http://www.nigamaengineering.ac.in"],
  "NIET": ["http://www.netajiengg.com", "http://www.niet.ac.in", "http://www.niet.edu.in", "http://www.netajiengg.in"],
  "PETW": ["http://www.princeton.edu.in", "http://www.petw.ac.in", "http://www.princeton.ac.in", "http://www.petw.edu.in"],
  "SCIT": ["http://www.srichaitanya.org", "http://www.scit.ac.in", "http://www.srichaitanyacet.ac.in", "http://www.srichaitanya.ac.in"],
  "SRIW": ["http://www.smitw.ac.in", "http://www.sriw.ac.in", "http://www.sumathireddy.ac.in", "http://www.smitw.edu.in"]
};

// Programmatic candidate generation helper
const generateCandidates = (college) => {
  const code = college.collegeCode.toUpperCase().trim();
  const name = college.collegeName.toLowerCase();
  const district = college.district ? college.district.toLowerCase().trim() : "";
  const affiliation = college.affiliation ? college.affiliation.toLowerCase().trim() : "";

  const candidates = new Set();

  // 1. Add candidates from hardcoded mapping
  if (CANDIDATE_MAP[code]) {
    CANDIDATE_MAP[code].forEach(url => candidates.add(url));
  }

  // 2. Clean the college name to form potential domains
  // Remove words like "college", "institute", "of", "and", "technology", "sciences", "(autonomous)", etc.
  const cleanName = name
    .replace(/\(autonomous\)/g, "")
    .replace(/engineering/g, "engg")
    .replace(/technology/g, "tech")
    .replace(/institute/g, "inst")
    .replace(/sciences?/g, "sci")
    .replace(/for women/g, "w")
    .replace(/women/g, "w")
    .replace(/[^a-z0-9]/g, "");

  if (cleanName.length > 3) {
    candidates.add(`http://www.${cleanName}.ac.in`);
    candidates.add(`http://www.${cleanName}.edu.in`);
  }

  // 3. Simple code-based candidates
  const lowerCode = code.toLowerCase();
  candidates.add(`http://www.${lowerCode}.ac.in`);
  candidates.add(`http://www.${lowerCode}.edu.in`);
  candidates.add(`http://www.${lowerCode}cet.ac.in`);
  candidates.add(`http://www.${lowerCode}engg.ac.in`);

  // 4. District and Affiliation references
  if (district) {
    candidates.add(`http://www.${lowerCode}-${district}.ac.in`);
  }
  if (affiliation) {
    candidates.add(`http://www.${lowerCode}-${affiliation}.ac.in`);
  }

  return Array.from(candidates);
};

const run = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Scanning all CollegeMaster records for missing websites...");
    const missingColleges = await CollegeMaster.find({
      $or: [
        { "officialWebsite.url": "" },
        { "officialWebsite.url": { $exists: false } }
      ]
    });

    console.log(`Found ${missingColleges.length} colleges missing websites.`);

    const report = [];

    for (const college of missingColleges) {
      const candidateUrls = generateCandidates(college);
      
      report.push({
        collegeCode: college.collegeCode,
        collegeName: college.collegeName,
        district: college.district || "UNKNOWN",
        candidateUrls
      });
      
      console.log(`Generated ${candidateUrls.length} candidate(s) for [${college.collegeCode}] ${college.collegeName}`);
    }

    const reportsDir = path.resolve(__dirname, "../../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, "manual-review-websites.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`\nManual review candidates generated at: ${reportPath}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error during manual website recovery generation:", error);
    process.exit(1);
  }
};

run();
