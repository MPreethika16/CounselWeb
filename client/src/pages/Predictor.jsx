import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, GraduationCap, CheckCircle2, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { API_URL } from "../config/api";
import { useCounsel } from "../context/CounselContext";
import "./Predictor.css";
import MultiSelect from "../components/MultiSelect";
import SearchableSelect from "../components/SearchableSelect";
import { getBranchType } from "../utils/branchLogic";

const REQUIRED_FIELD_ORDER = ["rank", "category", "gender", "branchType", "selectedBranchCode"];
const FIELD_ERROR_MESSAGE = "Please fill this field.";

const CATEGORY_OPTIONS = ["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST"].map((c) => ({
  value: c,
  label: c,
}));

const GENDER_OPTIONS = [
  { value: "BOYS", label: "Boys" },
  { value: "GIRLS", label: "Girls" },
];

const SPECIAL_CATEGORY_OPTIONS = ["None", "NCC", "Sports", "CAP", "PH", "EWS", "Others"].map((c) => ({
  value: c,
  label: c,
}));

const BRANCH_TYPE_OPTIONS = [
  { value: "computing", label: "Computing" },
  { value: "electrical", label: "Electrical" },
  { value: "core", label: "Core" },
  { value: "agriculture", label: "Agriculture & Food" },
  { value: "medical", label: "Medical & Pharma" },
  { value: "other", label: "Other" },
];

function FieldError({ show }) {
  if (!show) return null;
  return (
    <p className="predictor-field-error" role="alert">
      {FIELD_ERROR_MESSAGE}
    </p>
  );
}

// Helper to format dynamic cutoff label
function formatCutoffLabel(category, gender) {
  if (!category || !gender) return "Cutoff";
  const catFormatted = String(category).replace(/_/g, "-");
  const genFormatted = String(gender).toLowerCase() === "girls" ? "Girls" : "Boys";
  return `${catFormatted} ${genFormatted} Cutoff`;
}

// Calculate a student-friendly admission chance percentage.
// Based on: how close the user's rank is to the college cutoff.
// A perfect rank match = ~95%. Wider gap = lower %.
function calcChancePct(userRank, cutoff) {
  if (!cutoff || !userRank) return null;
  // Distance ratio: how far the rank is from cutoff, relative to cutoff
  const ratio = Math.abs(userRank - cutoff) / cutoff;
  // Map: 0% distance → 95%, 50% distance → 60%, 100%+ → capped at 50%
  const raw = Math.round(95 - ratio * 70);
  return Math.max(50, Math.min(97, raw));
}

