import { useEffect, useState } from "react";
import { Users, GraduationCap, Building2, ShieldCheck, FileText, Search, Trash2, Edit, Activity, Database } from "lucide-react";
import { API_URL } from "../config/api";
import { getCookie } from "../utils/cookie";

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");

  const token = getCookie("token");
  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadStats = async () => {
    const res = await fetch(`${API_URL}/api/admin/stats`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) setStats(data);
    else alert(data.error || "Failed to load stats");
  };

  const loadUsers = async () => {
    const res = await fetch(`${API_URL}/api/admin/users`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) setUsers(data);
    else alert(data.error || "Failed to load users");
  };

  const loadColleges = async () => {
    const res = await fetch(`${API_URL}/api/admin/colleges?search=${search}&limit=20`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) setColleges(data.colleges || []);
    else alert(data.error || "Failed to load colleges");
  };

  const loadAll = async () => {
    if (!token) {
      alert("Admin login required");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      await loadStats();
      await loadUsers();
      await loadColleges();
    } catch {
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    loadAll();
  }, []);

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    const res = await fetch(`${API_URL}/api/admin/users/${userId}`, { method: "DELETE", headers: authHeaders });
    const data = await res.json();
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } else {
      alert(data.error || "Delete failed");
    }
  };

  const updateCollegeFees = async (collegeCode) => {
    const newFees = prompt("Enter new fees (₹):");
    if (!newFees) return;
    const res = await fetch(`${API_URL}/api/admin/colleges/${collegeCode}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ fees: Number(newFees) })
    });
    const data = await res.json();
    if (res.ok) {
      loadColleges();
    } else {
      alert(data.error || "Update failed");
    }
  };

  if (loading) return (
    <div className="page-wrapper container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid var(--border-color)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div className="page-wrapper container" style={{ maxWidth: "1200px" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{ padding: '12px', background: 'var(--accent-glow)', borderRadius: '12px', color: 'var(--accent-purple)' }}>
          <Activity size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: '32px', margin: 0 }}>System Administration</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Overview, user management, and college database controls.</p>
        </div>
      </div>

      {stats && (
        <div className="grid-4" style={{ marginBottom: "40px" }}>
          <StatCard icon={<Users size={24} style={{ color: "var(--accent-blue)" }} />} title="Total Users" value={stats.totalUsers} />
          <StatCard icon={<GraduationCap size={24} style={{ color: "var(--safe-text)" }} />} title="Students" value={stats.totalStudents} />
          <StatCard icon={<Building2 size={24} style={{ color: "var(--moderate-text)" }} />} title="Institutions" value={stats.totalInstitutions} />
          <StatCard icon={<ShieldCheck size={24} style={{ color: "var(--accent-purple)" }} />} title="Admins" value={stats.totalAdmins} />
          <StatCard icon={<Building2 size={24} style={{ color: "var(--text-secondary)" }} />} title="Unique Colleges" value={stats.totalUniqueColleges} />
          <StatCard icon={<Database size={24} style={{ color: "var(--text-secondary)" }} />} title="College Rows" value={stats.totalCollegeRows} />
          <StatCard icon={<FileText size={24} style={{ color: "var(--text-secondary)" }} />} title="Saved Reports" value={stats.totalSavedOptions} />
        </div>
      )}

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
        <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('users')} style={{ padding: "8px 24px", borderRadius: "20px" }}>
          Users Management
        </button>
        <button className={`btn ${activeTab === 'colleges' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('colleges')} style={{ padding: "8px 24px", borderRadius: "20px" }}>
          College Database
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="grid-3">
          {users.map((user) => (
            <div key={user._id} className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "18px", margin: "0 0 4px" }}>{user.name}</h3>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{user.email}</div>
                </div>
                <div className="badge badge-outline">{user.role}</div>
              </div>

              {user.collegeId && (
                <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", fontSize: "13px" }}>
                  <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Managed College:</div>
                  <div style={{ fontWeight: "600" }}>{user.collegeId.name} ({user.collegeId.collegeCode})</div>
                </div>
              )}

              <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => deleteUser(user._id)} className="btn btn-danger" style={{ padding: "6px 12px", fontSize: "12px" }}>
                  <Trash2 size={14} style={{ marginRight: "6px" }} /> Remove User
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No users found.</div>}
        </div>
      )}

      {activeTab === 'colleges' && (
        <div>
          <div className="glass-card" style={{ display: "flex", gap: "12px", padding: "16px", marginBottom: "24px", alignItems: "center" }}>
            <Search size={20} style={{ color: "var(--text-muted)" }} />
            <input
              placeholder="Search by college name, code, or district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadColleges()}
              style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-primary)", outline: "none", fontSize: "16px" }}
            />
            <button className="btn btn-primary" onClick={loadColleges} style={{ padding: "8px 24px" }}>Search</button>
          </div>

          <div className="grid-2">
            {colleges.map((college) => (
              <div key={college.collegeCode} className="glass-card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ display: "inline-block", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", marginBottom: "8px", border: "1px solid var(--border-color)" }}>
                      {college.collegeCode}
                    </div>
                    <h3 style={{ fontSize: "18px", margin: "0 0 4px" }}>{college.name}</h3>
                    <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{college.place}, {college.district}</div>
                  </div>
                  <button onClick={() => updateCollegeFees(college.collegeCode)} className="btn btn-secondary" style={{ padding: "6px", borderRadius: "50%" }} title="Edit Fees">
                    <Edit size={16} />
                  </button>
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "13px" }}>
                  <div style={{ padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", flex: 1 }}>
                    <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Annual Fees</div>
                    <div style={{ fontWeight: "600", fontSize: "15px" }}>₹{college.fees?.toLocaleString() || "N/A"}</div>
                  </div>
                  <div style={{ padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", flex: 1 }}>
                    <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Avg Package</div>
                    <div style={{ fontWeight: "600", fontSize: "15px" }}>{college.placements?.avgPackage ? `${college.placements.avgPackage} LPA` : "N/A"}</div>
                  </div>
                </div>
              </div>
            ))}
            {colleges.length === 0 && <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No colleges match your search.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div className="glass-card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
      <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "12px" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "28px", fontWeight: "700", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>{title}</div>
      </div>
    </div>
  );
}

export default AdminDashboard;