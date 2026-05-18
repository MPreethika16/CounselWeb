import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scale, Search, X, CheckCircle2, XCircle, MapPin, Wallet, TrendingUp, Building2, Home, ExternalLink } from "lucide-react";
import { API_URL } from "../config/api";
import MultiSelect from "../components/MultiSelect";
import { logger } from "../utils/logger";

function Compare() {
  const [codes, setCodes] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allColleges, setAllColleges] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch all colleges for suggestions
    fetch(`${API_URL}/api/colleges?limit=5000`)
      .then(res => res.json())
      .then(data => setAllColleges(data.colleges || []))
      .catch(err => logger.error(err));
  }, []);

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
        <div style={{ marginBottom: '16px' }}>
          <MultiSelect
            options={allColleges}
            selected={codes}
            onChange={(newCodes) => {
              if (newCodes.length > 4) {
                setError("You can compare up to 4 colleges");
                return;
              }
              setError("");
              setCodes(newCodes);
            }}
            placeholder="Type college name or code..."
            getOptionLabel={(opt) => `${opt.collegeCode} - ${opt.name}`}
            getOptionValue={(opt) => opt.collegeCode}
            getSelectedLabel={(opt) => opt.collegeCode}
            searchable={true}
          />
        </div>
        
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '24px' }}>
          Compare 2 to 4 colleges side-by-side. Search by code or full name.
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