const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

console.log("🚀 Script started");

// File paths
const inputPath = path.join(__dirname, "tseamcet.xlsx");
const outputPath = path.join(__dirname, "colleges.json");

// Check file exists
if (!fs.existsSync(inputPath)) {
  console.error("❌ Excel file not found!");
  process.exit(1);
}

// Read Excel
const workbook = XLSX.readFile(inputPath);
console.log("📊 Sheets:", workbook.SheetNames);

// Get first sheet
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Read data (skip title row)
const rawData = XLSX.utils.sheet_to_json(sheet, { range: 1 });

console.log("📈 Rows found:", rawData.length);

// Result array
const result = [];

// Transform data
rawData.forEach((row) => {
  const name = row["Institute Name"]?.trim();
  const branch = row["Branch Name"]?.trim();
  const district = row["Dist \r\nCode"]?.trim(); 
  const fees = Number(row["Tuition Fee"]);
  const collegeCode = row["Inst\r\n Code"]?.trim();
  const branchCode = row["Branch Code"]?.trim();
  const place = row["Place"]?.trim();
  const affiliated = row["Affiliated To"]?.trim();
// OR row["Dist Code"]

  if (!name || !branch) return;

  Object.keys(row).forEach((key) => {
    // Clean key (remove newline characters)
    const cleanKey = key.replace(/\r?\n/g, " ").trim();

    // Check if it's a category column
    if (cleanKey.includes("BOYS") || cleanKey.includes("GIRLS")) {
      
const parts = cleanKey.split(" ").filter(Boolean);

const category = parts[0];
const gender = parts[parts.length - 1];

      const cutoff = Number(row[key]);

      // Skip invalid values
      if (!cutoff || isNaN(cutoff)) return;

      result.push({
        name,
  collegeCode,
  branch,
  branchCode,
  category,
  gender,
  cutoff,
  place,
  district,
 
  affiliated,
  fees
      });
    }
  });
});
console.log(Object.keys(rawData[0]));
// Save JSON
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log("✅ Clean JSON created!");
console.log("📦 Total records:", result.length);