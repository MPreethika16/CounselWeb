import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Calendar, 
  Trash2, 
  ExternalLink, 
  Activity, 
  Target, 
  List, 
  Search, 
  Building2, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  Bell,
  Download
} from "lucide-react";
import { API_URL } from "../config/api";
import logger from "../utils/logger";
import { getCookie } from "../utils/cookie";

function Dashboard() {
  const [lists, setLists] = useState([]);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        logger.error("Failed to parse saved user in Dashboard:", err);
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [phaseData, setPhaseData] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/current-phase`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load current phase");
        return res.json();
      })
      .then((data) => setPhaseData(data))
      .catch((err) => logger.error("Failed to fetch current phase:", err));
  }, []);

  const calculateTimeRemaining = (deadline) => {
    if (!deadline) return "Loading...";
    const total = Date.parse(deadline) - Date.parse(new Date());
    if (isNaN(total) || total <= 0) {
      return "Deadline passed";
    }
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return `${days} Days, ${hours} Hours`;
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return "Loading...";
    try {
      return new Date(deadline).toLocaleString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return deadline;
    }
  };

  const fetchData = async (token) => {
    try {
      const optionsRes = await fetch(`${API_URL}/api/saved-options`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (optionsRes.ok) {
        const optionsData = await optionsRes.json();
        setLists(optionsData);
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteList = async (id) => {
    if (!window.confirm("Are you sure you want to delete this saved report?")) return;

    try {
      const token = getCookie("token");
      const res = await fetch(`${API_URL}/api/saved-options/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        setLists((prev) => prev.filter((item) => item._id !== id));
      } else {
        logger.error("Delete failed");
        alert("Failed to delete the report. Please try again.");
      }
    } catch {
      logger.error("Server error");
      alert("A server error occurred while deleting. Please check your connection.");
    }
  };

  useEffect(() => {
    const token = getCookie("token");
    if (token) {
      fetchData(token);
    } else {
      setLoading(false);
    }
  }, []);

  if (!getCookie("token")) {
    return (
      <div className="page-wrapper container" style={{ textAlign: "center", paddingTop: "100px" }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: "16px", color: 'var(--primary)' }}>Access Restricted</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: '14px' }}>Please login with your official student credentials to view your counselling portal dashboard.</p>
        <Link to="/login" className="btn btn-primary">Sign In to Portal</Link>
      </div>
    );
  }

  if (loading) return (
    <div className="page-wrapper container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div className="skeleton" style={{ width: '52px', height: '52px', borderRadius: '8px' }}></div>
        <div>
          <div className="skeleton" style={{ width: '240px', height: '32px', marginBottom: '8px' }}></div>
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
      {/* Official Header */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', borderLeft: '4px solid var(--primary)', borderRadius: 'var(--radius-md)' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
          Government of Telangana • Admissions & Counselling
        </span>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 16px 0', letterSpacing: '-0.02em', color: 'var(--primary)' }}>
          TS EAPCET Counselling Portal
        </h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Student Name</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{user?.name || 'Student'}</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Hall Ticket Rank</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>{user?.rank ? user.rank.toLocaleString() : 'N/A'}</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Category / Gender</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{user?.category || 'General'} / {user?.gender || 'N/A'}</span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Counselling Status</span>
            <span className="status-badge status-badge-progress" style={{ marginTop: '2px' }}>
              <Clock size={10} /> Web Options Open
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Left Column: Primary Actions & Stepper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Primary Action Card */}
          <div className="glass-card" style={{ padding: '24px', background: 'rgba(30, 58, 138, 0.02)', border: '1.5px solid var(--primary)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Phase</span>
                <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '2px 0 0 0', color: 'var(--primary)' }}>{phaseData?.name || "Loading..."}</h2>
              </div>
              <span className="status-badge status-badge-progress">Active Stage</span>
            </div>

            <div className="warning-alert" style={{ marginBottom: '20px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontWeight: '700' }}>Important Deadline:</strong> Web options must be locked before {formatDeadline(phaseData?.deadline)}. Failing to freeze options will cause automatic submission of saved options.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Time remaining for locking options</span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--danger)', marginTop: '2px' }}>{calculateTimeRemaining(phaseData?.deadline)}</div>
              </div>
              
              <Link to="/web-options" className="btn btn-primary" style={{ gap: '8px' }}>
                Continue Counselling <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Process Tracker */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--primary)' }}>Counselling Step Tracker</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div style={{ borderLeft: '3px solid var(--success)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Step 1</span>
                <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', margin: '2px 0' }}>Registration</span>
                <span className="status-badge status-badge-completed" style={{ fontSize: '9px', padding: '1px 6px' }}>Completed</span>
              </div>
              <div style={{ borderLeft: '3px solid var(--success)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Step 2</span>
                <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', margin: '2px 0' }}>Fee Payment</span>
                <span className="status-badge status-badge-completed" style={{ fontSize: '9px', padding: '1px 6px' }}>Completed</span>
              </div>
              <div style={{ borderLeft: '3px solid var(--success)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Step 3</span>
                <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', margin: '2px 0' }}>Verification</span>
                <span className="status-badge status-badge-completed" style={{ fontSize: '9px', padding: '1px 6px' }}>Completed</span>
              </div>
              <div style={{ borderLeft: '3px solid var(--secondary)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Step 4</span>
                <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', margin: '2px 0' }}>Web Options</span>
                <span className="status-badge status-badge-progress" style={{ fontSize: '9px', padding: '1px 6px' }}>In Progress</span>
              </div>
              <div style={{ borderLeft: '3px solid var(--border-color)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Step 5</span>
                <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', margin: '2px 0' }}>Seat Allotment</span>
                <span className="status-badge status-badge-pending" style={{ fontSize: '9px', padding: '1px 6px' }}>Pending</span>
              </div>
              <div style={{ borderLeft: '3px solid var(--border-color)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Step 6</span>
                <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', margin: '2px 0' }}>Reporting</span>
                <span className="status-badge status-badge-pending" style={{ fontSize: '9px', padding: '1px 6px' }}>Pending</span>
              </div>
            </div>
          </div>

          {/* Saved Reports / Web Options Selection Lists */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> Saved Web Options Configs ({lists.length})
            </h3>

            {lists.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Activity size={40} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No Saved Sequences Yet</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px', maxWidth: '380px' }}>
                  Generate and evaluate customized option priorities using the Web Options tool, then save them here.
                </p>
                <Link to="/web-options" className="btn btn-secondary" style={{ fontSize: '13px' }}>
                  Generate Web Options
                </Link>
              </div>
            ) : (
              <div className="grid-2" style={{ gap: '16px' }}>
                {lists.map((item) => (
                  <div key={item._id} className="glass-card" style={{ padding: "20px", display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)' }}>
                    <div style={{ marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                        {item.title || "Web Options Config"}
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <List size={12} /> {item.optionCount} colleges
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <Link to={`/report/${item._id}`} className="btn btn-secondary" style={{ flex: 1, padding: '6px 12px', fontSize: '12px', gap: '4px' }}>
                        View Priority <ExternalLink size={12} />
                      </Link>
                      <button 
                        onClick={() => deleteList(item._id)} 
                        className="btn btn-danger" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        aria-label="Delete saved sequence"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Schedule Timeline & Sidebar Utilities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Actions Grid */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: '16px' }}>
              Portal Utilities
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/predictor" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '13px', width: '100%', gap: '10px', border: '1px solid var(--border-color)' }}>
                <Target size={14} style={{ color: 'var(--secondary)' }} />
                <span>College Predictor</span>
              </Link>
              <Link to="/web-options" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '13px', width: '100%', gap: '10px', border: '1px solid var(--border-color)' }}>
                <List size={14} style={{ color: 'var(--secondary)' }} />
                <span>Web Options Generator</span>
              </Link>
              <Link to="/compare" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '13px', width: '100%', gap: '10px', border: '1px solid var(--border-color)' }}>
                <Search size={14} style={{ color: 'var(--secondary)' }} />
                <span>Compare Colleges</span>
              </Link>
              <Link to="/colleges" className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '13px', width: '100%', gap: '10px', border: '1px solid var(--border-color)' }}>
                <Building2 size={14} style={{ color: 'var(--secondary)' }} />
                <span>Explore Affiliated Colleges</span>
              </Link>
            </div>
          </div>

          {/* Counselling Timeline / Schedule */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={14} style={{ color: 'var(--primary)' }} /> Official Timeline
            </h3>

            <div className="timeline-list">
              <div className="timeline-item completed">
                <div className="timeline-marker"></div>
                <span className="timeline-date">June 4 - June 9, 2026</span>
                <div className="timeline-title">Certificate Verification</div>
                <div className="timeline-desc">Mandatory physical and online document verifications completed successfully.</div>
              </div>
              <div className="timeline-item active">
                <div className="timeline-marker"></div>
                <span className="timeline-date">June 10 - June 15, 2026</span>
                <div className="timeline-title">Web Options Selection</div>
                <div className="timeline-desc">Student options entry, sequence generation, and locking portal active.</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <span className="timeline-date">June 18, 2026</span>
                <div className="timeline-title">Phase I Seat Allotment</div>
                <div className="timeline-desc">First round allocation lists will be published on the official TS portal.</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <span className="timeline-date">June 19 - June 24, 2026</span>
                <div className="timeline-title">Self-Reporting & College Joining</div>
                <div className="timeline-desc">Reporting at allotted colleges and payment of admission fee details.</div>
              </div>
            </div>
          </div>

          {/* Download Official Rank Card and External Resource Links */}
          <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--secondary)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} /> Official Rank Card
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
              Your TS EAPCET 2026 official rank card is available. Keep a downloaded PDF handy for verification.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/tg-eapcet-rank-card-2026" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', width: '100%', justifyContent: 'center' }}>
                Download Rank Card
              </Link>
              <a 
                href="https://eapcet.tgche.ac.in" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '12px', width: '100%', justifyContent: 'center', gap: '4px' }}
              >
                Official TS Portal <ExternalLink size={10} />
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;