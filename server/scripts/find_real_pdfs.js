import dotenv from "dotenv";
import connectDB from "../config/db.js";
import RawCollegePage from "../models/RawCollegePage.js";
import { findPdfLinks, isPlacementPdf } from "../services/placementsExtractor.js";

dotenv.config();

const run = async () => {
  await connectDB();
  const pages = await RawCollegePage.find({
    collegeCode: { $in: ["CBIT", "VJEC", "CVRH", "GRRR"] },
    crawlStatus: "success",
    statusCode: { $gte: 200, $lte: 399 }
  });
  console.log(`Scanning pages...`);
  for (const page of pages) {
    const pdfLinks = findPdfLinks(page.html);
    for (const link of pdfLinks) {
      if (isPlacementPdf(link.url, link.text)) {
        console.log(`MATCH found!`);
        console.log(`- College: ${page.collegeCode}`);
        console.log(`- Page Type: ${page.pageType}`);
        console.log(`- Link Text: "${link.text}"`);
        console.log(`- Link URL: ${link.url}`);
      }
    }
  }
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
