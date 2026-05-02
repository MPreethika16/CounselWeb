import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";

function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // 🔐 CHECK AUTH + FETCH
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    const fetchReports = async () => {
      try {
        const res = await fetch(`${API_URL}/api/options/my`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (Array.isArray(data)) {
          setReports(data);
        } else {
          alert("Failed to load reports");
        }
      } catch (err) {
        console.error(err);
        alert("Server error");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [navigate]);

  // 🗑 DELETE
  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");

    const confirmDelete = window.confirm("Are you sure?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_URL}/api/options/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setReports(prev => prev.filter(r => r._id !== id));
      } else {
        alert("Delete failed");
      }
    } catch (err) {
      alert("Server error");
    }
  };

  // 📄 OPEN REPORT
  const openReport = (id) => {
    navigate(`/report/${id}`);
  };

  // 🚪 LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // 📅 FORMAT DATE
  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  // ⏳ LOADING STATE
  if (loading) {
    return <p style={{ padding: "20px" }}>Loading dashboard...</p>;
  }

  return (
    <div style={{ padding: "20px" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>📊 My Reports</h1>

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>

      <hr />

      {/* EMPTY STATE */}
      {reports.length === 0 && (
        <p>No reports yet. Go generate some options.</p>
      )}

      {/* REPORT LIST */}
      {reports.map((report, index) => (
        <div
          key={report._id}
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            margin: "10px 0",
            borderRadius: "10px",
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
          }}
        >
          <h3>Report #{index + 1}</h3>

          <p><strong>Date:</strong> {formatDate(report.createdAt)}</p>
          <p><strong>Total Options:</strong> {report.options?.length}</p>

          <button onClick={() => openReport(report._id)}>
            View
          </button>

          <button
            onClick={() => handleDelete(report._id)}
            style={{ marginLeft: "10px", color: "red" }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;