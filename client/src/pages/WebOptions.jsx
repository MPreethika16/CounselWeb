import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Preferences from "../components/Preferences";
import { Download, Share2, Save, FileText, Settings2, GripVertical, CheckCircle2, AlertTriangle, Info, ArrowLeft, ArrowRight, List, User, X, MapPin, ChevronRight } from "lucide-react";
import { API_URL } from "../config/api";
import { getCookie } from "../utils/cookie";
import InfoTooltip from "../components/InfoTooltip";

import logger from "../utils/logger";
import MultiSelect from "../components/MultiSelect";
import { useCounsel } from "../context/CounselContext";
import { useAuth } from "../context/AuthContext";
import { downloadJSON, downloadCSV, shareToClipboard, generatePDF } from "../utils/counselUtils";
import '../styles/web-options-mobile.css';
import '../styles/web-options-cards.css';
import './Predictor.css';

const SECTION_TOOLTIPS = {
  competitive:
    "Ambitious choices that may be difficult to get seat, but worth trying.",
  bestmatch:
    "Strong and realistic choices for your rank.",
  backup:
    "Safer choices with a higher chance of admission.",
};

const WEB_OPTION_SECTIONS = [
  {
    key: "competitive",
    title: "Competitive Colleges",
    headingClass: "wo-options-section-heading--competitive",
    tooltip: SECTION_TOOLTIPS.competitive,
    match: (riskLabel) => normalizeRiskKey(riskLabel) === "competitive",
  },
  {
    key: "bestmatch",
    title: "Best Match Colleges",
    headingClass: "wo-options-section-heading--match",
    tooltip: SECTION_TOOLTIPS.bestmatch,
    match: (riskLabel) => normalizeRiskKey(riskLabel) === "bestmatch",
  },
  {
    key: "backup",
    title: "Backup Colleges",
    headingClass: "wo-options-section-heading--backup",
    tooltip: SECTION_TOOLTIPS.backup,
    match: (riskLabel) => normalizeRiskKey(riskLabel) === "backup",
  },
];

function normalizeRiskKey(riskLabel) {
  const r = String(riskLabel || "");
  if (r === "Backup" || r === "Safe") return "backup";
  if (r === "BestMatch" || r === "Moderate") return "bestmatch";
  if (r === "Competitive" || r === "Dream") return "competitive";
  return "competitive";
}

function getRiskSortOrder(riskLabel) {
  const key = normalizeRiskKey(riskLabel);
  if (key === "competitive") return 0;
  if (key === "bestmatch") return 1;
  return 2;
}

