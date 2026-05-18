import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Preferences from "../components/Preferences";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, Share2, Save, FileText, Settings2, GripVertical, CheckCircle2, AlertTriangle, Info, ArrowLeft, ArrowRight, List, User, X } from "lucide-react";
import { API_URL } from "../config/api";
import MultiSelect from "../components/MultiSelect";
import { logger } from "../utils/logger";

const districtOptions = [
  "HYD", "MDL", "RR", "KGM", "SRP", "WGL", "KHM",
  "MED", "SRD", "KMR", "NZB", "KRM", "JTL", "MHB",
  "SDP", "PDL", "SRC", "WNP", "MBN", "HNK", "NPT",
  "NLG", "YBG"
];

function WebOptions() {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [preferences, setPreferences] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [user, setUser] = useState(null);

  const [results, setResults] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);

  const [preferTopColleges, setPreferTopColleges] = useState(true);
  const [preferredDistricts, setPreferredDistricts] = useState([]);
  const [maxFees, setMaxFees] = useState("");
  const [optionLimit, setOptionLimit] = useState(50);
  const [customLimit, setCustomLimit] = useState("");
  const [riskFilters, setRiskFilters] = useState([]); // Array for multi-select
  const [strictDistrictFilter, setStrictDistrictFilter] = useState(false);
  const [specialCategory, setSpecialCategory] = useState("None");
  const [strategySummary, setStrategySummary] = useState(null);
  const [error, setError] = useState("");

  const [dragIndex, setDragIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [success, setSuccess] = useState("");
  const [shareLink, setShareLink] = useState("");

  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

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
      .catch((err) => logger.error("Failed to load branches", err));

    // Profile fetch is now skipped for global access mode
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
  }, []);

  useEffect(() => {
    if (rank && category && gender && preferences.length > 0) {
      handleGenerate(page);
    }
  }, [page]);

  const finalOptionLimit = customLimit ? Number(customLimit) : Number(optionLimit);

  const toggleDistrict = (district) => {
    setPreferredDistricts((prev) =>
      prev.includes(district) ? prev.filter((d) => d !== district) : [...prev, district]
    );
  };

  async function handleGenerate(currentPage = 1) {
    if (!rank) return setError("Please enter your EAMCET Rank");
    if (!category) return setError("Please select your Category");
    if (!gender) return setError("Please select Gender");
    if (preferences.length === 0) return setError("Please select at least one branch preference");
    if (optionLimit === "custom" && (!customLimit || Number(customLimit) <= 0)) {
      return setError("Please enter custom option size");
    }

    setError("");

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/web-options?page=${currentPage}&limit=${finalOptionLimit}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rank: Number(rank), category, gender, preferences, preferTopColleges,
          preferredDistricts, strictDistrictFilter, specialCategory, maxFees: maxFees ? Number(maxFees) : "", riskFilters, optionLimit: finalOptionLimit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate options");
        setLoading(false);
        return;
      }

      setResults(data.options || []);
      setStrategySummary(data.strategySummary || null);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || currentPage);
    } catch {
      setError("Failed to generate options. Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    setPage(1);
    handleGenerate(1);
  };

  const exportPDF = () => {
    if (!results.length) return;
    const pdf = new jsPDF("landscape", "mm", "a4");
    const now = new Date().toLocaleString();
    
    // Header
    pdf.setFontSize(22);
    pdf.setTextColor(37, 99, 235);
    pdf.text("CounselWise", 14, 20);
    pdf.setFontSize(14);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Web Options Report", 14, 28);
    
    pdf.setFontSize(9);
    pdf.text(`Generated on: ${now}`, 200, 20);
    
    // Student Info Box
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(14, 35, 269, 35, 3, 3, 'FD');
    
    pdf.setFontSize(11);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont("helvetica", "bold");
    pdf.text("Student Details", 18, 43);
    
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Name: ${studentName || "N/A"}`, 18, 52);
    pdf.text(`Email: ${studentEmail || "N/A"}`, 18, 58);
    pdf.text(`Rank: ${rank}`, 18, 64);
    
    pdf.text(`Category: ${category}`, 110, 52);
    pdf.text(`Gender: ${gender}`, 110, 58);
    pdf.text(`Special Category: ${specialCategory}`, 110, 64);
    
    pdf.text(`Districts: ${preferredDistricts.length ? preferredDistricts.join(", ") : "All"}`, 190, 52);
    pdf.text(`Preferences: ${preferences.join(", ")}`, 190, 58);
    
    autoTable(pdf, {
      startY: 75,
      head: [["Priority", "Code", "College Name", "Branch", "District", "Cutoff", "Fees", "Risk"]],
      body: results.map(r => [
        r.priority, 
        r.collegeCode, 
        r.name, 
        `${r.branch} (${r.branchCode})`, 
        r.district, 
        r.cutoff, 
        r.fees, 
        r.riskLabel
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      tableWidth: "wrap",
      margin: { left: 8, right: 8 },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 18 },
        2: { cellWidth: 70 },
        3: { cellWidth: 55 },
        4: { cellWidth: 18 },
        5: { cellWidth: 20 },
        6: { cellWidth: 22 },
        7: { cellWidth: 20 }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 7) {
          const risk = data.cell.raw;
          if (risk === 'Safe') data.cell.styles.textColor = [22, 163, 74];
          else if (risk === 'Moderate') data.cell.styles.textColor = [217, 119, 6];
          else data.cell.styles.textColor = [220, 38, 38];
        }
      }
    });
    
    pdf.save(`CounselWise_Options_${studentName || "Report"}.pdf`);
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
    const token = localStorage.getItem("token");
    if (!token) {
      return setError("Please login to save options.");
    }

    setIsSaving(true);
    const payload = buildSavePayload();
    logger.log("Saving options payload", payload);

    try {
      const res = await fetch(`${API_URL}/api/options/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id) {
        setSuccess("Saved successfully. ");
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

  const shareOptions = async () => {
    if (!results.length) return setError("Generate options first");
    const token = localStorage.getItem("token");
    if (!token) {
      return setError("Please login to share options.");
    }

    setIsSharing(true);
    const payload = buildSavePayload();
    logger.log("Saving options payload for share", payload);

    try {
      const res = await fetch(`${API_URL}/api/options/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id) {
        const link = `${window.location.origin}/report/${data.id}`;
        try {
          await navigator.clipboard.writeText(link);
          setSuccess("Share link copied to clipboard");
        } catch {
          setSuccess("Options saved successfully!");
        }
        setShareLink(link);
        setTimeout(() => setSuccess(""), 8000);
      } else {
        setError(data.error || "Share failed");
      }
    } catch {
      setError("Server error during share.");
    } finally {
      setIsSharing(false);
    }
  };

  const safeOptions = results.filter((item) => item.riskLabel === "Safe");
  const moderateOptions = results.filter((item) => item.riskLabel === "Moderate");
  const dreamOptions = results.filter((item) => item.riskLabel === "Dream");

  const renderOptionCard = (item, index) => {
    const riskStatus = item.riskLabel === "Safe" ? "safe" : item.riskLabel === "Moderate" ? "moderate" : "dream";
    return (
      <div
        key={item._id || index}
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(index)}
        className="glass-card animate-up"
        style={{
          padding: "12px 16px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "12px",
          cursor: "grab", position: "relative", overflow: "hidden"
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: `var(--${riskStatus}-text)` }} />
        
        <div style={{ 
          background: "var(--bg-secondary)", borderRadius: "8px", width: "32px", height: "32px",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold",
          color: "var(--text-primary)", flexShrink: 0, fontSize: '13px'
        }}>
          #{item.priority}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: "0 0 4px", fontSize: "14px", lineHeight: 1.2, color: 'var(--text-primary)' }}>
            {item.name}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 6px', fontSize: '11px', color: 'var(--text-secondary)', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', color: 'var(--accent-blue)' }}>{item.collegeCode}</span>
            <span style={{ opacity: 0.5 }}>&bull;</span>
            <span style={{ color: 'var(--accent-purple)' }}>{item.branchCode}</span>
            <span style={{ opacity: 0.5 }}>&bull;</span>
            <span>{item.district}</span>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div className={`badge badge-${riskStatus}`} style={{ padding: '1px 6px', fontSize: '9px', minWidth: '50px', justifyContent: 'center' }}>
            {item.riskLabel}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Score: {item.score}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-wrapper container">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="section-title">Web Options Generator</h1>
        <p className="section-subtitle">Generate an ordered list of web options to maximize your admission chances.</p>
      </div>

      <div className="web-options-layout">
        <div className="glass-card sidebar-sticky">
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

          <MultiSelect
            label="Preferred Districts (Optional)"
            options={districtOptions}
            selected={preferredDistricts}
            onChange={setPreferredDistricts}
            placeholder="Select preferred districts..."
            searchable={true}
          />

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
                {["Safe", "Moderate", "Dream"].map((risk) => (
                  <button
                    key={risk}
                    onClick={() => {
                      setRiskFilters(prev => 
                        prev.includes(risk) ? prev.filter(r => r !== risk) : [...prev, risk]
                      );
                    }}
                    className="btn"
                    style={{
                      padding: "8px 16px", fontSize: "13px", borderRadius: "20px",
                      background: riskFilters.includes(risk) ? "var(--accent-blue)" : "var(--bg-secondary)",
                      color: riskFilters.includes(risk) ? "white" : "var(--text-primary)",
                      border: "1px solid var(--border-color)",
                      fontWeight: "500"
                    }}
                  >
                    {risk}
                  </button>
                ))}
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

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '20px' }}>
              Generated List
            </h2>
            
            {results.length > 0 && !loading && (
              <div style={{ display: "flex", gap: "8px", flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={saveOptions} disabled={isSaving} title="Save to Profile" style={{ padding: "8px 12px" }}>
                  <Save size={16} /> {isSaving ? "Saving..." : "Save"}
                </button>
                <button className="btn btn-secondary" onClick={shareOptions} disabled={isSharing} title="Share Link" style={{ padding: "8px 12px" }}>
                  <Share2 size={16} /> {isSharing ? "Sharing..." : "Share"}
                </button>
                <button className="btn btn-primary" onClick={exportPDF} title="Download Report" style={{ padding: "8px 12px" }}>
                  <Download size={16} /> Download
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
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px', maxWidth: '300px', margin: '8px auto 0' }}>
                Try increasing fees limit, selecting more districts, or adding more branch preferences to see results.
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
                      <div style={{ color: 'var(--dream-text)', fontSize: '24px', fontWeight: '700' }}>{strategySummary.dreamCount}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dream Options</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--moderate-text)', fontSize: '24px', fontWeight: '700' }}>{strategySummary.moderateCount}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Moderate Options</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--safe-text)', fontSize: '24px', fontWeight: '700' }}>{strategySummary.safeCount}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Safe Options</div>
                    </div>
                  </div>

                  {/* Visual Balance Bar */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span>Balance Bar</span>
                      <span>Target: {strategySummary.recommendedDream}/{strategySummary.recommendedModerate}/{strategySummary.recommendedSafe}</span>
                    </div>
                    <div style={{ height: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${(strategySummary.dreamCount / total) * 100}%`, background: 'var(--dream-text)' }} />
                      <div style={{ width: `${(strategySummary.moderateCount / total) * 100}%`, background: 'var(--moderate-text)' }} />
                      <div style={{ width: `${(strategySummary.safeCount / total) * 100}%`, background: 'var(--safe-text)' }} />
                    </div>
                  </div>

                  {/* Advice Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: strategySummary.missingRiskMessages?.length ? '16px' : '0' }}>
                    {strategySummary.advice.map((item, i) => (
                      <div key={i} style={{ 
                        display: 'flex', alignItems: 'flex-start', gap: '10px', 
                        padding: '12px', background: 'rgba(59, 130, 246, 0.05)', 
                        border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '8px',
                        fontSize: '13px', color: 'var(--text-secondary)'
                      }}>
                        <Info size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Missing Risk Messages */}
                  {strategySummary.missingRiskMessages && strategySummary.missingRiskMessages.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {strategySummary.missingRiskMessages.map((item, i) => (
                        <div key={`missing-${i}`} style={{ 
                          display: 'flex', alignItems: 'flex-start', gap: '10px', 
                          padding: '12px', background: 'rgba(239, 68, 68, 0.05)', 
                          border: '1px dashed rgba(239, 68, 68, 0.3)', borderRadius: '8px',
                          fontSize: '13px', color: 'var(--text-secondary)'
                        }}>
                          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                          {item}
                        </div>
                      ))}
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

              {safeOptions.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", color: "var(--safe-text)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <CheckCircle2 size={18} /> Safe Colleges
                  </h3>
                  {safeOptions.map(renderOptionCard)}
                </div>
              )}

              {moderateOptions.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", color: "var(--moderate-text)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <Info size={18} /> Moderate Colleges
                  </h3>
                  {moderateOptions.map(renderOptionCard)}
                </div>
              )}

              {dreamOptions.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", color: "var(--dream-text)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <AlertTriangle size={18} /> Dream Colleges
                  </h3>
                  {dreamOptions.map(renderOptionCard)}
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