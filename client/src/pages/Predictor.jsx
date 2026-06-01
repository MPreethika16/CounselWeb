import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Target, Wallet, GraduationCap, CheckCircle2, AlertTriangle, Info, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { API_URL } from "../config/api";
import InfoTooltip from "../components/InfoTooltip";
import CollegeCard from "../components/CollegeCard";
import { useCounsel } from "../context/CounselContext";
import logger from "../utils/logger";

import { getBranchType } from "../utils/branchLogic";

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
    missingMessages, setMissingMessages,
    hasSearched, setHasSearched,
    preferences, setPreferences,
    resetState
  } = useCounsel();

  const [districtSelectVal, setDistrictSelectVal] = useState("");
  const [specialCategoryMsg, setSpecialCategoryMsg] = useState("");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/colleges/branches`)
      .then((res) => res.json())
      .then((data) => setBranches(data.branches || []))
      .catch((err) => {
        logger.error("Failed to load branches", err);
        setError("Unable to connect to server. Please try again later.");
      });
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/districts`)
      .then((res) => res.json())
      .then((data) => setDistricts(data.districts || []))
      .catch((err) => logger.error("Failed to load districts", err));
  }, []);

  logger.log("Districts:", districts);

  const branchGroups = useMemo(() => {
    const groups = { computing: new Map(), electrical: new Map(), core: new Map(), agriculture: new Map(), medical: new Map(), other: new Map() };
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
    if (!rank) return setError("Please enter your EAMCET Rank");
    if (!category) return setError("Please select your Category");
    if (!gender) return setError("Please select Gender");

    const activeBranch = selectedBranchCode || (preferences && preferences.length > 0 ? preferences[0] : null);
    if (!activeBranch) return setError("Please select a specific branch");

    try {
      setLoading(true);
      setHasSearched(true);
      setError("");
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
        setError(data.error || "Prediction failed");
        setLoading(false);
        return;
      }
      
      setStrongMatches(data.strongMatches || data.colleges || []);
      setBackupResults([]);
      setBestMatchResults([]);
      setCompetitiveResults([]);

      setMissingMessages(data.missingMessages || {});
      setSpecialCategoryMsg(data.specialCategoryMessage || "");
    } catch {
      setError("Prediction failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    resetState();
    setDistrictSelectVal("");
    setSpecialCategoryMsg("");
  };



  return (
    <div className="page-wrapper container">
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <h1 className="section-title">College Predictor</h1>
        <p className="section-subtitle">Find the best engineering colleges in Telangana based on your EAMCET rank.</p>
      </div>

      {error && (
        <div className="glass-card" style={{ marginBottom: '32px', padding: '16px 24px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="predictor-layout">
        <div className="sidebar-sticky-wrapper">
          <div className="glass-card">
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
              <Target size={22} style={{ color: 'var(--accent-blue)' }} /> Parameters
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>EAMCET Rank *</label>
                <input className="input-field" type="number" placeholder="Enter your rank" value={rank} onChange={(e) => setRank(e.target.value)} />
              </div>

              {/* Grid 3 Layout for Category, Gender, and Special Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '4px' }}>
                <div className="input-group">
                  <label>Category *</label>
                  <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Select</option>
                    {["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Gender *</label>
                  <select className="input-field" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select</option>
                    <option value="BOYS">BOYS</option>
                    <option value="GIRLS">GIRLS</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Special Category</label>
                <select className="input-field" value={specialCategory} onChange={(e) => setSpecialCategory(e.target.value)}>
                  {["None", "NCC", "Sports", "CAP", "PH", "EWS", "Others"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label>Preferred Districts (Optional)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="input-field" 
                    value={districtSelectVal} 
                    onChange={(e) => setDistrictSelectVal(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select District</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      if (districtSelectVal && !selectedDistricts.includes(districtSelectVal)) {
                        setSelectedDistricts([...selectedDistricts, districtSelectVal]);
                        setDistrictSelectVal("");
                      }
                    }}
                    style={{ width: 'auto', padding: '10px 20px' }}
                  >
                    Add
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: '12px' }}>
                  {selectedDistricts.map((d) => (
                    <div
                      key={d}
                      className="badge badge-primary"
                      style={{
                        padding: "6px 12px", fontSize: "12px", borderRadius: "16px",
                        display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'none',
                        background: 'var(--accent-blue)', color: 'white'
                      }}
                    >
                      {d}
                      <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSelectedDistricts(selectedDistricts.filter(sd => sd !== d))} />
                    </div>
                  ))}
                  {selectedDistricts.length > 0 && (
                    <button 
                      className="btn" 
                      onClick={() => setSelectedDistricts([])}
                      style={{ padding: '4px 10px', fontSize: '11px', background: 'transparent', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {selectedDistricts.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Searching All Districts</p>
                )}
              </div>

              {/* Strict District Filter Toggle */}
              {selectedDistricts.length > 0 && (
                <div style={{ margin: "-8px 0 4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", cursor: "pointer", color: "var(--text-secondary)" }}>
                    <input 
                      type="checkbox" 
                      checked={strictDistrictFilter} 
                      onChange={(e) => setStrictDistrictFilter(e.target.checked)} 
                      style={{ width: "16px", height: "16px", accentColor: "var(--accent-blue)", cursor: "pointer" }} 
                    />
                    <span>Strict District Filter (Only show selected)</span>
                  </label>
                </div>
              )}

              <div className="input-group">
                <label>Branch Category *</label>
                <select className="input-field" value={branchType} onChange={(e) => { setBranchType(e.target.value); setSelectedBranchCode(""); }}>
                  <option value="">Select Category</option>
                  <option value="computing">Computing</option>
                  <option value="electrical">Electrical</option>
                  <option value="core">Core</option>
                  <option value="agriculture">Agriculture & Food</option>
                  <option value="medical">Medical & Pharma</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="input-group">
                <label>Specific Branch *</label>
                <select 
                  className="input-field" 
                  value={selectedBranchCode} 
                  onChange={(e) => setSelectedBranchCode(e.target.value)}
                  disabled={!branchType}
                >
                  <option value="">{branchType ? "Select Branch" : "Select Category first"}</option>
                  {branchType && branchGroups[branchType]?.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Max Fees (Optional)</label>
                <input className="input-field" type="number" placeholder="e.g. 100000" value={maxFees} onChange={(e) => setMaxFees(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button className="btn btn-primary" onClick={handlePredict} disabled={loading} style={{ flex: 1 }}>
                  {loading ? "Processing..." : "Get Results"}
                </button>
                <button className="btn btn-secondary" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          {!hasSearched && !loading && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '100px 40px' }}>
              <Target size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 24px', opacity: 0.5 }} />
              <h2 style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Predictions Ready</h2>
              <p style={{ color: 'var(--text-muted)' }}>Enter your rank and branch preferences to see your best college matches.</p>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Analyzing thousands of data points...</p>
            </div>
          )}

          {hasSearched && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              
              {/* Strategic Special Category Advantage Alert Box */}
              {specialCategoryMsg && (
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.08)', 
                  border: '1px solid rgba(59, 130, 246, 0.2)', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  fontSize: '13px', 
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  lineHeight: '1.5'
                }}>
                  <Info size={18} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--accent-blue)', display: 'block', marginBottom: '2px' }}>Strategic Rank Advantage Applied</span>
                    <span>{specialCategoryMsg}</span>
                  </div>
                </div>
              )}

              {/* Top 5 Strong Matching Colleges Section */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
                  <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center' }}>
                    Top 5 Strong Matching Colleges
                    <InfoTooltip text="These 5 colleges are identified as the strongest and most realistic target matches for your rank." />
                  </h2>
                </div>
                {strongMatches.length > 0 ? (
                  <div className="grid-2" style={{ gap: '20px' }}>
                    {strongMatches.map((c, i) => (
                      <CollegeCard 
                        key={c._id || i} 
                        college={c} 
                        idx={i} 
                        category={category} 
                        gender={gender} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="glass-card" style={{ padding: '40px', textAlign: 'center', opacity: 0.8, border: '1px dashed var(--border-color)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>No matching colleges found. Try expanding districts or relaxing the fee limit.</p>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Predictor;
