import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Building2, Wallet, TrendingUp, Award, Star, ExternalLink, Library, Wifi, Bus, Coffee, Dumbbell, Stethoscope, Microscope, Home, CheckCircle2 } from "lucide-react";

import { API_URL } from "../config";

const FACILITY_ICONS = {
  hostel: <Home size={20} />,
  library: <Library size={20} />,
  wifi: <Wifi size={20} />,
  transport: <Bus size={20} />,
  cafeteria: <Coffee size={20} />,
  sports: <Dumbbell size={20} />,
  medical: <Stethoscope size={20} />,
  labs: <Microscope size={20} />,
};

function CollegeDetails() {
  const { collegeCode } = useParams();
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/colleges/details/${collegeCode}`)
      .then((res) => res.json())
      .then((data) => setCollege(data))
      .catch(() => alert("Failed to load college details"))
      .finally(() => setLoading(false));
  }, [collegeCode]);

  if (loading) return (
    <div className="page-wrapper container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid var(--border-color)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );
  
  if (!college) return (
    <div className="page-wrapper container" style={{ textAlign: 'center' }}>
      <h2>College not found</h2>
      <p style={{ color: 'var(--text-muted)' }}>The requested college code could not be located.</p>
    </div>
  );

  return (
    <div className="page-wrapper container">
      {/* Hero Header */}
      <div className="glass-card" style={{ marginBottom: "32px", position: "relative", overflow: "hidden", padding: "40px" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: "300px", height: "300px", background: "var(--accent-glow)", filter: "blur(100px)", borderRadius: "50%", zIndex: 0 }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", background: "var(--bg-secondary)", padding: "6px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "600", marginBottom: "16px", border: "1px solid var(--border-color)" }}>
            {college.collegeCode}
          </div>
          
          <h1 style={{ fontSize: "42px", marginBottom: "16px", background: "linear-gradient(135deg, var(--text-primary), var(--text-muted))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {college.name}
          </h1>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", color: "var(--text-secondary)", fontSize: "15px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><MapPin size={18} /> {college.place}, {college.district}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Building2 size={18} /> Affiliated to {college.affiliated || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: "32px" }}>
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
            <Wallet size={20} style={{ color: "var(--accent-blue)" }}/> Annual Fees
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700" }}>₹{college.fees?.toLocaleString() || "N/A"}</div>
        </div>
        
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
            <TrendingUp size={20} style={{ color: "var(--safe-text)" }}/> Avg Package
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700" }}>{college.placements?.avgPackage || "N/A"} <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>LPA</span></div>
        </div>

        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
            <TrendingUp size={20} style={{ color: "var(--dream-text)" }}/> Highest Package
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700" }}>{college.placements?.highestPackage || "N/A"} <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>LPA</span></div>
        </div>

        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
            <Award size={20} style={{ color: "var(--accent-purple)" }}/> Accreditation
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {college.ranking?.nba && <span className="badge badge-outline" style={{ background: "rgba(168, 85, 247, 0.1)", borderColor: "rgba(168, 85, 247, 0.3)", color: "var(--accent-purple)" }}>NBA Accredited</span>}
            {college.ranking?.naac && <span className="badge badge-outline">NAAC {college.ranking.naac}</span>}
            {(!college.ranking?.nba && !college.ranking?.naac) && <span style={{ fontSize: "18px", fontWeight: "600" }}>N/A</span>}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          
          <div className="glass-card">
            <h2 style={{ marginBottom: "20px", fontSize: "22px" }}>Branches Offered</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {college.branches?.map((b) => (
                <div key={b.branchCode} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "15px", marginBottom: "4px" }}>{b.branch}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{b.branchCode}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Best Cutoff</div>
                    <div className="badge badge-outline" style={{ background: "var(--bg-primary)" }}>{b.bestCutoff}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <h2 style={{ marginBottom: "20px", fontSize: "22px" }}>Student Reviews</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {college.reviews?.length ? (
                college.reviews.map((r, i) => (
                  <div key={i} style={{ padding: "16px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", position: "relative" }}>
                    <Star size={16} style={{ color: "var(--moderate-text)", position: "absolute", top: "16px", left: "16px" }} fill="currentColor" />
                    <p style={{ margin: 0, paddingLeft: "28px", fontSize: "14px", color: "var(--text-secondary)", fontStyle: "italic" }}>"{r}"</p>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--text-muted)" }}>No reviews available yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          
          <div className="glass-card">
            <h2 style={{ marginBottom: "20px", fontSize: "22px" }}>Facilities</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {Object.entries(college.facilities || {}).map(([key, value]) => {
                if (!value) return null;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", textTransform: "capitalize", fontSize: "14px", fontWeight: "500" }}>
                    {FACILITY_ICONS[key] || <CheckCircle2 size={18} />}
                    {key}
                  </div>
                );
              })}
            </div>
            {Object.values(college.facilities || {}).every(v => !v) && <p style={{ color: "var(--text-muted)" }}>No facility data available.</p>}
          </div>

          <div className="glass-card">
            <h2 style={{ marginBottom: "20px", fontSize: "22px" }}>Gallery</h2>
            <div className="grid-2" style={{ gap: "12px" }}>
              {college.gallery?.length ? (
                college.gallery.map((img, i) => (
                  <img key={i} src={img} alt={`Campus view ${i+1}`} onError={(e) => e.target.style.display = 'none'} style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }} />
                ))
              ) : (
                <div style={{ 
                  gridColumn: "1 / -1", padding: "60px 20px", textAlign: "center", 
                  background: "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.05))", border: "1px dashed var(--border-color)",
                  borderRadius: "var(--radius-md)", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
                }}>
                  <Building2 size={40} style={{ opacity: 0.4, color: 'var(--accent-blue)' }} />
                  <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '500' }}>No gallery images available for this college yet.</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: '12px' }}>
                    {college.name} ({college.collegeCode})
                  </div>
                </div>
              )}
            </div>
          </div>

          {college.sourceUrl && (
            <a href={college.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: "flex", justifyContent: "center" }}>
              View Official Source <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default CollegeDetails;