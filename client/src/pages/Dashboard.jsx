import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, FileText, Calendar, Trash2, ExternalLink, Activity, User, Target, List, Search, Building2, MapPin } from "lucide-react";
import { API_URL } from "../config/api";

function Dashboard() {
  const [lists, setLists] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async (token) => {
    try {
      setLists([]);
      const optionsRes = await fetch(`${API_URL}/api/options/my`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (optionsRes.ok) {
        const optionsData = await optionsRes.json();
        setLists(optionsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteList = async (id) => {
    if (!window.confirm("Are you sure you want to delete this saved report?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/options/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        setLists((prev) => prev.filter((item) => item._id !== id));
      } else {
        alert("Delete failed");
      }
    } catch {
      alert("Server error");
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setUser(prefs);
      } catch (err) {
        console.error("Failed to parse saved user in Dashboard:", err);
      }
    }
    if (token) {
      fetchData(token);
    } else {
      setLoading(false);
    }
  }, []);

  if (!localStorage.getItem("token")) {
    return (
      <div className="page-wrapper container" style={{ textAlign: "center", paddingTop: "100px" }}>
        <h2 style={{ marginBottom: "16px" }}>Login Required</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>Please login to view your dashboard and saved reports.</p>
        <Link to="/login" className="btn btn-primary">Go to Login</Link>
      </div>
    );
  }

  if (loading) return (
    <div className="page-wrapper container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div className="skeleton" style={{ width: '52px', height: '52px', borderRadius: '12px' }}></div>
        <div>
          <div className="skeleton" style={{ width: '200px', height: '32px', marginBottom: '8px' }}></div>
          <div className="skeleton" style={{ width: '150px', height: '16px' }}></div>
        </div>
      </div>
      <div className="dashboard-layout">
        <div>
          <div className="skeleton" style={{ width: '180px', height: '24px', marginBottom: '24px' }}></div>
          <div className="grid-2" style={{ gap: '20px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card skeleton" style={{ height: '160px' }}></div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card skeleton" style={{ height: '200px' }}></div>
          <div className="glass-card skeleton" style={{ height: '250px' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ padding: '12px', background: 'var(--accent-glow)', borderRadius: '12px', color: 'var(--accent-blue)' }}>
          <LayoutDashboard size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: '32px', margin: 0 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Welcome back, {user?.name || 'Student'}.</p>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Main Content */}
        <div>
          <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <FileText size={20} style={{ color: 'var(--accent-purple)' }}/> Saved Reports ({lists.length})
          </h2>

          {lists.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Activity size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No saved reports yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px' }}>
                Generate your first web options list and save it to access it anytime from your dashboard.
              </p>
              <Link to="/web-options" className="btn btn-primary">
                Go to Web Options
              </Link>
            </div>
          ) : (
            <div className="grid-2" style={{ gap: '20px' }}>
              {lists.map((item) => (
                <div key={item._id} className="glass-card" style={{ padding: "24px", display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', margin: '0 0 8px 0', lineHeight: 1.3 }}>{item.title || "Web Options Report"}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <List size={14} /> {item.optionCount} Options
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <Link to={`/report/${item._id}`} className="btn btn-secondary" style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>
                      Open Report <ExternalLink size={14} />
                    </Link>
                    <button 
                      onClick={() => deleteList(item._id)} 
                      className="btn btn-danger" 
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} style={{ color: 'var(--accent-blue)' }} /> Profile Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Rank</span>
                <span style={{ fontWeight: '600' }}>{user?.rank || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Category</span>
                <span style={{ fontWeight: '600' }}>{user?.category || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gender</span>
                <span style={{ fontWeight: '600' }}>{user?.gender || 'N/A'}</span>
              </div>
              <Link to="/profile" className="btn btn-secondary" style={{ width: '100%', fontSize: '13px' }}>
                View Full Profile
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Quick Links</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/predictor" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '14px' }}>
                <Target size={16} style={{ marginRight: '10px' }} /> College Predictor
              </Link>
              <Link to="/web-options" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '14px' }}>
                <List size={16} style={{ marginRight: '10px' }} /> Web Options
              </Link>
              <Link to="/compare" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '14px' }}>
                <Search size={16} style={{ marginRight: '10px' }} /> Compare Colleges
              </Link>
              <Link to="/colleges" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '14px' }}>
                <Building2 size={16} style={{ marginRight: '10px' }} /> Explore Colleges
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;