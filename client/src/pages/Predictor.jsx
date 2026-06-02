import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Target, Wallet, GraduationCap, CheckCircle2, AlertTriangle, Info, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { API_URL } from "../config/api";
import InfoTooltip from "../components/InfoTooltip";
import CollegeCard from "../components/CollegeCard";
import { useCounsel } from "../context/CounselContext";
import logger from "../utils/logger";
import MultiSelect from "../components/MultiSelect";

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

  useEffect(() => {
    if (selectedDistricts.length === 0 && strictDistrictFilter) {
      setStrictDistrictFilter(false);
    }
  }, [selectedDistricts, strictDistrictFilter, setStrictDistrictFilter]);

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
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
          Decision Support Tool
        </span>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.02em', color: 'var(--primary)' }}>
          College Predictor & Advisor
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
          Evaluate engineering colleges in Telangana based on previous years' official EAPCET cutoff trends.
        </p>
      </div>

      {error && (
        <div className="warning-alert" style={{ marginBottom: '32px' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      <div className="predictor-layout">
        {/* Left Column: Student Inputs */}
        <div className="sidebar-sticky-wrapper">
          <div className="glass-card" style={{ padding: '24px', borderTop: '4px solid var(--primary)' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
              <Target size={18} /> Counselling Parameters
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label style={{ fontWeight: '600' }}>TS EAPCET Hall Ticket Rank *</label>
                <input className="input-field" type="number" placeholder="e.g., 15000" value={rank} onChange={(e) => setRank(e.target.value)} />
              </div>

              {/* Grid Layout for Category & Gender */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label style={{ fontWeight: '600' }}>Category *</label>
                  <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Select</option>
                    {["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label style={{ fontWeight: '600' }}>Gender *</label>
                  <select className="input-field" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select</option>
                    <option value="BOYS">BOYS</option>
                    <option value="GIRLS">GIRLS</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontWeight: '600' }}>Special Reservation (Optional)</label>
                <select className="input-field" value={specialCategory} onChange={(e) => setSpecialCategory(e.target.value)}>
                  {["None", "NCC", "Sports", "CAP", "PH", "EWS", "Others"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <MultiSelect
                label="Preferred Districts (Optional)"
                options={districts}
                selected={selectedDistricts}
                onChange={setSelectedDistricts}
                placeholder="All Districts"
                searchable={true}
              />
              
              {selectedDistricts.length > 0 && (
                <div style={{ margin: "-8px 0 8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: '12px', cursor: "pointer", color: "var(--text-secondary)" }}>
                    <input 
                      type="checkbox" 
                      checked={strictDistrictFilter} 
                      onChange={(e) => setStrictDistrictFilter(e.target.checked)} 
                      style={{ width: "15px", height: "15px", accentColor: "var(--primary)", cursor: "pointer" }} 
                    />
                    <span>Strict District Filter (Only show selected)</span>
                  </label>
                </div>
              )}

              <div className="input-group">
                <label style={{ fontWeight: '600' }}>Branch Category *</label>
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
                <label style={{ fontWeight: '600' }}>Specific Branch *</label>
                {branchType ? (
                  <MultiSelect
                    options={branchGroups[branchType] || []}
                    selected={selectedBranchCode ? [selectedBranchCode] : []}
                    onChange={(newVals) => {
                      const latest = newVals[newVals.length - 1] || "";
                      setSelectedBranchCode(latest);
                    }}
                    placeholder="Select Branch"
                    searchable={true}
                    getOptionLabel={(opt) => opt.label}
                    getOptionValue={(opt) => opt.code}
                    getSelectedLabel={(opt) => opt.code}
                  />
                ) : (
                  <select 
                    className="input-field" 
                    value="" 
                    disabled 
                    style={{ minHeight: '46px' }}
                  >
                    <option value="">Select Category first</option>
                  </select>
                )}
              </div>

              <div className="input-group">
                <label style={{ fontWeight: '600' }}>Annual Fee Limit (Optional)</label>
                <input className="input-field" type="number" placeholder="e.g. 100000" value={maxFees} onChange={(e) => setMaxFees(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button className="btn btn-primary" onClick={handlePredict} disabled={loading} style={{ flex: 1 }}>
                  {loading ? "Analyzing..." : "Generate Report"}
                </button>
                <button className="btn btn-secondary" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Prediction Results */}
        <div>
          {!hasSearched && !loading && (
            <div className="glass-card" style={{ padding: '80px 24px', textAlign: 'center', borderStyle: 'dashed', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Target size={40} style={{ color: 'var(--muted)', marginBottom: '16px', opacity: 0.7 }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>
                Awaiting Inputs
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
                Please configure your EAPCET rank, category, and preferred branches on the left panel to generate your official counselling advisory predictions.
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '100px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="skeleton animate-pulse" style={{ width: '48px', height: '48px', borderRadius: '50%', marginBottom: '16px' }}></div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--primary)', marginBottom: '8px' }}>Analyzing Historical Datasets</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                Correlating EAPCET cutoffs and generating custom admission matching scores...
              </p>
            </div>
          )}

          {hasSearched && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              
              {/* Strategic Special Category Advantage Alert Box */}
              {specialCategoryMsg && (
                <div className="info-alert" style={{ margin: 0 }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ fontWeight: '700', display: 'block', marginBottom: '2px' }}>Strategic Reservation Advantage Applied</strong>
                    <span>{specialCategoryMsg}</span>
                  </div>
                </div>
              )}

              {/* Prediction Results List */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> Recommended College Options
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Found {strongMatches.length} matching priorities
                  </span>
                </div>

                {strongMatches.length > 0 ? (
                  <div className="grid-2" style={{ gap: '16px' }}>
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
                  <div className="glass-card" style={{ padding: '48px', textAlign: 'center', borderStyle: 'dashed' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                      No matching colleges found within these parameters. Try relaxing the fee limit or selecting other branches/districts.
                    </p>
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
