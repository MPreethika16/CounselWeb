import { useEffect, useState } from "react";
import { Building2, MapPin, Wallet, TrendingUp, Award, Zap, Save } from "lucide-react";
import { API_URL } from "../config/api";
import { getCookie } from "../utils/cookie";
import logger from "../utils/logger";

function InstitutionDashboard() {
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [collegeResults, setCollegeResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [form, setForm] = useState({
    fees: "",
    avgPackage: "",
    highestPackage: "",
    medianPackage: "",
    placementPercentage: "",
    nba: false,
    naac: "",
    hostel: false,
    sports: false,
    library: false,
    wifi: false,
    labs: false,
    transport: false,
    events: false,
    ncc: false,
    nss: false
  });

  const token = getCookie("token");

  async function loadCollege() {
    if (!token) {
      showNotification("Login required", "error");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/institution/my-college`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        showNotification(data.message || data.error || "Failed to load college", "error");
        return;
      }

      setCollege(data);

      setForm({
        fees: data.fees || "",
        avgPackage: data.placements?.avgPackage || "",
        highestPackage: data.placements?.highestPackage || "",
        medianPackage: data.placements?.medianPackage || "",
        placementPercentage: data.placements?.placementPercentage || "",
        nba: data.ranking?.nba || false,
        naac: data.ranking?.naac || "",
        hostel: data.facilities?.hostel || false,
        sports: data.facilities?.sports || false,
        library: data.facilities?.library || false,
        wifi: data.facilities?.wifi || false,
        labs: data.facilities?.labs || false,
        transport: data.facilities?.transport || false,
        events: data.facilities?.events || false,
        ncc: data.facilities?.ncc || false,
        nss: data.facilities?.nss || false
      });
    } catch {
      showNotification("Server error", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    loadCollege();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function toNumberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    return Number(value);
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!token) {
      showNotification("Login required", "error");
      return;
    }

    const payload = {
      fees: toNumberOrNull(form.fees),
      placements: {
        avgPackage: toNumberOrNull(form.avgPackage),
        highestPackage: toNumberOrNull(form.highestPackage),
        medianPackage: toNumberOrNull(form.medianPackage),
        placementPercentage: toNumberOrNull(form.placementPercentage)
      },
      ranking: {
        nba: form.nba,
        naac: form.naac
      },
      facilities: {
        hostel: form.hostel,
        sports: form.sports,
        library: form.library,
        wifi: form.wifi,
        labs: form.labs,
        transport: form.transport,
        events: form.events,
        ncc: form.ncc,
        nss: form.nss
      }
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/institution/my-college`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        showNotification(data.message || data.error || "Update failed", "error");
        return;
      }

      showNotification("College updated successfully");
      setCollege(data.college || data);
    } catch {
      showNotification("Server error", "error");
    } finally {
      setSaving(false);
    }
  }

  function showNotification(message, type = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }

  async function searchColleges(query) {
    if (query.length < 2) {
      setCollegeResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/colleges?search=${query}&limit=5`);
      const data = await res.json();
      setCollegeResults(data.colleges || []);
    } catch (err) {
      logger.error(err);
    } finally {
      setSearching(false);
    }
  }

  async function handleLinkCollege(collegeId) {
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/institution/link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ collegeId })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("College linked successfully!");
        setCollege(data.college);
        // Update stored user
        let parseSucceeded = true;
        let storedUser = {};
        try {
          storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        } catch (err) {
          logger.error("Failed to parse user in InstitutionDashboard:", err);
          parseSucceeded = false;
        }
        if (parseSucceeded) {
          storedUser.collegeId = collegeId;
          localStorage.setItem("user", JSON.stringify(storedUser));
        }
        window.dispatchEvent(new Event("authChange"));
        loadCollege();
      } else {
        showNotification(data.message || "Linking failed", "error");
      }
    } catch {
      showNotification("Server error", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="page-wrapper container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid var(--border-color)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!college) {
    return (
      <div className="page-wrapper container" style={{ maxWidth: '600px' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Building2 size={64} style={{ color: 'var(--accent-blue)', marginBottom: '24px', opacity: 0.8 }} />
          <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>Link Your College</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            To manage your institution's profile, please search and link your official college record.
          </p>
          
          <div className="input-group" style={{ position: 'relative', textAlign: 'left' }}>
            <label>Search College</label>
            <input 
              className="input-field" 
              placeholder="Enter college name or code (e.g. CBIT)..."
              value={collegeSearch}
              onChange={(e) => { setCollegeSearch(e.target.value); searchColleges(e.target.value); }}
            />
            {collegeResults.length > 0 && (
              <div className="glass-card" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 10, marginTop: '8px', padding: '8px' }}>
                {collegeResults.map(c => (
                  <div key={c._id} onClick={() => handleLinkCollege(c._id)} className="search-result-item" style={{ padding: '12px', cursor: 'pointer', borderRadius: '8px' }}>
                    <div style={{ fontWeight: '600' }}>{c.collegeCode}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {searching && <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>Searching...</p>}
        </div>
      </div>
    );
  }

  const facilitiesList = ["hostel", "sports", "library", "wifi", "labs", "transport", "events", "ncc", "nss"];

  return (
    <div className="page-wrapper container">
      {notification && (
        <div className={`glass-card notification notification-${notification.type}`} style={{ 
          position: 'fixed', top: '100px', right: '40px', zIndex: 2000, padding: '16px 24px', 
          background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          border: `1px solid ${notification.type === 'error' ? '#ef4444' : '#22c55e'}`,
          color: notification.type === 'error' ? '#ef4444' : '#22c55e',
          animation: 'slideInRight 0.3s ease forwards'
        }}>
          {notification.message}
        </div>
      )}

      <div style={{ marginBottom: "var(--spacing-md)", display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ padding: '16px', background: 'var(--accent-glow)', borderRadius: '16px', color: 'var(--accent-blue)' }}>
          <Building2 size={32} />
        </div>
        <div>
          <h1 style={{ fontSize: "32px", margin: "0 0 4px 0" }}>Institution Dashboard</h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Manage and update your college profile details.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Highest Package</p>
          <h2 style={{ color: 'var(--accent-blue)', margin: 0 }}>{college.placements?.highestPackage || 'N/A'} LPA</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Average Package</p>
          <h2 style={{ color: 'var(--accent-purple)', margin: 0 }}>{college.placements?.avgPackage || 'N/A'} LPA</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Placements</p>
          <h2 style={{ color: 'var(--safe-text)', margin: 0 }}>{college.placements?.placementPercentage || 'N/A'}%</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Annual Fees</p>
          <h2 style={{ color: 'var(--dream-text)', margin: 0 }}>₹{college.fees?.toLocaleString() || 'N/A'}</h2>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: "var(--spacing-md)" }}>
        <div style={{ display: "inline-block", background: "var(--bg-secondary)", padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", marginBottom: "12px", border: "1px solid var(--border-color)" }}>
          College Code: {college.collegeCode}
        </div>
        <h2 style={{ fontSize: "24px", marginBottom: "12px", color: "var(--text-primary)" }}>{college.name}</h2>
        <div style={{ display: "flex", gap: "24px", color: "var(--text-secondary)", fontSize: "14px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><MapPin size={16} /> {college.place}, {college.district}</span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Award size={16} /> Affiliated to {college.affiliated || 'N/A'}</span>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid-2">
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontSize: "18px" }}>
              <Wallet size={20} style={{ color: "var(--accent-blue)" }}/> Fee Structure
            </h3>
            <div className="input-group">
              <label>Annual Tuition Fee (₹)</label>
              <input
                type="number"
                name="fees"
                className="input-field"
                placeholder="e.g. 120000"
                value={form.fees ?? ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontSize: "18px" }}>
              <Award size={20} style={{ color: "var(--accent-purple)" }}/> Ranking & Accreditation
            </h3>
            <div className="grid-2">
              <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", cursor: "pointer", height: "fit-content" }}>
                <input
                  type="checkbox"
                  name="nba"
                  checked={form.nba}
                  onChange={handleChange}
                  style={{ width: "18px", height: "18px", accentColor: "var(--accent-blue)" }}
                />
                NBA Accredited
              </label>
              <div className="input-group">
                <label>NAAC Grade</label>
                <input
                  type="text"
                  name="naac"
                  className="input-field"
                  placeholder="e.g. A+"
                  value={form.naac ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "24px", marginTop: "24px" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontSize: "18px" }}>
            <TrendingUp size={20} style={{ color: "var(--safe-text)" }}/> Placements Data
          </h3>
          <div className="grid-4">
            <div className="input-group">
              <label>Average Package (LPA)</label>
              <input
                type="number"
                name="avgPackage"
                step="0.01"
                className="input-field"
                placeholder="e.g. 6.5"
                value={form.avgPackage ?? ""}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Highest Package (LPA)</label>
              <input
                type="number"
                name="highestPackage"
                step="0.01"
                className="input-field"
                placeholder="e.g. 45"
                value={form.highestPackage ?? ""}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Median Package (LPA)</label>
              <input
                type="number"
                name="medianPackage"
                step="0.01"
                className="input-field"
                placeholder="e.g. 5.5"
                value={form.medianPackage ?? ""}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Placement Percentage (%)</label>
              <input
                type="number"
                name="placementPercentage"
                step="0.1"
                className="input-field"
                placeholder="e.g. 85"
                value={form.placementPercentage ?? ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "24px", marginTop: "24px", marginBottom: "32px" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontSize: "18px" }}>
            <Zap size={20} style={{ color: "var(--dream-text)" }}/> Campus Facilities
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
            {facilitiesList.map((item) => (
              <label key={item} style={{ 
                display: "flex", alignItems: "center", gap: "10px", padding: "12px", 
                background: form[item] ? "var(--accent-glow)" : "var(--bg-secondary)", 
                border: `1px solid ${form[item] ? "var(--accent-blue)" : "var(--border-color)"}`, 
                borderRadius: "var(--radius-md)", cursor: "pointer", transition: "all 0.2s ease" 
              }}>
                <input
                  type="checkbox"
                  name={item}
                  checked={form[item]}
                  onChange={handleChange}
                  style={{ width: "16px", height: "16px", accentColor: "var(--accent-blue)" }}
                />
                <span style={{ textTransform: "capitalize", fontWeight: "500", color: form[item] ? "var(--accent-blue)" : "var(--text-primary)" }}>
                  {item}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: "12px 32px", fontSize: "16px" }}>
            {saving ? "Saving Updates..." : "Save Profile Updates"} <Save size={18} style={{ marginLeft: "8px" }}/>
          </button>
        </div>
      </form>
    </div>
  );
}

export default InstitutionDashboard;