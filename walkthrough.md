# Scraper Orchestration & Expansions Walkthrough

This document outlines the recent expansions to the Scraper Infrastructure (Phases 3.1, 3.2, and 3.3).

## 1. Phase 3.1: Academics Scraper Extraction
We introduced a dedicated pipeline for extracting academic data (programs, departments, intake capacity, faculty counts, and curriculum URLs) from college web pages. 

### Parsing & Normalization (`academicsParser.js`, `academicsNormalizer.js`)
- Uses Cheerio to traverse lists and tables near headings like "Department" or "Specialization".
- Safely cleans data, handles duplicates, casts numbers, and calculates a 0–100 `confidence` score.

---

## 2. Phase 3.2: Fees Scraper Extraction
A comprehensive extraction pipeline was built specifically for complex tuition and fee tables.

### Parsing & Normalization (`feesParser.js`, `feesNormalizer.js`)
- Uses Cheerio to parse fee tables (mapping `<tr><td>` pairs like "Tuition Fee" -> "1,00,000").
- Strips currencies and commas, mapping strings cleanly to `Number` values.
- Resolves conflicting duplicates by safely extracting the highest mathematically detected value.

---

## 3. Phase 3.3: Admissions Scraper Extraction
We developed a complex contextual parser to retrieve detailed admission information, including cutoff ranks, counseling processes, quotas, and required documentation.

### Data Model ([CollegeMaster.js](file:///c:/Users/Preethika/OneDrive/Desktop/CounselWeb-clean/server/models/CollegeMaster.js))
Added several new fields to the `admissions` subdocument:
```javascript
admissions: {
  eligibilityCriteria: { type: [String], default: [] },
  entranceExams: { type: [String], default: [] },
  eamcetRanks: { type: String, default: "" },
  jeeRanks: { type: String, default: "" },
  cutoffRanges: { type: String, default: "" },
  counselingProcess: { type: String, default: "" },
  managementQuota: { type: String, default: "" },
  nriQuota: { type: String, default: "" },
  requiredDocuments: { type: [String], default: [] },
  admissionContact: { type: String, default: "" },
  // ... and legacy fields (applicationDeadline, cutoffRank)
}
```

### Parsing Service ([admissionsParser.js](file:///c:/Users/Preethika/OneDrive/Desktop/CounselWeb-clean/server/services/admissionsParser.js))
- **Block Aggregation:** Contextually scans headings (e.g. `<h2>Documents Required</h2>`) and captures adjacent `<ul>` or `<p>` text blocks efficiently, grouping bullet points.
- **Quota Processing:** Identifies loose paragraphs mentioning NRI or Management/Category-B allocations.
- **Rank Parsing:** Detects specific text ranges (e.g., "15000 - 25000" or "below 10000") in loose paragraphs or standard tabular data aligned to specific exams (EAMCET, JEE).

### Normalization Service ([admissionsNormalizer.js](file:///c:/Users/Preethika/OneDrive/Desktop/CounselWeb-clean/server/services/admissionsNormalizer.js))
- **Deduplication:** Collapses highly repetitive HTML blocks, flattening duplicate `<li>` items.
- **Safe Joining:** Converts array groups for `managementQuota` or `nriQuota` into single, clean summary strings separated by `|`.
- **Confidence Computation:** Scores the payload out of 100 based on the presence of up to 6 distinct admission data categories.

### Orchestrator Service ([admissionsScraper.js](file:///c:/Users/Preethika/OneDrive/Desktop/CounselWeb-clean/server/services/admissionsScraper.js))
- Wraps the parsing and normalization steps, updating the target college document safely.

---

## 4. Orchestrator Integration ([scraperWorkerService.js](file:///c:/Users/Preethika/OneDrive/Desktop/CounselWeb-clean/server/services/scraperWorkerService.js))
All three scrapers (`academics`, `fees`, `admissions`) are now fully integrated into the central worker queue in `scraperWorkerService.js`:
```javascript
if (job.scraperName === "academics") {
  // ...
} else if (job.scraperName === "fees") {
  // ...
} else if (job.scraperName === "admissions") {
  const { runAdmissionsScraping } = await import("./admissionsScraper.js");
  await runAdmissionsScraping(collegeCode, html, url);
}
```
They natively inherit the 5-worker concurrency limit, automatic deadlock recovery, retry logic, and lock cleanup guarantees implemented during Phase 3.0.

---

## Verification ([verifyAdmissionsScraper.js](file:///c:/Users/Preethika/OneDrive/Desktop/CounselWeb-clean/server/scripts/verifyAdmissionsScraper.js))
Verified successfully across 7 edge-case scenarios: empty pages, malformed HTML, multiple formats, duplicate values, rank extraction, quota parsing, and confidence scoring.

*Outputs:*
- [admissions-scraper-report.json](file:///c:/Users/Preethika/OneDrive/Desktop/CounselWeb-clean/server/scripts/admissions-scraper-report.json)
- [admissions-scraper-verification.json](file:///c:/Users/Preethika/OneDrive/Desktop/CounselWeb-clean/server/scripts/admissions-scraper-verification.json)
