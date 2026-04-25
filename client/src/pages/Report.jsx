import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";

const API_URL = "http://localhost:5000";

function Report() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // FETCH REPORT
  useEffect(() => {
    fetch(`${API_URL}/api/options/${id}`)
      .then(res => res.json())
      .then(resData => {
        if (resData?.options) {
          setData(resData);
        } else {
          alert("Invalid report");
        }
      })
      .catch(() => alert("Error loading report"))
      .finally(() => setLoading(false));
  }, [id]);

  // PDF EXPORT
  const exportPDF = () => {
    if (!data?.options?.length) return;

    const pdf = new jsPDF();
    let y = 20;

    pdf.setFontSize(14);
    pdf.text("TS EAMCET Web Options Report", 10, 10);

    pdf.setFontSize(10);

    data.options.forEach((item) => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(
        `${item.priority}. ${item.collegeCode} - ${item.branchCode} (${item.district})`,
        10,
        y
      );
      y += 7;
    });

    pdf.save("report.pdf");
  };

  // CSV EXPORT
  const exportCSV = () => {
    if (!data?.options?.length) return;

    const headers = [
      "Priority", "Code", "College", "Branch", "District", "Cutoff", "Risk"
    ];

    const rows = data.options.map(r => [
      r.priority,
      r.collegeCode,
      r.name,
      r.branchCode,
      r.district,
      r.cutoff,
      r.riskLabel
    ]);

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
  };

  // UI STATES

  if (loading) return <p>Loading report...</p>;

  if (!data) return <p>No data found</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>📄 Saved Web Options Report</h1>

      <button onClick={exportPDF}>Download PDF</button>
      <button onClick={exportCSV} style={{ marginLeft: "10px" }}>
        Download CSV
      </button>

      <hr />

      {data.options.map((item, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #ddd",
            padding: "10px",
            margin: "8px",
            borderRadius: "8px"
          }}
        >
          <strong>
            #{item.priority} {item.name}
          </strong>

          <p>Branch: {item.branchCode}</p>
          <p>District: {item.district}</p>
          <p>Cutoff: {item.cutoff}</p>

          <p style={{
            color:
              item.riskLabel === "Safe" ? "green" :
              item.riskLabel === "Moderate" ? "orange" : "red"
          }}>
            {item.riskLabel}
          </p>
        </div>
      ))}
    </div>
  );
}

export default Report;