// Student-friendly result card
function PredictorCollegeCard({ college, category, gender }) {
  const avgPkg = college.placements?.avgPackage;
  const pct = college.chancePct;
  const badgeClass = college.badgeClass;
  const badgeLabel = pct ? `${pct}% Chance` : college.matchLabel;

  return (
    <div className={`predictor-result-card ${college.isRelaxedMatch ? "nearest-match-card" : ""}`}>
      {/* Zone 1 — College code + badge (fixed height) */}
      <div className="card-zone-1">
        <span className="college-code-badge">{college.collegeCode}</span>
        <span className={badgeClass}>{badgeLabel}</span>
      </div>

      {/* Zone 2 — College name (fixed 2-line height) */}
      <div className="card-zone-2">
        <h3 className="college-name-title" title={college.name}>
          {college.name}
        </h3>
      </div>

      {/* Zone 3 — Location (fixed height, single line) */}
      <div className="card-zone-3">
        <p className="college-location-text">
          <MapPin size={11} className="location-pin-icon" />
          <span>
            {college.place}
            {college.district ? `, ${college.district}` : ""}
          </span>
        </p>
      </div>

      {/* Zone 4 — Metrics box (always at the same position) */}
      <div className="card-zone-4">
        <div className="card-specs-grid">
          <div className="spec-item">
            <span className="spec-label">Branch</span>
            <span
              className="spec-value highlight-branch"
              title={`${college.branchCode} - ${college.branch}`}
            >
              {college.branchCode} – {college.branch}
            </span>
          </div>
          <div className="spec-item">
            <span className="spec-label">{formatCutoffLabel(category, gender)}</span>
            <span className="spec-value">
              {college.cutoff ? college.cutoff.toLocaleString() : "N/A"}
            </span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Annual Fee</span>
            <span className="spec-value">
              {college.fees ? `₹${college.fees.toLocaleString()}` : "N/A"}
            </span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Avg Package</span>
            <span className="spec-value">
              {avgPkg ? `₹${avgPkg} LPA` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 5 — Footer CTA (always at bottom) */}
      <div className="card-zone-5">
        <Link
          to={
            college.year
              ? `/college/${college.collegeCode}?year=${college.year}`
              : `/college/${college.collegeCode}`
          }
          className="view-details-link"
        >
          <span>View Details</span>
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function Predictor() {
  const [districts, setDistricts] = useState([]);
  const {
    rank, setRank,
    category, setCategory,
    gender, setGender,
    selectedDistricts, setSelectedDistricts,
    maxFees, setMaxFees,
    strictDistrictFilter, setStrictDistrictFilter,
    specialCategory, setSpecialCategory,
    selectedBranchCode, setSelectedBranchCode,
    branchType, setBranchType,
    strongMatches, setStrongMatches,
    backupResults, setBackupResults,
    bestMatchResults, setBestMatchResults,
    competitiveResults, setCompetitiveResults,
    hasSearched, setHasSearched,
    preferences, setPreferences,
    setMissingMessages,
    resetState
  } = useCounsel();

  const [trustMeta, setTrustMeta] = useState({ confidenceScore: null, datasetYear: null });
  const [districtSelectVal, setDistrictSelectVal] = useState("");
  const [specialCategoryMsg, setSpecialCategoryMsg] = useState("");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Fallback mode: true when we had to relax rank to find branch colleges
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackBranch, setFallbackBranch] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const fieldRefs = {
    rank: useRef(null),
    category: useRef(null),
    gender: useRef(null),
    branchType: useRef(null),
    selectedBranchCode: useRef(null),
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateRequiredFields = () => {
    const errors = {};
    const parsedRank = Number(rank);
    if (!String(rank ?? "").trim() || isNaN(parsedRank) || !isFinite(parsedRank) || parsedRank <= 0) {
      errors.rank = true;
    }
    if (!category) errors.category = true;
    if (!gender) errors.gender = true;
    if (!branchType) errors.branchType = true;
    if (!selectedBranchCode) errors.selectedBranchCode = true;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstInvalid = REQUIRED_FIELD_ORDER.find((key) => errors[key]);
      const el = fieldRefs[firstInvalid]?.current;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus({ preventScroll: true });
      }
      return false;
    }
    return true;
  };

  useEffect(() => {
    fetch(`${API_URL}/api/colleges/branches`)
      .then((res) => res.json())
      .then((data) => setBranches(data.branches || []))
      .catch((err) => {
        console.error("Failed to load branches", err);
        setError("Unable to connect to server. Please try again later.");
      });
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/districts`)
      .then((res) => res.json())
      .then((data) => setDistricts(data.districts || []))
      .catch((err) => console.error("Failed to load districts", err));
  }, []);

  useEffect(() => {
    if (selectedDistricts.length === 0 && strictDistrictFilter) {
      setStrictDistrictFilter(false);
    }
  }, [selectedDistricts, strictDistrictFilter, setStrictDistrictFilter]);

  const branchGroups = useMemo(() => {
    const groups = {
      computing: new Map(), electrical: new Map(), core: new Map(),
      agriculture: new Map(), medical: new Map(), other: new Map()
    };
    branches.forEach((item) => {
      if (!item.branch && !item.branchCode) return;
      const branchName = item.branch || item.branchCode || "Unknown";
      const branchCode = item.branchCode || "";
      const type = getBranchType(branchName, branchCode);
      if (!groups[type]) return;
      const label = branchCode ? `${branchCode} - ${branchName}` : branchName;
      groups[type].set(label, { code: branchCode, branch: branchName, label });
    });
    return {
      computing: [...groups.computing.values()].sort((a, b) => a.label.localeCompare(b.label)),
      electrical: [...groups.electrical.values()].sort((a, b) => a.label.localeCompare(b.label)),
      core: [...groups.core.values()].sort((a, b) => a.label.localeCompare(b.label)),
      agriculture: [...groups.agriculture.values()].sort((a, b) => a.label.localeCompare(b.label)),
      medical: [...groups.medical.values()].sort((a, b) => a.label.localeCompare(b.label)),
      other: [...groups.other.values()].sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [branches]);

  const handlePredict = async () => {
    if (!validateRequiredFields()) return;

    const activeBranch = selectedBranchCode || (preferences && preferences.length > 0 ? preferences[0] : null);
    if (!activeBranch) return;

    // Clear stale prediction results and reset fallback state before starting loading
    setStrongMatches([]);
    setBackupResults([]);
    setBestMatchResults([]);
    setCompetitiveResults([]);
    setIsFallback(false);
    setFallbackBranch("");

    try {
      setLoading(true);
      setHasSearched(true);
      setError("");

      // ── Primary call: exact rank + category + gender + branch ─────────
      const res = await fetch(`${API_URL}/api/predictor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rank: Number(rank),
          category,
          gender,
          districts: selectedDistricts,
          branch: activeBranch,
          selectedBranch: activeBranch,
          maxFees: maxFees ? Number(maxFees) : "",
          specialCategory,
          strictDistrictFilter
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStrongMatches([]);
        setBackupResults([]);
        setBestMatchResults([]);
        setCompetitiveResults([]);
        setIsFallback(false);
        setFallbackBranch("");
        setError(data.error || "Prediction failed");
        setLoading(false);
        return;
      }

      let matches = data.strongMatches || data.colleges || [];
      let usedFallback = false;

      // ── Fallback call: if primary returns no results, fetch ALL branch ─
      // colleges by sending rank=1 (best possible rank → qualifies for
      // every cutoff). Branch filtering is kept; rank restriction is removed.
      if (matches.length === 0) {
        try {
          const fbRes = await fetch(`${API_URL}/api/predictor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rank: 1,           // rank 1 qualifies for all colleges
              category,
              gender,
              branch: activeBranch,
              selectedBranch: activeBranch,
              specialCategory,
              // no district / fee filters in fallback — get as many as possible
            }),
          });
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            const fbMatches = fbData.strongMatches || fbData.colleges || [];
            if (fbMatches.length > 0) {
              matches = fbMatches;
              usedFallback = true;
            }
          }
        } catch {
          // fallback call failed silently — continue with empty matches
        }
      }

      setStrongMatches(matches);
      setBackupResults([]);
      setBestMatchResults([]);
      setCompetitiveResults([]);
      setIsFallback(usedFallback);
      setFallbackBranch(usedFallback ? activeBranch : "");

      setMissingMessages(data.missingMessages || {});
      setSpecialCategoryMsg(data.specialCategoryMessage || "");
      setTrustMeta({ confidenceScore: data.confidenceScore || null, datasetYear: data.datasetYear || null });
    } catch {
      setStrongMatches([]);
      setBackupResults([]);
      setBestMatchResults([]);
      setCompetitiveResults([]);
      setIsFallback(false);
      setFallbackBranch("");
      setError("Prediction failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    resetState();
    setDistrictSelectVal("");
    setSpecialCategoryMsg("");
    setIsFallback(false);
    setFallbackBranch("");
    setFieldErrors({});
  };

  // Memoized result partitioner — max 5 unique colleges with chance % labels.
  // In fallback mode (rank too extreme, no close-rank match), all colleges
  // from the branch-wide pool are labelled "Available Option".
  const processedColleges = useMemo(() => {
    if (!strongMatches || strongMatches.length === 0) return [];

    const userRank = Number(rank) || 0;

    // Annotate with relaxed-match flag.
    // In fallback mode, ALL colleges are relaxed (rank was not used for filtering).
    const annotated = strongMatches.map((c) => {
      if (isFallback) return { ...c, isRelaxedMatch: true };
      const districtMatch = selectedDistricts.length === 0 || selectedDistricts.includes(c.district);
      const feeLimit = maxFees ? Number(maxFees) : null;
      const feeMatch = !feeLimit || c.fees <= feeLimit;
      return { ...c, isRelaxedMatch: !districtMatch || !feeMatch };
    });

    // Deduplicate by collegeCode + branchCode
    const deduplicated = [];
    const seen = new Set();
    annotated.forEach((c) => {
      const key = `${c.collegeCode}_${c.branchCode}`.toLowerCase();
      if (!seen.has(key)) { seen.add(key); deduplicated.push(c); }
    });

    // Sort: in fallback mode sort by cutoff ascending (lowest/best cutoff first);
    // in normal mode sort by nearest cutoff distance to user rank.
    const sorted = [...deduplicated].sort((a, b) => {
      if (isFallback) return (a.cutoff || 0) - (b.cutoff || 0);
      return Math.abs((a.cutoff || 0) - userRank) - Math.abs((b.cutoff || 0) - userRank);
    });

    // Find the single best non-relaxed match (only relevant in non-fallback mode)
    let closestId = null;
    let minDist = Infinity;
    if (!isFallback) {
      sorted.forEach((c) => {
        if (!c.isRelaxedMatch) {
          const d = Math.abs((c.cutoff || 0) - userRank);
          if (d < minDist) { minDist = d; closestId = `${c.collegeCode}_${c.branchCode}`.toLowerCase(); }
        }
      });
      if (!closestId && sorted.length > 0) {
        let minOverall = Infinity;
        sorted.forEach((c) => {
          const d = Math.abs((c.cutoff || 0) - userRank);
          if (d < minOverall) { minOverall = d; closestId = `${c.collegeCode}_${c.branchCode}`.toLowerCase(); }
        });
      }
    }

    // Label with chance % and badge class
    const labeled = sorted.map((c) => {
      const key = `${c.collegeCode}_${c.branchCode}`.toLowerCase();
      const pct = isFallback ? null : calcChancePct(userRank, c.cutoff);

      let matchLabel, badgeClass;
      if (isFallback || c.isRelaxedMatch) {
        matchLabel = "Available Option";
        badgeClass = "chance-badge-option";
      } else if (key === closestId) {
        matchLabel = "Very High Chance";
        badgeClass = "chance-badge-veryhigh";
      } else if (pct && pct >= 88) {
        matchLabel = "High Chance";
        badgeClass = "chance-badge-high";
      } else if (pct && pct >= 75) {
        matchLabel = "Good Chance";
        badgeClass = "chance-badge-good";
      } else {
        matchLabel = "Available Option";
        badgeClass = "chance-badge-option";
      }

      return { ...c, matchLabel, badgeClass, chancePct: pct };
    });

    return labeled.slice(0, 5);
  }, [strongMatches, selectedDistricts, maxFees, rank, isFallback]);

  return (
    <div className="predictor-container page-wrapper">
      {/* Page Header — clean, no badge label */}
      <div className="predictor-header-section">
        <h1 className="section-title">College Predictor</h1>
        <p className="section-subtitle">
          Find colleges matching your TS EAPCET rank, category and branch.
        </p>
      </div>

      {error && (
        <div className="warning-alert">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="predictor-grid-layout">
        {/* Left Column: Form */}
        <div className="predictor-sidebar">
          <div className="predictor-form-card">

            {/* Basic Details */}
            <div className="form-section">
              <div className="form-section-title">Basic Details</div>

              <div className="predictor-input-group">
                <label className="predictor-field-label" htmlFor="predictor-rank">TS EAPCET Hall Ticket Rank *</label>
                <input
                  id="predictor-rank"
                  ref={fieldRefs.rank}
                  className={`predictor-input${fieldErrors.rank ? " has-error" : ""}`}
                  type="number"
                  placeholder="e.g., 15000"
                  value={rank}
                  onChange={(e) => {
                    setRank(e.target.value);
                    clearFieldError("rank");
                  }}
                  aria-invalid={fieldErrors.rank || undefined}
                />
                <FieldError show={fieldErrors.rank} />
              </div>

              <div className="form-row-2col">
                <div className="predictor-input-group">
                  <label className="predictor-field-label" id="predictor-category-label">Category *</label>
                  <SearchableSelect
                    ref={fieldRefs.category}
                    value={category}
                    onChange={(val) => {
                      setCategory(val);
                      clearFieldError("category");
                    }}
                    options={CATEGORY_OPTIONS}
                    placeholder="Select"
                    searchable={false}
                    hasError={fieldErrors.category}
                    aria-labelledby="predictor-category-label"
                  />
                  <FieldError show={fieldErrors.category} />
                </div>
                <div className="predictor-input-group">
                  <label className="predictor-field-label" id="predictor-gender-label">Gender *</label>
                  <SearchableSelect
                    ref={fieldRefs.gender}
                    value={gender}
                    onChange={(val) => {
                      setGender(val);
                      clearFieldError("gender");
                    }}
                    options={GENDER_OPTIONS}
                    placeholder="Select"
                    searchable={false}
                    hasError={fieldErrors.gender}
                    aria-labelledby="predictor-gender-label"
                  />
                  <FieldError show={fieldErrors.gender} />
                </div>
              </div>

              <div className="predictor-input-group">
                <label className="predictor-field-label" id="predictor-special-label">Special Reservation (Optional)</label>
                <SearchableSelect
                  value={specialCategory}
                  onChange={setSpecialCategory}
                  options={SPECIAL_CATEGORY_OPTIONS}
                  placeholder="None"
                  searchable={false}
                  aria-labelledby="predictor-special-label"
                />
              </div>
            </div>

            {/* Preferences */}
            <div className="form-section">
              <div className="form-section-title">Preferences</div>

              <div className="predictor-input-group">
                <label className="predictor-field-label" id="predictor-branch-type-label">Branch Category *</label>
                <SearchableSelect
                  ref={fieldRefs.branchType}
                  value={branchType}
                  onChange={(val) => {
                    setBranchType(val);
                    setSelectedBranchCode("");
                    clearFieldError("branchType");
                    clearFieldError("selectedBranchCode");
                  }}
                  options={BRANCH_TYPE_OPTIONS}
                  placeholder="Select Category"
                  searchable={false}
                  hasError={fieldErrors.branchType}
                  aria-labelledby="predictor-branch-type-label"
                />
                <FieldError show={fieldErrors.branchType} />
              </div>

              <div className="predictor-input-group">
                <label className="predictor-field-label" id="predictor-branch-label">Specific Branch *</label>
                <SearchableSelect
                  ref={fieldRefs.selectedBranchCode}
                  value={selectedBranchCode}
                  onChange={(val) => {
                    setSelectedBranchCode(val);
                    clearFieldError("selectedBranchCode");
                  }}
                  options={branchGroups[branchType] || []}
                  getOptionValue={(opt) => opt.code}
                  getOptionLabel={(opt) => opt.label}
                  placeholder={branchType ? "Select Branch" : "Select category first"}
                  disabled={!branchType}
                  searchable={true}
                  hasError={fieldErrors.selectedBranchCode}
                  aria-labelledby="predictor-branch-label"
                  renderOption={(opt) => (
                    <span className="branch-option-content">
                      <span className="branch-option-code">{opt.code}</span>
                      <span className="branch-option-name">{opt.branch}</span>
                    </span>
                  )}
                  renderValue={(opt) => (
                    <span className="branch-trigger-value">
                      <span className="branch-trigger-code">{opt.code}</span>
                      <span className="branch-trigger-sep">—</span>
                      <span className="branch-trigger-name">{opt.branch}</span>
                    </span>
                  )}
                />
                <FieldError show={fieldErrors.selectedBranchCode} />
              </div>

              <div className="predictor-input-group">
                <label className="predictor-field-label" id="predictor-districts-label">Preferred Districts (Optional)</label>
                <MultiSelect
                  predictor
                  options={districts}
                  selected={selectedDistricts}
                  onChange={setSelectedDistricts}
                  placeholder="All Districts"
                  searchable={true}
                />
              </div>

              {selectedDistricts.length > 0 && (
                <div className="predictor-input-group">
                  <label className="predictor-field-label predictor-checkbox-label">
                    <input
                      type="checkbox"
                      checked={strictDistrictFilter}
                      onChange={(e) => setStrictDistrictFilter(e.target.checked)}
                    />
                    Strict District Filter (Only show selected)
                  </label>
                </div>
              )}

              <div className="predictor-input-group">
                <label className="predictor-field-label">Annual Fee Limit (Optional)</label>
                <input
                  className="predictor-input"
                  type="number"
                  placeholder="e.g. 100000"
                  value={maxFees}
                  onChange={(e) => setMaxFees(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions-container">
              <button
                className="predictor-btn predictor-btn-primary"
                onClick={handlePredict}
                disabled={loading}
              >
                {loading ? "Analyzing…" : "Find Colleges"}
              </button>
              <button
                className="predictor-btn predictor-btn-outline"
                onClick={resetFilters}
              >
                Reset
              </button>
            </div>

            <p className="advisory-text">
              Predictions are advisory based on previous cutoff trends.
            </p>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="predictor-results-pane">

          {/* Empty State */}
          {!hasSearched && !loading && (
            <div className="predictor-guidance-card">
              <div className="guidance-icon-wrapper">
                <GraduationCap size={26} className="guidance-main-icon" />
              </div>
              <h3 className="guidance-title">Find your best college matches</h3>
              <p className="guidance-text">
                Enter your rank, category and branch to get personalised college recommendations with admission chances.
              </p>

              <div className="guidance-divider" />

              <div className="guidance-checklist-container">
                <div className="guidance-checklist-title">What you need to get started</div>
                <ul className="guidance-checklist">
                  <li>
                    <CheckCircle2 size={14} className="checklist-icon" />
                    <span>Your TS EAPCET Rank and Category</span>
                  </li>
                  <li>
                    <CheckCircle2 size={14} className="checklist-icon" />
                    <span>Preferred Branch</span>
                  </li>
                  <li>
                    <CheckCircle2 size={14} className="checklist-icon" />
                    <span>Optional: District and fee filters</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Skeleton Loader */}
          {loading && (
            <div className="results-container">
              <div className="loading-header-block">
                <h3 className="loading-title">Analysing college matches…</h3>
                <p className="loading-subtitle">
                  Checking cutoff trends, category rules and branch availability.
                </p>
              </div>
              <div className="results-grid-two">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="skeleton-card">
                    <div className="card-top-row">
                      <div className="skeleton-line skeleton-code" />
                      <div className="skeleton-line skeleton-badge" />
                    </div>
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line skeleton-text" />
                    <div className="skeleton-grid">
                      <div className="skeleton-line skeleton-grid-item" />
                      <div className="skeleton-line skeleton-grid-item" />
                      <div className="skeleton-line skeleton-grid-item" />
                      <div className="skeleton-line skeleton-grid-item" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {hasSearched && !loading && processedColleges.length > 0 && (
            <div className="results-container">

              {/* Results Header */}
              <div className="results-header-block">
                <h2 className="results-main-heading">Best Matching Colleges</h2>
                <p className="results-sub-heading-text">
                  Top recommendations based on your rank and preferences.
                </p>
                <div className="results-metadata-chips">
                  <span className="metadata-chip">Rank {Number(rank).toLocaleString()}</span>
                  <span className="metadata-chip">{category}</span>
                  <span className="metadata-chip">{gender === "BOYS" ? "Boys" : "Girls"}</span>
                  <span className="metadata-chip">{selectedBranchCode || "Any"}</span>
                </div>
              </div>

              {/* Special Category Alert */}
              {specialCategoryMsg && (
                <div className="info-alert">
                  <Info size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ fontWeight: "700", display: "block", marginBottom: "2px", color: "var(--primary)" }}>
                      Reservation Advantage Applied
                    </strong>
                    <span>{specialCategoryMsg}</span>
                  </div>
                </div>
              )}

              {/* Fallback helper note — only shown when rank had no close matches */}
              {isFallback && (
                <div className="fallback-note">
                  <Info size={13} className="fallback-note-icon" />
                  <span>
                    No close-rank matches found for <strong>{fallbackBranch}</strong>.
                    Showing top available colleges offering this branch.
                  </span>
                </div>
              )}

              {/* Cards Grid */}
              <div className="results-grid-two">
                {processedColleges.map((c) => (
                  <PredictorCollegeCard
                    key={`${c.collegeCode}_${c.branchCode}`}
                    college={c}
                    category={category}
                    gender={gender}
                  />
                ))}
              </div>

              {/* Advisory */}
              <p className="results-advisory-note">
                Admission chances are indicative and based on previous year cutoff trends. Actual results may vary.
              </p>
            </div>
          )}

          {/* No results state — only shown if branch has zero colleges in DB */}
          {hasSearched && !loading && processedColleges.length === 0 && !error && (
            <div className="predictor-guidance-card">
              <div className="guidance-icon-wrapper">
                <AlertTriangle size={24} style={{ color: "var(--text-muted)" }} />
              </div>
              <h3 className="guidance-title">No colleges found for this branch</h3>
              <p className="guidance-text">
                This branch may not be offered by any college in our dataset yet.
                Try selecting a different branch, or check back after the dataset is updated.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Predictor;
