import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import jsPDF from "jspdf";
import { FileText, Download, ArrowLeft, CheckCircle2, AlertTriangle, Info, MapPin, Wallet } from "lucide-react";
import { API_URL } from "../config/api";
import { getCookie } from "../utils/cookie";

function Report() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/options/${id}`)
      .then((res) => res.json())
      .then((data) => setReport(data))
      .catch(() => alert("Failed to load report"))
      .finally(() => setLoading(false));

    // Fetch user profile for export metadata
    const token = getCookie("token");
    if (token) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.error(err));
    }
  }, [id]);

  const exportPDF = () => {
    if (!report?.options?.length) return;
    const pdf = new jsPDF();
    const now = new Date().toLocaleString();
    
    // Header
    pdf.setFontSize(18);
    pdf.setTextColor(37, 99, 235);
    pdf.text("CounselWise Web Options Report", 10, 15);
    
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Report Title: ${report.title || "Untitled"}`, 10, 22);
    pdf.text(`Exported on: ${now}`, 10, 28);
    
    // Student Details
    pdf.setFontSize(11);
    pdf.setTextColor(30, 41, 59);
    if (user) {
      pdf.text(`Student Name: ${user.name}`, 10, 40);
      pdf.text(`Email: ${user.email}`, 10, 47);
      pdf.text(`Rank: ${user.rank || 'N/A'}`, 100, 40);
      pdf.text(`Category: ${user.category || 'N/A'}`, 100, 47);
    }
    
    pdf.setDrawColor(226, 232, 240);
    pdf.line(10, 55, 200, 55);
    
    let y = 65;
    pdf.setFontSize(10);
    pdf.text("Priority", 10, y);
    pdf.text("College Code", 30, y);
    pdf.text("Branch Code", 70, y);
    pdf.text("District", 110, y);
    pdf.text("Risk Level", 150, y);
    
    y += 10;
    pdf.setTextColor(51, 65, 85);
    
    report.options.forEach((item) => {
      if (y > 280) { pdf.addPage(); y = 20; }
      pdf.text(`${item.priority}`, 10, y);
      pdf.text(`${item.collegeCode}`, 30, y);
      pdf.text(`${item.branchCode}`, 70, y);
      pdf.text(`${item.district}`, 110, y);
      pdf.text(`${item.riskLabel}`, 150, y);
      y += 8;
    });
    
    pdf.save(`CounselWise_Report_${id}.pdf`);
  };


  if (loading) return (
    <div className="page-wrapper container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid var(--border-color)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!report) return (
    <div className="page-wrapper container" style={{ textAlign: 'center' }}>
      <h2>Report not found</h2>
      <p style={{ color: 'var(--text-muted)' }}>The requested report does not exist or has been deleted.</p>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Dashboard</Link>
    </div>
  );

  return (
    <div className="page-wrapper container" style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "14px", marginBottom: "16px", textDecoration: "none" }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 style={{ fontSize: "32px", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "12px" }}>
            <FileText size={32} style={{ color: "var(--accent-purple)" }} /> 
            {report.title || "Web Options Report"}
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            Generated on {new Date(report.createdAt).toLocaleDateString()} &bull; {report.options?.length || 0} Options
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-primary" onClick={exportPDF}>
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {report.options?.map((item) => {
          const riskStatus = item.riskLabel === "Safe" ? "safe" : item.riskLabel === "Moderate" ? "moderate" : "dream";
          return (
            <div
              key={`${item.collegeCode}-${item.branchCode}-${item.priority}`}
              className="glass-card"
              style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "20px", position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: `var(--${riskStatus}-text)` }} />
              
              <div style={{ 
                background: "var(--bg-secondary)", borderRadius: "12px", width: "48px", height: "48px",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700",
                fontSize: "18px", color: "var(--text-primary)", flexShrink: 0
              }}>
                {item.priority}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                  {item.name} <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: "500" }}>({item.collegeCode})</span>
                </h3>
                
                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={14} /> {item.district} ({item.place})
                  </span>
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                    {item.branch} ({item.branchCode})
                  </span>
                  <span>
                    Cutoff: <strong style={{ color: "var(--text-primary)" }}>{item.cutoff}</strong>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Wallet size={14} /> ₹{item.fees?.toLocaleString() || "N/A"}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                <div className={`badge badge-${riskStatus}`} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {riskStatus === "safe" && <CheckCircle2 size={14} />}
                  {riskStatus === "moderate" && <Info size={14} />}
                  {riskStatus === "dream" && <AlertTriangle size={14} />}
                  {item.riskLabel}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
                  Match: {item.score}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Report;