import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scale, Search, X, CheckCircle2, XCircle, MapPin, Wallet, TrendingUp, Building2, Home, ExternalLink } from "lucide-react";
import { API_URL } from "../config";

function Compare() {
  const [inputValue, setInputValue] = useState("");
  const [codes, setCodes] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allColleges, setAllColleges] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch all colleges for suggestions
    fetch(`${API_URL}/api/colleges?limit=5000`)
      .then(res => res.json())
      .then(data => setAllColleges(data.colleges || []))
      .catch(err => console.error(err));
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (value.length > 1) {
      const filtered = allColleges.filter(c => 
        c.collegeCode.toLowerCase().includes(value.toLowerCase()) || 
        c.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addCode = (code) => {
    const upperCode = code.toUpperCase();
    if (upperCode && !codes.includes(upperCode) && codes.length < 4) {
      setCodes([...codes, upperCode]);
    }
    setInputValue("");
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newCode = inputValue.trim().toUpperCase();
      if (newCode && !codes.includes(newCode)) {
        setCodes([...codes, newCode]);
      }
      setInputValue("");
    }
  };

  const removeCode = (codeToRemove) => {
    setCodes(codes.filter(c => c !== codeToRemove));
  };

  const compareColleges = async () => {
    if (codes.length < 2) {
      setError("Select at least 2 colleges to compare");
      return;
    }

    setError("");
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeCodes: codes })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Compare failed");
        setLoading(false);
        return;
      }
      setColleges(data.colleges || []);
    } catch {
      setError("Server connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Find best values for highlighting
  const minFees = colleges.length ? Math.min(...colleges.map(c => c.fees || Infinity)) : null;
  const maxAvgPkg = colleges.length ? Math.max(...colleges.map(c => c.placements?.avgPackage || 0)) : null;

  return (
    <div className="page-wrapper container">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="section-title" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <Scale size={36} style={{ color: 'var(--accent-blue)' }} /> Compare Colleges
        </h1>
        <p className="section-subtitle">Make an informed decision by comparing fees, placements, and facilities side-by-side.</p>
      </div>

      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto 40px', padding: '32px' }}>
        <label style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
          Enter College Codes (e.g., CBIT, VJEC)
        </label>
        
        <div style={{ 
          display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px', 
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-md)', minHeight: '56px', alignItems: 'center' 
        }}>
          {codes.map(code => (
            <div key={code} style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', 
              background: 'var(--accent-glow)', border: '1px solid var(--accent-blue)', 
              color: 'var(--accent-blue)', borderRadius: '20px', fontSize: '14px', fontWeight: '500' 
            }}>
              {code}
              <button onClick={() => removeCode(code)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
          ))}
          
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (suggestions.length > 0) addCode(suggestions[0].collegeCode);
                  else if (inputValue) addCode(inputValue);
                }
              }}
              placeholder={codes.length === 0 ? "Type college name or code..." : "Add another..."}
              style={{ 
                flex: 1, minWidth: '200px', background: 'transparent', border: 'none', 
                color: 'var(--text-primary)', outline: 'none', padding: '8px', fontSize: '15px'
              }}
            />
            {suggestions.length > 0 && (
              <div className="glass-card" style={{ 
                position: 'absolute', top: '100%', left: 0, width: '100%', 
                zIndex: 10, marginTop: '8px', padding: '8px', 
                maxHeight: '200px', overflowY: 'auto', textAlign: 'left'
              }}>
                {suggestions.map(c => (
                  <div 
                    key={c._id} 
                    onClick={() => addCode(c.collegeCode)}
                    style={{ 
                      padding: '10px 12px', cursor: 'pointer', borderRadius: '8px',
                      display: 'flex', flexDirection: 'column', gap: '2px'
                    }}
                    className="search-result-item"
                  >
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{c.collegeCode}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>
          Compare 2 to 4 colleges side-by-side. Use code or full name.
        </p>

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

        <button className="btn btn-primary" onClick={compareColleges} disabled={loading || codes.length < 2} style={{ width: '100%' }}>
          {loading ? "Analyzing..." : "Compare Now"} <Search size={18} />
        </button>
      </div>

      {colleges.length > 0 && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: `repeat(auto-fit, minmax(280px, 340px))`, 
          justifyContent: "center",
          gap: "24px", 
          paddingBottom: "40px" 
        }}>
          {colleges.map((c) => (
            <div key={c.collegeCode} className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "inline-block", background: "var(--bg-secondary)", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", marginBottom: "12px", border: "1px solid var(--border-color)" }}>
                  {c.collegeCode}
                </div>
                <h2 style={{ fontSize: "20px", marginBottom: "8px", lineHeight: "1.3", height: "52px", overflow: "hidden" }}>{c.name}</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={14} /> {c.place}, {c.district}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", flexGrow: 1 }}>
                <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Wallet size={14} /> Annual Fees
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "600", color: c.fees === minFees ? "var(--safe-text)" : "var(--text-primary)" }}>
                    ₹{c.fees?.toLocaleString() || "N/A"}
                    {c.fees === minFees && <span style={{ fontSize: "10px", marginLeft: "8px", background: "var(--safe-bg)", padding: "2px 6px", borderRadius: "8px" }}>Lowest</span>}
                  </div>
                </div>

                <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <TrendingUp size={14} /> Average Package
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "600", color: c.placements?.avgPackage === maxAvgPkg && maxAvgPkg > 0 ? "var(--accent-blue)" : "var(--text-primary)" }}>
                    {c.placements?.avgPackage || "N/A"} LPA
                    {c.placements?.avgPackage === maxAvgPkg && maxAvgPkg > 0 && <span style={{ fontSize: "10px", marginLeft: "8px", background: "var(--accent-glow)", padding: "2px 6px", borderRadius: "8px" }}>Highest</span>}
                  </div>
                </div>

                <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}><Building2 size={14} /> NBA</span>
                    <span>{c.ranking?.nba ? <CheckCircle2 size={16} style={{color: "var(--safe-text)"}}/> : <XCircle size={16} style={{color: "var(--text-muted)"}}/>}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}><Home size={14} /> Hostel</span>
                    <span>{c.facilities?.hostel ? <CheckCircle2 size={16} style={{color: "var(--safe-text)"}}/> : <XCircle size={16} style={{color: "var(--text-muted)"}}/>}</span>
                  </div>
                </div>

                <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Top Branches Cutoff</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {c.branches?.slice(0, 4).map((b) => (
                      <div key={b.branchCode} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ fontWeight: "500" }}>{b.branchCode}</span>
                        <span>{b.bestCutoff}</span>
                      </div>
                    ))}
                    {!c.branches?.length && <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Data unavailable</div>}
                  </div>
                </div>
              </div>

              <Link to={`/college/${c.collegeCode}`} className="btn btn-secondary" style={{ marginTop: "24px", width: "100%" }}>
                Full Profile <ExternalLink size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Compare;