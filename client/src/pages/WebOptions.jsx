import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Preferences from "../components/Preferences";
import { Download, Share2, Save, FileText, Settings2, GripVertical, CheckCircle2, AlertTriangle, Info, ArrowLeft, ArrowRight, List, User, X } from "lucide-react";
import { API_URL } from "../config/api";
import { getCookie } from "../utils/cookie";
import InfoTooltip from "../components/InfoTooltip";
import StrategyPanel from "../components/StrategyPanel";
import CollegeCard from "../components/CollegeCard";
import logger from "../utils/logger";
import MultiSelect from "../components/MultiSelect";
import { useCounsel } from "../context/CounselContext";
import { useAuth } from "../context/AuthContext";
import { downloadJSON, downloadCSV, shareToClipboard, generatePDF } from "../utils/counselUtils";

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
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [shareLink, setShareLink] = useState("");
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
      if (preferTopColleges) {
        generatedOptions.sort((a, b) => {
          const scoreA = a.matchScore !== undefined ? a.matchScore : (a.score !== undefined ? a.score : 0);
          const scoreB = b.matchScore !== undefined ? b.matchScore : (b.score !== undefined ? b.score : 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
          const cutoffA = a.cutoff !== undefined ? a.cutoff : Infinity;
          const cutoffB = b.cutoff !== undefined ? b.cutoff : Infinity;
          return cutoffA - cutoffB;
        });
        generatedOptions = generatedOptions.map((item, idx) => ({
          ...item,
          priority: idx + 1
        }));
      } else {
        generatedOptions.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      }

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

  const handleDragStart = (index) => setDragIndex(index);
  const handleDrop = (index) => {
    if (dragIndex === null) return;
    const updated = [...results];
    const dragged = updated[dragIndex];
    updated.splice(dragIndex, 1);
    updated.splice(index, 0, dragged);
    const newList = updated.map((item, i) => ({ ...item, priority: i + 1 }));
    setResults(newList);
    setDragIndex(null);
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
      setTimeout(() => setSuccess(""), 8000);
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

  const sortedResults = [...results].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const backupOptions = sortedResults.filter((item) => item.riskLabel === "Backup" || item.riskLabel === "Safe");
  const bestMatchOptions = sortedResults.filter((item) => item.riskLabel === "BestMatch" || item.riskLabel === "Moderate");
  const competitiveOptions = sortedResults.filter((item) => item.riskLabel === "Competitive" || item.riskLabel === "Dream");

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
    } else if (step === 4) {
      if (results.length === 0) {
        setError("Please generate web options list before viewing export screen.");
      } else {
        setCurrentStep(4);
      }
    }
  };

  return (
    <div className="page-wrapper container">
      {/* Title */}
      <div className="page-header">
        <span className="badge badge-primary" style={{ marginBottom: '8px' }}>
          Official Option Entry Utility
        </span>
        <h1 className="section-title">
          Web Options Prioritizer
        </h1>
        <p className="section-subtitle">
          Formulate your priority sequence and lock choices safely for EAPCET Phase I.
        </p>
      </div>

      {/* Stepper Navigation */}
      <div className="stepper-container">
        <div className="stepper-line">
          <div className="stepper-line-active" style={{ width: `${((currentStep - 1) / 3) * 100}%` }} />
        </div>
        {[
          { step: 1, label: "1. Student Profile" },
          { step: 2, label: "2. Input Preferences" },
          { step: 3, label: "3. Priority Sequence" },
          { step: 4, label: "4. Save & Export" }
        ].map((item) => (
          <div 
            key={item.step} 
            className={`stepper-step ${currentStep === item.step ? 'active' : ''} ${currentStep > item.step ? 'completed' : ''}`}
            onClick={() => handleStepClick(item.step)}
          >
            <div className="stepper-circle">
              {currentStep > item.step ? "✓" : item.step}
            </div>
            <span className="stepper-label">{item.label}</span>
          </div>
        ))}
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
        <div className="glass-card counsel-form-card" style={{ padding: '32px', maxWidth: '640px', margin: '0 auto', borderTop: '4px solid var(--primary)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} /> Student Verification Details
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2 counsel-form-row-2col" style={{ gap: '18px' }}>
              <div className="input-group">
                <label className="counsel-field-label">Candidate Full Name</label>
                <input className="input-field counsel-form-input" type="text" placeholder="e.g., Preethika M" value={user?.name || studentName} onChange={(e) => setStudentName(e.target.value)} disabled={!!user} />
              </div>
              <div className="input-group">
                <label className="counsel-field-label">Primary Email Address</label>
                <input className="input-field counsel-form-input" type="email" placeholder="e.g., student@example.com" value={user?.email || studentEmail} onChange={(e) => setStudentEmail(e.target.value)} disabled={!!user} />
              </div>
            </div>

            <div className="grid-2 counsel-form-row-2col" style={{ gap: '18px' }}>
              <div className="input-group">
                <label className="counsel-field-label">TS EAPCET 2026 Rank *</label>
                <input className="input-field counsel-form-input" type="number" placeholder="Enter Hall Ticket Rank" value={rank} onChange={(e) => setRank(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="counsel-field-label">Counselling Category *</label>
                <select className="input-field counsel-form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Select Category</option>
                  {["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2 counsel-form-row-2col" style={{ gap: '18px' }}>
              <div className="input-group">
                <label className="counsel-field-label">Gender *</label>
                <select className="input-field counsel-form-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Select</option>
                  <option value="BOYS">BOYS</option>
                  <option value="GIRLS">GIRLS</option>
                </select>
              </div>
              <div className="input-group">
                <label className="counsel-field-label">Special Reservation (CAP, PH, Sports)</label>
                <select className="input-field counsel-form-input" value={specialCategory} onChange={(e) => setSpecialCategory(e.target.value)}>
                  {["None", "NCC", "Sports", "CAP", "PH", "EWS", "Others"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
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
            <div className="glass-card counsel-form-card" style={{ padding: '24px', borderTop: '4px solid var(--primary)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings2 size={18} /> Option Criteria
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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
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
                  <span style={{ fontWeight: '600' }}>Prioritize Academic Excellence (Top Tier)</span>
                </label>
              </div>
            </div>
            
            <StrategyPanel />
          </div>

          {/* Preferences Selector Component */}
          <div className="glass-card counsel-form-card" style={{ padding: '28px' }}>
            <Preferences colleges={branchOptions} branches={branchOptions} preferences={preferences} setPreferences={setPreferences} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
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
            <div className="predictor-layout">
              {/* Left Column: Strategy Panel & Stepper Options */}
              <div className="sidebar-sticky-wrapper">
                {strategySummary && (
                  <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Settings2 size={16} /> Strategy Analysis
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--danger)' }}>
                          {strategySummary.competitiveCount ?? strategySummary.dreamCount ?? 0}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Comp.</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '4px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--secondary)' }}>
                          {strategySummary.bestMatchCount ?? strategySummary.moderateCount ?? 0}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Matches</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(22, 163, 74, 0.05)', borderRadius: '4px', border: '1px solid rgba(22, 163, 74, 0.1)' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>
                          {strategySummary.backupCount ?? strategySummary.safeCount ?? 0}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Backups</div>
                      </div>
                    </div>

                    {/* Balance Bar */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                        <span>Priorities Distribution</span>
                        <span>Total: {total}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${((strategySummary.competitiveCount ?? strategySummary.dreamCount ?? 0) / total) * 100}%`, background: 'var(--danger)' }} />
                        <div style={{ width: `${((strategySummary.bestMatchCount ?? strategySummary.moderateCount ?? 0) / total) * 100}%`, background: 'var(--secondary)' }} />
                        <div style={{ width: `${((strategySummary.backupCount ?? strategySummary.safeCount ?? 0) / total) * 100}%`, background: 'var(--success)' }} />
                      </div>
                    </div>

                    {/* Advice Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {strategySummary.advice.map((item, i) => {
                        let mappedText = item
                          .replace(/\bSafe\b/g, "Backup")
                          .replace(/\bModerate\b/g, "Best Matching")
                          .replace(/\bDream\b/g, "Competitive");
                        return (
                          <div key={i} className="info-alert" style={{ padding: '8px 12px', fontSize: '11px', margin: 0 }}>
                            <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{mappedText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="glass-card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    Navigation
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={() => setCurrentStep(2)} style={{ width: '100%', fontSize: '12px', gap: '4px' }}>
                      <ArrowLeft size={14} /> Back to Preferences
                    </button>
                    <button className="btn btn-primary" onClick={() => setCurrentStep(4)} style={{ width: '100%', fontSize: '12px', gap: '4px' }}>
                      Next: Save & Export <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Generated Priority Lists with Drag & Drop */}
              <div>
                <div className="info-alert" style={{ marginBottom: '20px' }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ fontWeight: '700', display: 'block', marginBottom: '2px' }}>Drag & Drop Prioritization Active</strong>
                    <span>Arrange the options priority by holding a card and dragging it up or down to reflect your actual admission interest order.</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Options Matches: </span>
                    <strong style={{ color: "var(--primary)", fontSize: '15px' }}>{total}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "4px 8px" }}>
                      <ArrowLeft size={14} />
                    </button>
                    <span style={{ fontSize: "13px", fontWeight: '600' }}>Page {page} of {pages}</span>
                    <button className="btn btn-secondary" disabled={page === pages} onClick={() => setPage((p) => p + 1)} style={{ padding: "4px 8px" }}>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Competitive List */}
                  {competitiveOptions.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--danger)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} /> Competitive Selection Priorities
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {competitiveOptions.map((c) => {
                          const globalIndex = indexMap.get(c) ?? -1;
                          return (
                            <CollegeCard
                              key={c._id || globalIndex}
                              college={c}
                              idx={globalIndex}
                              priority={c.priority}
                              category={category}
                              gender={gender}
                              dragProps={{
                                draggable: true,
                                onDragStart: () => handleDragStart(globalIndex),
                                onDragOver: (e) => e.preventDefault(),
                                onDrop: () => handleDrop(globalIndex)
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Best Matches */}
                  {bestMatchOptions.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Info size={14} /> Best Matching Priorities
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {bestMatchOptions.map((c) => {
                          const globalIndex = indexMap.get(c) ?? -1;
                          return (
                            <CollegeCard
                              key={c._id || globalIndex}
                              college={c}
                              idx={globalIndex}
                              priority={c.priority}
                              category={category}
                              gender={gender}
                              dragProps={{
                                draggable: true,
                                onDragStart: () => handleDragStart(globalIndex),
                                onDragOver: (e) => e.preventDefault(),
                                onDrop: () => handleDrop(globalIndex)
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Backup Options */}
                  {backupOptions.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} /> Safe / Backup Priorities
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {backupOptions.map((c) => {
                          const globalIndex = indexMap.get(c) ?? -1;
                          return (
                            <CollegeCard
                              key={c._id || globalIndex}
                              college={c}
                              idx={globalIndex}
                              priority={c.priority}
                              category={category}
                              gender={gender}
                              dragProps={{
                                draggable: true,
                                onDragStart: () => handleDragStart(globalIndex),
                                onDragOver: (e) => e.preventDefault(),
                                onDrop: () => handleDrop(globalIndex)
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: SAVE & EXPORT */}
      {currentStep === 4 && (
        <div className="glass-card" style={{ padding: '32px', maxWidth: '680px', margin: '0 auto', borderTop: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={20} /> Export & Lock Sequence
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            Congratulations! You have finalized an optimized list of <strong>{results.length} choice options</strong> for your counselling rank. Stage your choices securely by exporting or downloading them below.
          </p>

          {/* Action Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '8px' }}>
            
            {/* Dashboard Save Box */}
            <div className="glass-card" style={{ padding: '20px', border: '1px solid var(--border-color)', background: 'rgba(30, 58, 138, 0.01)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={16} /> Save to Portal Dashboard
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
                Saves the generated priority list under your official student profile so you can modify it anytime.
              </p>
              <button className="btn btn-primary" onClick={saveOptions} disabled={isSaving} style={{ width: '100%', fontSize: '12px' }}>
                {isSaving ? "Saving sequence..." : "Save to Profile"}
              </button>
            </div>

            {/* Local PDF Download Box */}
            <div className="glass-card" style={{ padding: '20px', border: '1px solid var(--border-color)', background: 'rgba(22, 163, 74, 0.01)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--success)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> Official PDF Report
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
                Downloads a high-trust, formatted PDF report containing your choices in order for quick reference during final submission.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => generatePDF(user?.name || studentName, user?.email || studentEmail, rank, category, gender, specialCategory, preferredDistricts, preferences, results)} 
                style={{ width: '100%', fontSize: '12px', background: 'var(--success)' }}
              >
                Download PDF Report
              </button>
            </div>

          </div>

          {/* Share Section */}
          <div className="glass-card" style={{ padding: '20px', border: '1px solid var(--border-color)', marginTop: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Share2 size={16} style={{ color: 'var(--secondary)' }} /> Share Choices
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
              Copy the unique URL representation of your priorities to share with advisors or parents for double checking.
            </p>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={shareOptions} style={{ fontSize: '13px', flex: 1 }}>
                Generate Shareable Link
              </button>
              
              {shareLink && (
                <div style={{ display: 'flex', width: '100%', gap: '8px', marginTop: '12px' }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={shareLink} 
                    className="input-field" 
                    style={{ flex: 1, margin: 0, padding: "8px 12px", fontSize: "12px", background: "var(--bg-secondary)" }} 
                    onClick={(e) => e.target.select()}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={async () => { 
                      try {
                        await navigator.clipboard.writeText(shareLink); 
                        setSuccess("Share link copied to clipboard"); 
                        setTimeout(() => setSuccess(""), 5000); 
                      } catch (err) {
                        logger.error("Failed to copy link:", err);
                        setError("Failed to copy link to clipboard");
                      }
                    }} 
                    style={{ padding: "8px 16px", fontSize: "12px" }}
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stepper controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentStep(3)} style={{ gap: '6px' }}>
              <ArrowLeft size={16} /> View Choices Array
            </button>
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")} style={{ gap: '6px' }}>
              Finish & Go to Dashboard <CheckCircle2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WebOptions;