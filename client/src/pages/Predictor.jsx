import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Target, Wallet, GraduationCap, CheckCircle2, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { API_URL } from "../config/api";

const districtOptions = [
  "HYD", "MDL", "RR", "KGM", "SRP", "WGL", "KHM", "MED", "SRD", "KMR", "NZB", "KRM", "JTL", "MHB", "SDP", "PDL", "SRC", "WNP", "MBN", "HNK", "NPT", "NLG", "YBG",
];

import { getBranchType } from "../utils/branchLogic";

function Predictor() {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [district, setDistrict] = useState("");

  const [branchType, setBranchType] = useState("");
  const [selectedBranchCode, setSelectedBranchCode] = useState("");
  const [maxFees, setMaxFees] = useState("");

  const [branches, setBranches] = useState([]);
  const [safeResults, setSafeResults] = useState([]);
  const [moderateResults, setModerateResults] = useState([]);
  const [dreamResults, setDreamResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("guest_preferences");
    if (saved) {
      const prefs = JSON.parse(saved);
      if (prefs.rank) setRank(prefs.rank);
      if (prefs.category) setCategory(prefs.category);
      if (prefs.gender) setGender(prefs.gender);
    }
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/colleges/branches`)
      .then((res) => res.json())
      .then((data) => setBranches(data.branches || []))
      .catch((err) => {
        console.error("Failed to load branches", err);
        setError("Unable to connect to server. Please try again later.");
      });
  }, []);

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
    if (!selectedBranchCode) return setError("Please select a specific branch");

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await fetch(`${API_URL}/api/predictor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rank: Number(rank), 
          category, 
          gender, 
          district, 
          branch: selectedBranchCode, // Sending branchCode for exact match
          maxFees: maxFees ? Number(maxFees) : "" 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Prediction failed");
        setLoading(false);
        return;
      }
      
      setSafeResults(data.safeRecommendations || []);
      setModerateResults(data.moderateRecommendations || []);
      setDreamResults(data.dreamRecommendations || []);
    } catch {
      setError("Prediction failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setRank(""); setCategory(""); setGender(""); setDistrict(""); setBranchType(""); setSelectedBranchCode(""); setMaxFees(""); 
    setSafeResults([]); setModerateResults([]); setDreamResults([]); setHasSearched(false);
  };

  const getRiskColor = (label) => {
    if (label === "Safe") return "safe";
    if (label === "Moderate") return "moderate";
    return "dream";
  };

  const getRiskIcon = (label) => {
    if (label === "Safe") return <CheckCircle2 size={16} />;
    if (label === "Moderate") return <Info size={16} />;
    return <AlertTriangle size={16} />;
  };

  const renderCollegeCard = (college, idx) => {
    const riskStatus = getRiskColor(college.riskLabel);
    return (
      <div key={college._id || idx} className="glass-card animate-up" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: `var(--${riskStatus}-text)` }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', marginBottom: '4px', lineHeight: 1.3 }}>{college.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <MapPin size={14} /> {college.place}, {college.district} &nbsp;&bull;&nbsp; {college.collegeCode}
            </p>
          </div>
          <div className={`badge badge-${riskStatus}`} style={{ gap: '4px', padding: '4px 10px', fontSize: '12px', whiteSpace: 'nowrap' }}>
            {getRiskIcon(college.riskLabel)}
            {college.riskLabel}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Branch</p>
            <p style={{ fontWeight: '500', fontSize: '13px' }}>{college.branchCode}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Fees</p>
            <p style={{ fontWeight: '500', fontSize: '13px' }}>₹{college.fees?.toLocaleString() || "N/A"}</p>
          </div>
        </div>
        
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <Link to={`/college/${college.collegeCode}`} style={{ color: 'var(--accent-blue)', fontSize: '13px', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
            View Details <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    );
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
        <div className="glass-card">
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
            <Target size={22} style={{ color: 'var(--accent-blue)' }} /> Parameters
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group">
              <label>EAMCET Rank *</label>
              <input className="input-field" type="number" placeholder="Enter your rank" value={rank} onChange={(e) => setRank(e.target.value)} />
            </div>

            <div className="grid-2" style={{ gap: '16px' }}>
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
              <label>Preferred District</label>
              <select className="input-field" value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="">All Districts</option>
                {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

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
              {/* Dream Section */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--dream-text)' }}></div>
                  <h2 style={{ fontSize: '20px' }}>Top Dream Colleges</h2>
                </div>
                {dreamResults.length > 0 ? (
                  <div className="grid-2" style={{ gap: '20px' }}>
                    {dreamResults.map((c, i) => renderCollegeCard(c, i))}
                  </div>
                ) : (
                  <div className="glass-card" style={{ padding: '24px', textAlign: 'center', opacity: 0.6, borderStyle: 'dashed' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>No Dream matches found for this criteria.</p>
                  </div>
                )}
              </section>

              {/* Moderate Section */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--moderate-text)' }}></div>
                  <h2 style={{ fontSize: '20px' }}>Top Moderate Colleges</h2>
                </div>
                {moderateResults.length > 0 ? (
                  <div className="grid-2" style={{ gap: '20px' }}>
                    {moderateResults.map((c, i) => renderCollegeCard(c, i))}
                  </div>
                ) : (
                  <div className="glass-card" style={{ padding: '24px', textAlign: 'center', opacity: 0.6, borderStyle: 'dashed' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>No Moderate matches found for this criteria.</p>
                  </div>
                )}
              </section>

              {/* Safe Section */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--safe-text)' }}></div>
                  <h2 style={{ fontSize: '20px' }}>Top Safe Colleges</h2>
                </div>
                {safeResults.length > 0 ? (
                  <div className="grid-2" style={{ gap: '20px' }}>
                    {safeResults.map((c, i) => renderCollegeCard(c, i))}
                  </div>
                ) : (
                  <div className="glass-card" style={{ padding: '24px', textAlign: 'center', opacity: 0.6, borderStyle: 'dashed' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>No matches found for this criteria.</p>
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
