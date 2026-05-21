import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Preferences from "../components/Preferences";
import { Download, Share2, Save, FileText, Settings2, GripVertical, CheckCircle2, AlertTriangle, Info, ArrowLeft, ArrowRight, List, User, X } from "lucide-react";
import { API_URL } from "../config/api";
import { getCookie } from "../utils/cookie";
import InfoTooltip from "../components/InfoTooltip";
import StrategyPanel from "../components/StrategyPanel";
import CollegeCard from "../components/CollegeCard";
import logger from "../utils/logger";
import { useCounsel } from "../context/CounselContext";
import { downloadJSON, downloadCSV, shareToClipboard, generatePDF } from "../utils/counselUtils";

const districtOptions = [
  "HYD", "MDL", "RR", "KGM", "SRP", "WGL", "KHM",
  "MED", "SRD", "KMR", "NZB", "KRM", "JTL", "MHB",
  "SDP", "PDL", "SRC", "WNP", "MBN", "HNK", "NPT",
  "NLG", "YBG"
];

function WebOptions() {
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
  const [user, setUser] = useState(null);
  const [branchOptions, setBranchOptions] = useState([]);
  const [preferTopColleges, setPreferTopColleges] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [success, setSuccess] = useState("");
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const prefs = JSON.parse(userStr);
      setUser(prefs);
      if (prefs.name) setStudentName(prefs.name);
      if (prefs.email) setStudentEmail(prefs.email);
      if (prefs.rank) setRank(prefs.rank);
      if (prefs.category) setCategory(prefs.category);
      if (prefs.gender) setGender(prefs.gender);
    } else {
      const saved = localStorage.getItem("guest_preferences");
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.name) setStudentName(prefs.name);
        if (prefs.rank) setRank(prefs.rank);
        if (prefs.category) setCategory(prefs.category);
        if (prefs.gender) setGender(prefs.gender);
      }
    }
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/colleges/branches`)
      .then((res) => res.json())
      .then((data) => setBranchOptions(data.branches || []))
      .catch((err) => console.error("Failed to load branches", err));
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
      const cleanLimit = limitParam ? Number(limitParam) : 50;
      setOptionLimit(cleanLimit);

      const customLimitParam = params.get("customLimit") || "";
      setCustomLimit(customLimitParam);

      // Auto-trigger API call
      setLoading(true);
      setError("");

      const cleanRiskFilters = cleanRisks.map((f) => {
        if (f === "Competitive" || f === "Dream") return "Dream";
        if (f === "BestMatch" || f === "Moderate") return "Moderate";
        if (f === "Backup" || f === "Safe") return "Safe";
        return f;
      });

      const finalLimit = customLimitParam ? Number(customLimitParam) : cleanLimit;

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
          console.error(err);
          setError("Failed to load options from share link");
        })
        .finally(() => setLoading(false));
    } else {
      const id = params.get("id");
      if (id) {
        setLoading(true);
        fetch(`${API_URL}/api/options/${id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.options) {
              setResults(data.options);
            } else {
              alert("Invalid share link");
            }
          })
          .catch(() => alert("Failed to load shared options"))
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
    if (!rank) return setError("Please enter your EAMCET Rank");
    if (!category) return setError("Please select your Category");
    if (!gender) return setError("Please select Gender");
    if (preferences.length === 0) return setError("Please select at least one branch preference");
    if (optionLimit === "custom" && (!customLimit || Number(customLimit) <= 0)) {
      return setError("Please enter custom option size");
    }

    setError("");

    // Step 2 & 3: Fix branch and district preferences from MultiSelect
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
      specialCategory
    };

    logger.log("WEB OPTIONS PAYLOAD:", payload);

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
        return;
      }

      setResults(data.options || []);
      setStrategySummary(data.strategySummary || null);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || currentPage);
    } catch {
      setError("Failed to generate web options. Server connection failed.");
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateClick = () => {
    setPage(1);
    handleGenerate(1);
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
      title: `CounselWise Web Options - ${user?.name || studentName || "Student"}`,
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
        setSuccess("Saved successfully. View it in your dashboard.");
        setTimeout(() => setSuccess(""), 8000);
      } else {
        setError(data.error || "Save failed");
      }
    } catch {
      setError("Server error during save.");
    } finally {
      setIsSaving(false);
    }
  };

  const generateShareLink = () => {
    const cleanPrefs = preferences.join(",");
    const cleanDistricts = preferredDistricts.join(",");
    const cleanRisks = riskFilters.join(",");
    
    const params = new URLSearchParams();
    params.set("rank", rank);
    params.set("category", category);
    params.set("gender", gender);
    if (cleanPrefs) params.set("preferences", cleanPrefs);
    if (cleanDistricts) params.set("districts", cleanDistricts);
    if (maxFees) params.set("maxFees", maxFees);
    if (strictDistrictFilter) params.set("strictDistrictFilter", "true");
    if (specialCategory && specialCategory !== "None") params.set("specialCategory", specialCategory);
    if (cleanRisks) params.set("riskFilters", cleanRisks);
    if (optionLimit) params.set("optionLimit", optionLimit.toString());
    if (customLimit) params.set("customLimit", customLimit);
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const shareOptions = async () => {
    if (!results.length) return setError("Generate options first");
    
    const link = generateShareLink();
    try {
      await navigator.clipboard.writeText(link);
      setSuccess("Share link copied to clipboard!");
      setShareLink(link);
      setTimeout(() => setSuccess(""), 8000);
    } catch {
      setError("Failed to copy link to clipboard");
    }
  };

  const backupOptions = results.filter((item) => item.riskLabel === "Backup" || item.riskLabel === "Safe");
  const bestMatchOptions = results.filter((item) => item.riskLabel === "BestMatch" || item.riskLabel === "Moderate");
  const competitiveOptions = results.filter((item) => item.riskLabel === "Competitive" || item.riskLabel === "Dream");



  return (
    <div className="page-wrapper container">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="section-title">Web Options Generator</h1>
        <p className="section-subtitle">Generate an ordered list of web options to maximize your admission chances.</p>
      </div>

      <div className="web-options-layout">
        <div className="sidebar-sticky-wrapper">
          <div className="glass-card">
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={24} style={{ color: 'var(--accent-blue)' }} /> Student Details
            </h2>

            <div className="grid-2">
              <div className="input-group">
                <label>Full Name</label>
                <input className="input-field" type="text" placeholder="Your Name" value={user?.name || studentName} onChange={(e) => setStudentName(e.target.value)} disabled={!!user} />
              </div>
              <div className="input-group">
                <label>Email Address</label>
                <input className="input-field" type="email" placeholder="Your Email" value={user?.email || studentEmail} onChange={(e) => setStudentEmail(e.target.value)} disabled={!!user} />
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>EAMCET Rank *</label>
                <input className="input-field" type="number" placeholder="Rank" value={rank} onChange={(e) => setRank(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Category *</label>
                <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Select</option>
                  {["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-3">
              <div className="input-group">
                <label>Gender *</label>
                <select className="input-field" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Select</option>
                  <option value="BOYS">BOYS</option>
                  <option value="GIRLS">GIRLS</option>
                </select>
              </div>
              <div className="input-group">
                <label>Max Fees</label>
                <input className="input-field" type="number" placeholder="Optional" value={maxFees} onChange={(e) => setMaxFees(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Special Category</label>
                <select className="input-field" value={specialCategory} onChange={(e) => setSpecialCategory(e.target.value)}>
                  {["None", "NCC", "Sports", "CAP", "PH", "EWS", "Others"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Counselling Guide Promo */}
            <div style={{ 
              marginBottom: '24px', 
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(37, 99, 235, 0.1))',
              border: '1px solid rgba(147, 51, 234, 0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '4px', color: 'var(--text-primary)' }}>Confused about the process?</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Read our comprehensive guide.</p>
              </div>
              <Link to="/counselling-guide" className="btn btn-secondary" style={{ background: 'var(--bg-primary)', fontSize: '12px', padding: '6px 12px' }}>
                View Guide
              </Link>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <Preferences branches={branchOptions} preferences={preferences} setPreferences={setPreferences} />
            </div>

            <div className="input-group">
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Preferred Districts (Optional)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  className="input-field" 
                  value={selectedDistrict} 
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select District</option>
                  {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (selectedDistrict && !preferredDistricts.includes(selectedDistrict)) {
                      setPreferredDistricts([...preferredDistricts, selectedDistrict]);
                      setSelectedDistrict("");
                    }
                  }}
                  style={{ width: 'auto', padding: '10px 20px' }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: '12px' }}>
                {preferredDistricts.map((district) => (
                  <div
                    key={district}
                    className="badge badge-primary"
                    style={{
                      padding: "6px 12px", fontSize: "12px", borderRadius: "16px",
                      display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'none'
                    }}
                  >
                    {district}
                    <X size={14} style={{ cursor: 'pointer' }} onClick={() => setPreferredDistricts(preferredDistricts.filter(d => d !== district))} />
                  </div>
                ))}
                {preferredDistricts.length > 0 && (
                  <button 
                    className="btn" 
                    onClick={() => setPreferredDistricts([])}
                    style={{ padding: '4px 10px', fontSize: '11px', background: 'transparent', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer", color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={strictDistrictFilter} 
                  onChange={(e) => setStrictDistrictFilter(e.target.checked)} 
                  style={{ width: "18px", height: "18px", accentColor: 'var(--accent-blue)' }} 
                />
                <span>Strict District Filter (Only show selected districts)</span>
              </label>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Risk Filter</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
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
                          padding: "8px 16px", fontSize: "13px", borderRadius: "20px",
                          background: isActive ? "var(--accent-blue)" : "var(--bg-secondary)",
                          color: isActive ? "white" : "var(--text-primary)",
                          border: "1px solid var(--border-color)",
                          fontWeight: "500"
                        }}
                      >
                        {risk.display}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="input-group">
                <label>List Size</label>
                <select className="input-field" value={optionLimit} onChange={(e) => { 
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
                    className="input-field"
                    placeholder="Enter size..."
                    style={{ marginTop: "8px" }}
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value)}
                  />
                )}
              </div>
            </div>

            {error && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.4)', 
                color: '#ef4444', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '24px',
                fontSize: '14px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {error}
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer", marginBottom: "24px" }}>
              <input type="checkbox" checked={preferTopColleges} onChange={(e) => setPreferTopColleges(e.target.checked)} style={{ width: "16px", height: "16px" }} />
              Prioritize Top Tier Colleges
            </label>

            <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleGenerateClick} disabled={loading}>
              {loading ? "Generating Options..." : "Generate Web Options"}
            </button>
          </div>
          <StrategyPanel />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '20px' }}>
              Generated List
            </h2>
            
            {results.length > 0 && !loading && (
              <div style={{ display: "flex", gap: "8px", flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={saveOptions} disabled={isSaving} title="Save to Profile" style={{ padding: "8px 12px", display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Save size={16} /> {isSaving ? "Saving..." : "Save to Dashboard"}
                </button>
                <button className="btn btn-secondary" onClick={shareOptions} title="Share link with filters" style={{ padding: "8px 12px", display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Share2 size={16} /> Share Options
                </button>
                <button className="btn btn-secondary" onClick={() => downloadCSV(results, `CounselWise_Options_${studentName || "Report"}.csv`)} title="Export CSV" style={{ padding: "8px 12px", display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={16} /> Export CSV
                </button>
                <button className="btn btn-secondary" onClick={() => downloadJSON(results, `CounselWise_Options_${studentName || "Report"}.json`)} title="Export JSON" style={{ padding: "8px 12px", display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={16} /> Export JSON
                </button>
                <button className="btn btn-primary" onClick={() => generatePDF(studentName, studentEmail, rank, category, gender, specialCategory, preferredDistricts, preferences, results)} title="Download PDF Report" style={{ padding: "8px 12px", display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={16} /> Download PDF
                </button>
              </div>
            )}
          </div>

          {success && (
            <div style={{ padding: "12px", background: "rgba(34, 197, 94, 0.1)", color: "var(--safe-text)", borderRadius: "8px", marginBottom: "16px", textAlign: "center", fontWeight: "500", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
              <CheckCircle2 size={18} style={{ verticalAlign: "middle", marginRight: "8px" }} />
              {success} {success.includes("Saved successfully") && <Link to="/dashboard" style={{ textDecoration: "underline", color: "var(--safe-text)" }}>View in Dashboard</Link>}
            </div>
          )}
          {shareLink && (
            <div style={{ padding: "16px", background: "var(--bg-secondary)", borderRadius: "8px", marginBottom: "24px", border: "1px dashed var(--accent-blue)", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Share link:</span>
              <input 
                type="text" 
                readOnly 
                value={shareLink} 
                className="input-field" 
                style={{ flex: 1, margin: 0, padding: "8px 12px", fontSize: "13px", background: "var(--bg-primary)" }} 
                onClick={(e) => e.target.select()}
              />
              <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(shareLink); setSuccess("Share link copied to clipboard"); setTimeout(() => setSuccess(""), 5000); }} style={{ padding: "8px 16px", fontSize: "13px", whiteSpace: "nowrap" }}>Copy</button>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <List size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
              <h3 style={{ color: 'var(--text-secondary)' }}>No web options found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
                No web options found. Try adding more branches, more districts, removing strict district filter, or increasing max fees.
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: "40px", height: "40px", border: "3px solid var(--border-color)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ color: 'var(--text-secondary)' }}>Processing college data...</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div>
              {/* Strategy Summary Section */}
              {strategySummary && (
                <div className="glass-card" style={{ marginBottom: 'var(--spacing-md)', border: '1px solid var(--accent-glow)' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings2 size={20} style={{ color: 'var(--accent-blue)' }} /> Strategy Analysis
                  </h3>
                  
                  <div className="grid-3" style={{ gap: '16px', marginBottom: '24px' }}>
                    <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--competitive-text)', fontSize: '24px', fontWeight: '700' }}>
                        {strategySummary.competitiveCount ?? strategySummary.dreamCount ?? 0}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Competitive Options</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--bestmatch-text)', fontSize: '24px', fontWeight: '700' }}>
                        {strategySummary.bestMatchCount ?? strategySummary.moderateCount ?? 0}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Best Match Options</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--backup-text)', fontSize: '24px', fontWeight: '700' }}>
                        {strategySummary.backupCount ?? strategySummary.safeCount ?? 0}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Backup Options</div>
                    </div>
                  </div>

                  {/* Visual Balance Bar */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span>Balance Bar</span>
                      <span>Target: {strategySummary.recommendedCompetitive ?? strategySummary.recommendedDream}/{strategySummary.recommendedBestMatch ?? strategySummary.recommendedModerate}/{strategySummary.recommendedBackup ?? strategySummary.recommendedSafe}</span>
                    </div>
                    <div style={{ height: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${((strategySummary.competitiveCount ?? strategySummary.dreamCount ?? 0) / total) * 100}%`, background: 'var(--competitive-text)' }} />
                      <div style={{ width: `${((strategySummary.bestMatchCount ?? strategySummary.moderateCount ?? 0) / total) * 100}%`, background: 'var(--bestmatch-text)' }} />
                      <div style={{ width: `${((strategySummary.backupCount ?? strategySummary.safeCount ?? 0) / total) * 100}%`, background: 'var(--backup-text)' }} />
                    </div>
                  </div>

                  {/* Advice Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: strategySummary.missingRiskMessages?.length ? '16px' : '0' }}>
                    {strategySummary.advice.map((item, i) => {
                      // Map advice categories in text
                      let mappedText = item
                        .replace(/\bSafe\b/g, "Backup")
                        .replace(/\bModerate\b/g, "Best Matching")
                        .replace(/\bDream\b/g, "Competitive");
                      return (
                        <div key={i} style={{ 
                          display: 'flex', alignItems: 'flex-start', gap: '10px', 
                          padding: '12px', background: 'rgba(59, 130, 246, 0.05)', 
                          border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '8px',
                          fontSize: '13px', color: 'var(--text-secondary)'
                        }}>
                          <Info size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
                          {mappedText}
                        </div>
                      );
                    })}
                  </div>

                  {/* Missing Risk Messages */}
                  {strategySummary.missingRiskMessages && strategySummary.missingRiskMessages.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {strategySummary.missingRiskMessages.map((item, i) => {
                        let mappedText = item
                          .replace(/\bSafe\b/g, "Backup")
                          .replace(/\bModerate\b/g, "Best Matching")
                          .replace(/\bDream\b/g, "Competitive");
                        return (
                          <div key={`missing-${i}`} style={{ 
                            display: 'flex', alignItems: 'flex-start', gap: '10px', 
                            padding: '12px', background: 'rgba(239, 68, 68, 0.05)', 
                            border: '1px dashed rgba(239, 68, 68, 0.3)', borderRadius: '8px',
                            fontSize: '13px', color: 'var(--text-secondary)'
                          }}>
                            <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                            {mappedText}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", padding: "16px", background: "var(--bg-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Total Matches: </span>
                  <strong style={{ color: "var(--text-primary)" }}>{total}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "6px 10px" }}>
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: "14px", fontWeight: '500' }}>Page {page} of {pages}</span>
                  <button className="btn btn-secondary" disabled={page === pages} onClick={() => setPage((p) => p + 1)} style={{ padding: "6px 10px" }}>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {competitiveOptions.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", color: "var(--competitive-text)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <AlertTriangle size={18} /> Competitive Colleges
                    <InfoTooltip text="These colleges are more competitive, but you still have a chance." />
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {competitiveOptions.map((c) => {
                      const globalIndex = results.indexOf(c);
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

              {bestMatchOptions.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", color: "var(--bestmatch-text)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <Info size={18} /> Best Matching Colleges
                    <InfoTooltip text="These colleges best match your rank and category." />
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {bestMatchOptions.map((c) => {
                      const globalIndex = results.indexOf(c);
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

              {backupOptions.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", color: "var(--backup-text)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <CheckCircle2 size={18} /> Backup Colleges
                    <InfoTooltip text="These are safer colleges to keep as backup options." />
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {backupOptions.map((c) => {
                      const globalIndex = results.indexOf(c);
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
          )}
        </div>
      </div>
    </div>
  );
}

export default WebOptions;