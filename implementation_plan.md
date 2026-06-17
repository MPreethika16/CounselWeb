# Phase 3.3 – Admissions Scraper Expansion

Expand the data ingestion pipeline to capture and normalize detailed admission structures from college websites, and integrate this into the main scraper orchestration workflow.

## Proposed Changes

### 1. Database Schema (`server/models/CollegeMaster.js`)
We will expand the `officialData.admissions` subdocument to support the newly requested fields:
- `eligibilityCriteria` (Array of Strings)
- `entranceExams` (Array of Strings - existing)
- `eamcetRanks` (String)
- `jeeRanks` (String)
- `cutoffRanges` (String)
- `counselingProcess` (String)
- `managementQuota` (String)
- `nriQuota` (String)
- `requiredDocuments` (Array of Strings)
- `admissionContact` (String)
- `applicationDeadline` (String - existing)
- `confidence` (Number)

### 2. Admissions Pipeline Services

#### [NEW] `server/services/admissionsParser.js`
- Use `cheerio` to parse target HTML.
- Target tables, lists, and paragraphs surrounding keywords like "admission", "eligibility", "exam", "rank", "cutoff", "counseling", "quota", "document", and "deadline".
- Extract structured items appropriately.

#### [NEW] `server/services/admissionsNormalizer.js`
- Clean parsed values, deduplicate lists.
- Compute a `confidence` score based on data completeness (e.g., scoring out of 10-11 possible fields).

#### [NEW] `server/services/admissionsScraper.js`
- Orchestrates the `admissionsParser` and `admissionsNormalizer`.
- Updates the `officialData.admissions` document via `$set` using `CollegeMaster.findOneAndUpdate`.

### 3. Orchestrator Integration

#### [MODIFY] `server/services/scraperWorkerService.js`
- Add a conditional branch in `executeJob(job)` to handle `job.scraperName === "admissions"`.
- This mirrors the Academics/Fees scraper setup, routing to `runAdmissionsScraping()`.

### 4. Verification Script

#### [NEW] `server/scripts/verifyAdmissionsScraper.js`
- Run isolated tests mapping to the required scenarios:
  1. Empty pages
  2. Malformed HTML
  3. Multiple admission formats (tables vs lists)
  4. Duplicate values
  5. Rank extraction (EAMCET / JEE specific)
  6. Quota extraction (NRI / Management)
  7. Confidence scoring logic
- Output `admissions-scraper-report.json` and `admissions-scraper-verification.json`.

---

## User Review Required

> [!IMPORTANT]  
> Please confirm if the `CollegeMaster.js` schema additions are acceptable as outlined above. 
> 
> **Open Question:** For `eamcetRanks`, `jeeRanks`, and `cutoffRanges`, I am proposing we store these as `String` (e.g., "15000-25000" or "Below 10000") since cutoffs are often presented as text ranges rather than strict singular integers. Let me know if you prefer a different data type.