function sortWebOptionsByRiskCategory(options) {
  const sorted = [...options].sort((a, b) => {
    const riskDiff = getRiskSortOrder(a.riskLabel) - getRiskSortOrder(b.riskLabel);
    if (riskDiff !== 0) return riskDiff;
    const scoreA = a.matchScore !== undefined ? a.matchScore : (a.score !== undefined ? a.score : 0);
    const scoreB = b.matchScore !== undefined ? b.matchScore : (b.score !== undefined ? b.score : 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const cutoffA = a.cutoff !== undefined ? a.cutoff : Infinity;
    const cutoffB = b.cutoff !== undefined ? b.cutoff : Infinity;
    return cutoffA - cutoffB;
  });
  return sorted.map((item, idx) => ({ ...item, priority: idx + 1 }));
}

function formatCutoffLabel(category, gender) {
  if (!category || !gender) return "Cutoff";
  const catFormatted = String(category).replace(/_/g, "-");
  const genFormatted = String(gender).toLowerCase() === "girls" ? "Girls" : "Boys";
  return `${catFormatted} ${genFormatted} Cutoff`;
}

function getMatchBadgeMeta(riskLabel) {
  const key = normalizeRiskKey(riskLabel);
  const titles = { competitive: "Competitive", bestmatch: "Best Match", backup: "Backup" };
  const badgeClass =
    key === "backup"
      ? "chance-badge-veryhigh"
      : key === "bestmatch"
      ? "chance-badge-good"
      : "option-number-badge--competitive";
  return {
    title: titles[key],
    badgeClass,
  };
}

function WebOptionSection({ title, headingClass, tooltip, items, getResultIndex, category, gender, dragIndex, dragOverIndex, onDragStart, onDragOver, onDrop, onDragEnd }) {
  if (!items.length) return null;

  return (
    <section className="wo-options-section" aria-label={title}>
      <h3 className={`wo-options-section-heading ${headingClass}`}>
        {title}
        <InfoTooltip text={tooltip} />
      </h3>
      <div className="wo-priority-list" role="list">
        {items.map((college) => {
          const index = getResultIndex(college);
          return (
            <WebOptionCard
              key={`${college.collegeCode}_${college.branchCode}_${college.priority}`}
              college={college}
              category={category}
              gender={gender}
              index={index}
              isDragging={dragIndex === index}
              isDragOver={dragOverIndex === index}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          );
        })}
      </div>
    </section>
  );
}

function WebOptionCard({
  college,
  category,
  gender,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const avgPkg = college.placements?.avgPackage;
  const cutoffLabel = formatCutoffLabel(
    category || college.categoryUsed || college.category,
    gender || college.genderUsed || college.gender
  );
  const { title, badgeClass } = getMatchBadgeMeta(college.riskLabel);
  const branchCode = college.branchCode || "—";
  const branchDisplay = college.branch || "";

  const detailHref = college.year
    ? `/college/${college.collegeCode}?year=${college.year}`
    : `/college/${college.collegeCode}`;

  return (
    <article
      className={`predictor-result-card wo-option-card${isDragging ? " is-dragging" : ""}${isDragOver ? " is-drag-over" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="wo-option-drag" aria-hidden="true">
        <GripVertical size={16} strokeWidth={2} />
      </div>

      <div className="wo-option-card-body">
        <div className="wo-option-top-row">
          <div className="wo-option-top-left">
            <span className="wo-priority-index-badge" aria-label={`Priority ${college.priority}`}>
              {college.priority}
            </span>
            <span className="wo-branch-code-badge">{branchCode}</span>
          </div>
          <span className={`wo-match-badge ${badgeClass}`}>{title}</span>
        </div>

        <div className="card-zone-2">
          <h3 className="college-name-title" title={college.name}>
            {college.name}
          </h3>
        </div>

        <div className="card-zone-3">
          <p className="college-location-text">
            <MapPin size={10} className="location-pin-icon" aria-hidden="true" />
            <span>
              {college.place}
              {college.district ? `, ${college.district}` : ""}
            </span>
          </p>
        </div>

        <div className="card-zone-4">
          <div className="card-specs-grid">
            <div className="spec-item">
              <span className="spec-label">Branch</span>
              <span className="spec-value highlight-branch" title={branchDisplay}>
                {branchDisplay || "N/A"}
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">{cutoffLabel}</span>
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

        <div className="card-zone-5">
          <Link to={detailHref} className="view-details-link" onClick={(e) => e.stopPropagation()}>
            <span>View Details</span>
            <ChevronRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function WebOptions() {
  const navigate = useNavigate();
  const [districts, setDistricts] = useState([]);
  const {
    rank, setRank,
    category, setCategory,
    gender, setGender,
    selectedDistricts: preferredDistricts, setSelectedDistricts: setPreferredDistricts,
    maxFees, setMaxFees,
    strictDistrictFilter, setStrictDistrictFilter,
    specialCategory, setSpecialCategory,
    preferences, setPreferences,
    optionLimit, setOptionLimit,
    customLimit, setCustomLimit,
    riskFilters, setRiskFilters,
    results, setResults,
    strategySummary, setStrategySummary,
    total, setTotal,
    pages, setPages,
    page, setPage,
    resetState
  } = useCounsel();

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const { user } = useAuth();
  const [branchOptions, setBranchOptions] = useState([]);
  const [preferTopColleges, setPreferTopColleges] = useState(true);
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (user) {
      if (user.name) setStudentName(user.name);
      if (user.email) setStudentEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    fetch(`${API_URL}/api/colleges/branches`)
      .then((res) => res.json())
      .then((data) => setBranchOptions(data.branches || []))
      .catch((err) => logger.error("Failed to load branches", err));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/districts`)
      .then((res) => res.json())
      .then((data) => setDistricts(data.districts || []))
      .catch((err) => logger.error("Failed to load districts", err));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rankParam = params.get("rank");
    const categoryParam = params.get("category");
    const genderParam = params.get("gender");
    const preferencesParam = params.get("preferences");

    if (rankParam && categoryParam && genderParam) {
      setRank(rankParam);
      setCategory(categoryParam);
      setGender(genderParam);
      
      const cleanPrefs = preferencesParam ? preferencesParam.split(",") : [];
      setPreferences(cleanPrefs);

      const districtsParam = params.get("districts");
      const cleanDistricts = districtsParam ? districtsParam.split(",") : [];
      setPreferredDistricts(cleanDistricts);

      const maxFeesParam = params.get("maxFees") || "";
      setMaxFees(maxFeesParam);

      const strictDistrictParam = params.get("strictDistrictFilter") === "true";
      setStrictDistrictFilter(strictDistrictParam);

      const specialParam = params.get("specialCategory") || "None";
      setSpecialCategory(specialParam);

      const riskParam = params.get("riskFilters");
      const cleanRisks = riskParam ? riskParam.split(",") : [];
      setRiskFilters(cleanRisks);

      const limitParam = params.get("optionLimit");
      let cleanLimit = 50;
      if (limitParam) {
        const parsed = parseInt(limitParam, 10);
        if (!isNaN(parsed) && Number.isFinite(parsed) && parsed > 0) {
          cleanLimit = parsed;
        }
      }
      setOptionLimit(cleanLimit);

      const customLimitParam = params.get("customLimit") || "";
      setCustomLimit(customLimitParam);

      // Auto-trigger API call
      setLoading(true);
      setError("");
      setCurrentStep(3); // Direct transition to generated options list

      const cleanRiskFilters = cleanRisks.map((f) => {
        if (f === "Competitive" || f === "Dream") return "Dream";
        if (f === "BestMatch" || f === "Moderate") return "Moderate";
        if (f === "Backup" || f === "Safe") return "Safe";
        return f;
      });

      let finalLimit = cleanLimit;
      if (customLimitParam) {
        const parsedCustom = parseInt(customLimitParam, 10);
        if (!isNaN(parsedCustom) && Number.isFinite(parsedCustom) && parsedCustom > 0) {
          finalLimit = parsedCustom;
        }
      }

      fetch(`${API_URL}/api/web-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rank: Number(rankParam),
          category: categoryParam,
          gender: genderParam,
          preferences: cleanPrefs,
          preferredDistricts: cleanDistricts,
          strictDistrictFilter: strictDistrictParam,
          maxFees: maxFeesParam ? Number(maxFeesParam) : "",
          riskFilters: cleanRiskFilters,
          optionLimit: finalLimit,
          specialCategory: specialParam
        })
      })
        .then((res) => res.json())
        .then((data) => {
          setResults(data.options || []);
          setStrategySummary(data.strategySummary || null);
          setPages(data.pages || 1);
          setTotal(data.total || 0);
        })
        .catch((err) => {
          logger.error(err);
          setError("Failed to load options from share link");
        })
        .finally(() => setLoading(false));
    } else {
      const id = params.get("id");
      if (id) {
        setLoading(true);
        fetch(`${API_URL}/api/options/${id}`)
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch shared options");
            return res.json();
          })
          .then((data) => {
            if (data?.options) {
              const inputs = data.inputs || {};
              if (inputs.rank) setRank(inputs.rank);
              if (inputs.category) setCategory(inputs.category);
              if (inputs.gender) setGender(inputs.gender);
              if (inputs.specialCategory) setSpecialCategory(inputs.specialCategory);
              if (inputs.preferences) setPreferences(inputs.preferences);
              if (inputs.preferredDistricts) setPreferredDistricts(inputs.preferredDistricts);
              if (inputs.strictDistrictFilter !== undefined) setStrictDistrictFilter(inputs.strictDistrictFilter);
              if (inputs.maxFees) setMaxFees(inputs.maxFees);
              if (inputs.riskFilters) setRiskFilters(inputs.riskFilters);
              if (inputs.optionLimit) setOptionLimit(inputs.optionLimit);
              if (inputs.customLimit) setCustomLimit(inputs.customLimit);
              if (inputs.studentName) setStudentName(inputs.studentName);
              if (inputs.email) setStudentEmail(inputs.email);

              const options = data.options;
              options.sort((a, b) => (a.priority || 0) - (b.priority || 0));
              setResults(options);
              setTotal(options.length);
              setPages(1);
              setCurrentStep(3);
            } else {
              alert("Invalid share link");
            }
          })
          .catch((err) => {
            logger.error("Failed to load shared options:", err);
            alert("Failed to load shared options");
          })
          .finally(() => setLoading(false));
      }
    }
  }, []);

  useEffect(() => {
    if (rank && category && gender && preferences.length > 0 && results.length > 0) {
      handleGenerate(page);
    }
  }, [page]);

  const finalOptionLimit = customLimit ? Number(customLimit) : Number(optionLimit);

  async function handleGenerate(currentPage = 1) {
    if (!rank) { setError("Please enter your EAMCET Rank"); return false; }
    if (!category) { setError("Please select your Category"); return false; }
    if (!gender) { setError("Please select Gender"); return false; }
    if (preferences.length === 0) { setError("Please select at least one branch preference"); return false; }
    if (optionLimit === "custom" && (!customLimit || Number(customLimit) <= 0)) {
      setError("Please enter custom option size");
      return false;
    }

    setError("");

    const cleanPreferences = preferences.map((b) =>
      typeof b === "string" ? b : b.branchCode || b.value
    ).filter(Boolean);

    const cleanPreferredDistricts = preferredDistricts.map((d) =>
      typeof d === "string" ? d : d.district || d.value
    ).filter(Boolean);

    const cleanRiskFilters = riskFilters.map((f) => {
      if (f === "Competitive" || f === "Dream") return "Dream";
      if (f === "BestMatch" || f === "Moderate") return "Moderate";
      if (f === "Backup" || f === "Safe") return "Safe";
      return f;
    });

    const payload = {
      rank: Number(rank),
      category,
      gender,
      preferences: cleanPreferences,
      preferredDistricts: cleanPreferredDistricts,
      strictDistrictFilter,
      maxFees: maxFees ? Number(maxFees) : "",
      riskFilters: cleanRiskFilters,
      optionLimit: finalOptionLimit,
      specialCategory,
      preferTopColleges
    };

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/web-options?page=${currentPage}&limit=${finalOptionLimit}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate web options");
        setLoading(false);
        return false;
      }

      let generatedOptions = data.options || [];
      generatedOptions = sortWebOptionsByRiskCategory(generatedOptions);

      setResults(generatedOptions);
      setStrategySummary(data.strategySummary || null);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || currentPage);
      return true;
    } catch (err) {
      logger.error("Failed to generate web options:", err);
      setError("Failed to generate web options. Server connection failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateClick = async () => {
    if (!rank || !category || !gender) {
      setError("Step 1 incomplete: Rank, Category, and Gender are required.");
      setCurrentStep(1);
      return;
    }
    if (preferences.length === 0) {
      setError("Step 2 incomplete: At least one branch preference is required.");
      setCurrentStep(2);
      return;
    }
    setError("");
    const success = await handleGenerate(1);
    if (success) {
      setPage(1);
      setCurrentStep(3);
    }
  };

  const handleStep1Continue = () => {
    if (!rank || !category || !gender) {
      setError("Please fill all required student parameters.");
      return;
    }
    setError("");
    setCurrentStep(2);
  };

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOverCard = (index) => {
    if (dragIndex !== null && dragIndex !== index) setDragOverIndex(index);
  };
  const handleDrop = (index) => {
    if (dragIndex === null) return;
    const updated = [...results];
    const dragged = updated[dragIndex];
    updated.splice(dragIndex, 1);
    updated.splice(index, 0, dragged);
    const newList = updated.map((item, i) => ({ ...item, priority: i + 1 }));
    setResults(newList);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const buildSavePayload = () => {
    const compactOptions = results.map((item) => ({
      priority: item.priority,
      collegeCode: item.collegeCode,
      name: item.name,
      branch: item.branch,
      branchCode: item.branchCode,
      district: item.district,
      place: item.place,
      cutoff: item.cutoff,
      fees: item.fees,
      score: item.score,
      riskLabel: item.riskLabel
    }));

    return {
      title: `Official Sequence - ${user?.name || studentName || "Student"}`,
      inputs: {
        studentName: user?.name || studentName, email: user?.email || studentEmail, rank, category, gender, specialCategory, preferences, preferredDistricts, strictDistrictFilter, maxFees, riskFilters, optionLimit
      },
      options: compactOptions
    };
  };

  const saveOptions = async () => {
    if (!results.length) return setError("Generate options first");
    const token = getCookie("token");
    if (!token) {
      return setError("Please login to save options.");
    }

    setIsSaving(true);
    const payload = buildSavePayload();

    try {
      const res = await fetch(`${API_URL}/api/saved-options`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id) {
        setSuccess("Web options sequence saved successfully. View it in your dashboard.");
        setTimeout(() => setSuccess(""), 8000);
      } else {
        setError(data.error || data.message || "Save failed");
      }
    } catch (err) {
      setError("Server error during save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const generateShareLink = () => {
    const cleanPreferences = preferences.map((b) =>
      typeof b === "string" ? b : b.branchCode || b.value
    ).filter(Boolean);

    const cleanPreferredDistricts = preferredDistricts.map((d) =>
      typeof d === "string" ? d : d.district || d.value
    ).filter(Boolean);

    const cleanRisks = riskFilters.map((f) =>
      typeof f === "string" ? f : f.value || f
    ).filter(Boolean);

    const cleanPrefs = cleanPreferences.join(",");
    const cleanDistricts = cleanPreferredDistricts.join(",");
    const cleanRisksStr = cleanRisks.join(",");
    
    const params = new URLSearchParams();
    params.set("rank", rank);
    params.set("category", category);
    params.set("gender", gender);
    if (cleanPrefs) params.set("preferences", cleanPrefs);
    if (cleanDistricts) params.set("districts", cleanDistricts);
    if (maxFees) params.set("maxFees", maxFees);
    if (strictDistrictFilter) params.set("strictDistrictFilter", "true");
    if (specialCategory && specialCategory !== "None") params.set("specialCategory", specialCategory);
    if (cleanRisksStr) params.set("riskFilters", cleanRisksStr);
    if (optionLimit) params.set("optionLimit", optionLimit.toString());
    if (customLimit) params.set("customLimit", customLimit);
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const shareOptions = async () => {
    if (!results.length) return setError("Generate options first");
    
    const link = generateShareLink();
    try {
      await navigator.clipboard.writeText(link);
      setSuccess("Shareable option sequence link copied to clipboard!");
      setShareLink(link);
      setCopiedLink(true);
      setTimeout(() => setSuccess(""), 8000);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setError("Failed to copy link to clipboard");
    }
  };

  const indexMap = useMemo(() => {
    const map = new Map();
    results.forEach((item, idx) => {
      map.set(item, idx);
    });
    return map;
  }, [results]);

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => (a.priority || 0) - (b.priority || 0)),
    [results]
  );

  const getResultIndex = (college) =>
    results.findIndex(
      (r) =>
        r.collegeCode === college.collegeCode &&
        r.branchCode === college.branchCode &&
        r.priority === college.priority
    );

  const sectionItems = useMemo(
    () =>
      WEB_OPTION_SECTIONS.map((section) => ({
        ...section,
        items: sortedResults.filter((c) => section.match(c.riskLabel)),
      })),
    [sortedResults]
  );

  const handleStepClick = (step) => {
    if (step === 1) {
      setCurrentStep(1);
    } else if (step === 2) {
      if (!rank || !category || !gender) {
        setError("Rank, Category, and Gender are required for Step 2.");
        return;
      }
      setError("");
      setCurrentStep(2);
    } else if (step === 3) {
      if (results.length === 0) {
        handleGenerateClick();
      } else {
        setCurrentStep(3);
      }
    }
  };

  return (
    <div className="page-wrapper container wo-shell">
      {/* Hero */}
      <div className="wo-hero">
        <h1 className="wo-hero-title">Web Options Generator</h1>
        <p className="wo-hero-sub">Create your counselling option list in minutes.</p>
      </div>

      {/* Step Progress Indicator */}
      <div className="wo-progress">
        <div className="wo-progress-meta">
          <span className="wo-step-label">
            {currentStep === 1 ? 'Profile' : currentStep === 2 ? 'Preferences' : 'Results'}
          </span>
          <span className="wo-step-count">Step {currentStep} of 3</span>
        </div>
        <div className="wo-progress-track">
          <div className="wo-progress-fill" style={{ width: `${Math.round((currentStep / 3) * 100)}%` }} />
        </div>
      </div>

      {error && (
        <div className="warning-alert" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="glass-card" style={{ padding: "14px", background: "rgba(22, 163, 74, 0.05)", border: "1px solid rgba(22, 163, 74, 0.15)", color: "var(--success)", borderRadius: "8px", marginBottom: "24px", textAlign: "center", fontWeight: "600", fontSize: '13px' }}>
          <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: "middle", marginRight: "8px" }} />
          {success} {success.includes("saved successfully") && <Link to="/dashboard" style={{ textDecoration: "underline", color: "var(--primary)", marginLeft: '6px' }}>View in Dashboard</Link>}
        </div>
      )}

      {/* STEP 1: STUDENT PROFILE DETAILS */}
      {currentStep === 1 && (
        <div className="glass-card counsel-form-card wo-form-card" style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
            Student Profile
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2 counsel-form-row-2col">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="counsel-field-label">Candidate Full Name</label>
                <input className="input-field counsel-form-input" type="text" placeholder="e.g., Preethika M" value={user?.name || studentName} onChange={(e) => setStudentName(e.target.value)} disabled={!!user} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="counsel-field-label">Primary Email Address</label>
                <input className="input-field counsel-form-input" type="email" placeholder="e.g., student@example.com" value={user?.email || studentEmail} onChange={(e) => setStudentEmail(e.target.value)} disabled={!!user} />
              </div>
            </div>

            <div className="grid-2 counsel-form-row-2col">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="counsel-field-label">TS EAPCET 2026 Rank *</label>
                <input className="input-field counsel-form-input" type="number" placeholder="Enter Hall Ticket Rank" value={rank} onChange={(e) => setRank(e.target.value)} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="counsel-field-label">Counselling Category *</label>
                <select className="input-field counsel-form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Select Category</option>
                  {["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2 counsel-form-row-2col">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="counsel-field-label">Gender *</label>
                <select className="input-field counsel-form-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Select</option>
                  <option value="BOYS">BOYS</option>
                  <option value="GIRLS">GIRLS</option>
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="counsel-field-label">Special Reservation (CAP, PH, Sports)</label>
                <select className="input-field counsel-form-input" value={specialCategory} onChange={(e) => setSpecialCategory(e.target.value)}>
                  {["None", "NCC", "Sports", "CAP", "PH", "EWS", "Others"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="wo-card-nav" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (!rank || !category || !gender) {
                    setError("Please fill all required student parameters.");
                    return;
                  }
                  setError("");
                  setCurrentStep(2);
                }}
                style={{ gap: '8px' }}
              >
                Configure Preferences <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PREFERENCES CONFIGURATION */}
      {currentStep === 2 && (
        <div className="predictor-layout">
          {/* Inputs */}
          <div className="sidebar-sticky-wrapper">
            <div className="glass-card counsel-form-card wo-form-card" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary)', marginBottom: '16px' }}>
                Option Criteria
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="input-group">
                  <label className="counsel-field-label">Annual Fee Limit (Optional)</label>
                  <input className="input-field counsel-form-input" type="number" placeholder="e.g., 85000" value={maxFees} onChange={(e) => setMaxFees(e.target.value)} />
                </div>

                <div className="input-group">
                  <label className="counsel-field-label">Preferred Districts (Optional)</label>
                  <MultiSelect
                    predictor
                    options={districts}
                    selected={preferredDistricts}
                    onChange={setPreferredDistricts}
                    placeholder="All Districts"
                    searchable={true}
                  />
                </div>
                
                {preferredDistricts.length > 0 && (
                  <div className="input-group">
                    <label className="counsel-field-label counsel-checkbox-label">
                      <input
                        type="checkbox"
                        checked={strictDistrictFilter}
                        onChange={(e) => setStrictDistrictFilter(e.target.checked)}
                      />
                      Strict District Filter
                    </label>
                  </div>
                )}

                <div className="input-group">
                  <label className="counsel-field-label">Probability Group Filter</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                    {[
                      { key: "Backup", oldKey: "Safe", display: "Backup" },
                      { key: "BestMatch", oldKey: "Moderate", display: "Best Match" },
                      { key: "Competitive", oldKey: "Dream", display: "Competitive" }
                    ].map((risk) => {
                      const isActive = riskFilters.includes(risk.key) || riskFilters.includes(risk.oldKey);
                      return (
                        <button
                          key={risk.key}
                          onClick={() => {
                            setRiskFilters(prev => {
                              const clean = prev.filter(r => r !== risk.key && r !== risk.oldKey);
                              if (isActive) return clean;
                              return [...clean, risk.key];
                            });
                          }}
                          className="btn"
                          style={{
                            padding: "6px 12px", fontSize: "12px", borderRadius: "4px",
                            background: isActive ? "var(--primary)" : "var(--bg-secondary)",
                            color: isActive ? "white" : "var(--text-primary)",
                            border: "1px solid var(--border-color)",
                            fontWeight: "600",
                            width: 'auto',
                            flex: 1
                          }}
                        >
                          {risk.display}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px', 
                    padding: '12px', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-color)', 
                    fontSize: '11.5px', 
                    lineHeight: '1.4'
                  }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: 'var(--success)', 
                        marginTop: '5px',
                        flexShrink: 0 
                      }} />
                      <div>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Backup Colleges:</span>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{SECTION_TOOLTIPS.backup}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: 'var(--secondary)', 
                        marginTop: '5px',
                        flexShrink: 0 
                      }} />
                      <div>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Best Match Colleges:</span>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{SECTION_TOOLTIPS.bestmatch}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: 'var(--danger)', 
                        marginTop: '5px',
                        flexShrink: 0 
                      }} />
                      <div>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Competitive Colleges:</span>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{SECTION_TOOLTIPS.competitive}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label className="counsel-field-label">Options Priority List Size</label>
                  <select className="input-field counsel-form-input" value={optionLimit} onChange={(e) => { 
                    const val = e.target.value;
                    setOptionLimit(val === "custom" ? "custom" : Number(val));
                    if (val !== "custom") setCustomLimit("");
                  }}>
                    <option value={50}>50 Options</option>
                    <option value={100}>100 Options</option>
                    <option value={150}>150 Options</option>
                    <option value={200}>200 Options</option>
                    <option value="custom">Custom</option>
                  </select>
                  {optionLimit === "custom" && (
                    <input
                      type="number"
                      className="input-field counsel-form-input"
                      placeholder="Enter size..."
                      style={{ marginTop: "8px" }}
                      value={customLimit}
                      onChange={(e) => setCustomLimit(e.target.value)}
                    />
                  )}
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", marginTop: '8px' }}>
                  <input type="checkbox" checked={preferTopColleges} onChange={(e) => setPreferTopColleges(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: 'var(--primary)' }} />
                  <span style={{ fontWeight: '600' }}>Prioritize Top Colleges</span>
                </label>
              </div>
            </div>
            

          </div>

          {/* Preferences Selector Component */}
          <div className="glass-card counsel-form-card wo-form-card" style={{ padding: '28px' }}>
            <Preferences colleges={branchOptions} branches={branchOptions} preferences={preferences} setPreferences={setPreferences} />

            <div className="wo-card-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setCurrentStep(1)} style={{ gap: '8px' }}>
                <ArrowLeft size={16} /> Back to Profile
              </button>
              <button className="btn btn-primary" onClick={handleGenerateClick} style={{ gap: '8px' }} disabled={loading}>
                {loading ? "Processing..." : "Generate Web Options"} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: GENERATED PRIORITY LIST */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {loading && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="skeleton animate-pulse" style={{ width: '48px', height: '48px', borderRadius: '50%', marginBottom: '16px' }}></div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--primary)', marginBottom: '8px' }}>Compiling Options Array</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                Filtering colleges, correlating EAPCET cutoffs, and arranging sequences...
              </p>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <List size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--primary)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No Options Matches Found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px', maxWidth: '420px', lineHeight: 1.5 }}>
                We couldn't compile matches for the selected branch preferences. Try adding more branch codes or resetting district overrides.
              </p>
              <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
                Modify Preferences
              </button>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="results-layout">
              {/* Right Column (first on desktop): Generated Priority Lists */}
              <div className="results-college-list">
                {/* Compact header bar: back nav + match count + pagination */}
                <div className="results-header-bar">
                  <button
                    className="btn btn-secondary results-back-btn"
                    onClick={() => setCurrentStep(2)}
                    style={{ gap: '6px', padding: '7px 12px', fontSize: '12px', border: '1px solid var(--border-color)', flexShrink: 0 }}
                  >
                    <ArrowLeft size={13} /> Preferences
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: 'var(--primary)' }}>{total}</strong> matches
                    </span>
                    {pages > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '4px 8px' }}>
                          <ArrowLeft size={13} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>{page}/{pages}</span>
                        <button className="btn btn-secondary" disabled={page === pages} onClick={() => setPage((p) => p + 1)} style={{ padding: '4px 8px' }}>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="wo-priority-hint">
                  <GripVertical size={14} aria-hidden="true" />
                  <span>Hold a card and drag to reorder your counselling priority</span>
                </div>

                <div className="wo-options-sections" aria-label="Generated web options by category">
                  {sectionItems.map((section) => (
                    <WebOptionSection
                      key={section.key}
                      title={section.title}
                      headingClass={section.headingClass}
                      tooltip={section.tooltip}
                      items={section.items}
                      getResultIndex={getResultIndex}
                      category={category}
                      gender={gender}
                      dragIndex={dragIndex}
                      dragOverIndex={dragOverIndex}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOverCard}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              </div>

              {/* Left Column (second on mobile): Strategy Panel & Save/Export */}
              <div className="results-sidebar sidebar-sticky-wrapper">
                {strategySummary && (
                  <div className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Settings2 size={15} /> Strategy Analysis
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                      <div style={{ textAlign: 'center', padding: '8px 6px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--danger)' }}>
                          {strategySummary.competitiveCount ?? strategySummary.dreamCount ?? 0}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Comp.</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 6px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '6px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--secondary)' }}>
                          {strategySummary.bestMatchCount ?? strategySummary.moderateCount ?? 0}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Matches</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 6px', background: 'rgba(22, 163, 74, 0.05)', borderRadius: '6px', border: '1px solid rgba(22, 163, 74, 0.1)' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--success)' }}>
                          {strategySummary.backupCount ?? strategySummary.safeCount ?? 0}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Backups</div>
                      </div>
                    </div>

                    {/* Balance Bar */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginBottom: '4px' }}>
                        <span>Distribution</span>
                        <span>Total: {total}</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${((strategySummary.competitiveCount ?? strategySummary.dreamCount ?? 0) / total) * 100}%`, background: 'var(--danger)' }} />
                        <div style={{ width: `${((strategySummary.bestMatchCount ?? strategySummary.moderateCount ?? 0) / total) * 100}%`, background: 'var(--secondary)' }} />
                        <div style={{ width: `${((strategySummary.backupCount ?? strategySummary.safeCount ?? 0) / total) * 100}%`, background: 'var(--success)' }} />
                      </div>
                    </div>

                    {/* Advice Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {strategySummary.advice.map((item, i) => {
                        let mappedText = item
                          .replace(/\bSafe\b/g, "Backup")
                          .replace(/\bModerate\b/g, "Best Matching")
                          .replace(/\bDream\b/g, "Competitive");
                        return (
                          <div key={i} className="info-alert" style={{ padding: '7px 10px', fontSize: '11px', margin: 0 }}>
                            <Info size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <span>{mappedText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Save & Export Actions Panel */}
                <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>
                    Save & Export
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button className="btn btn-primary" onClick={saveOptions} disabled={isSaving} style={{ width: '100%', fontSize: '12.5px', padding: '10px 14px' }}>
                      {isSaving ? "Saving..." : "Save to Profile"}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => generatePDF(user?.name || studentName, user?.email || studentEmail, rank, category, gender, specialCategory, preferredDistricts, preferences, results)} 
                      style={{ width: '100%', fontSize: '12.5px', padding: '10px 14px', background: 'var(--success)', color: '#fff', border: 'none' }}
                    >
                      Download PDF
                    </button>
                    <button className="btn btn-share" onClick={shareOptions} style={{ width: '100%', fontSize: '12.5px', padding: '10px 14px' }}>
                      Share Link
                    </button>
                  </div>

                  {shareLink && (
                    <div style={{ display: 'flex', width: '100%', gap: '6px', alignItems: 'flex-start' }}>
                      <input 
                        type="text" 
                        readOnly 
                        value={shareLink} 
                        className="input-field" 
                        style={{ flex: 1, margin: 0, padding: "8px 10px", fontSize: "11px", background: "var(--bg-secondary)" }} 
                        onClick={(e) => e.target.select()}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button 
                          className="btn btn-primary" 
                          onClick={async () => { 
                            try {
                              await navigator.clipboard.writeText(shareLink); 
                              setCopiedLink(true); 
                              setTimeout(() => setCopiedLink(false), 3000); 
                            } catch (err) {
                              logger.error("Failed to copy link:", err);
                              setError("Failed to copy link to clipboard");
                            }
                          }} 
                          style={{ padding: "8px 14px", fontSize: "12px", width: 'auto' }}
                        >
                          Copy
                        </button>
                        {copiedLink && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '11px', fontWeight: '600' }}>
                            <CheckCircle2 size={12} style={{ color: 'var(--success)' }} /> Copied
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sticky bottom CTA — mobile only (hidden on desktop via CSS) ── */}
      {currentStep < 3 && (
        <div className="wo-sticky-cta">
          {currentStep === 2 && (
            <button
              className="wo-sticky-back"
              onClick={() => setCurrentStep(1)}
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}
          <button
            className="btn btn-primary wo-sticky-primary"
            onClick={currentStep === 1 ? handleStep1Continue : handleGenerateClick}
            disabled={loading}
          >
            {currentStep === 1
              ? <><span>Preferences</span> <ArrowRight size={15} /></>
              : loading
                ? 'Processing...'
                : <><span>Generate Options</span> <ArrowRight size={15} /></>
            }
          </button>
        </div>
      )}
    </div>
  );
}

export default WebOptions;