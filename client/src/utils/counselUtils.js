import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const downloadJSON = (data, filename = "counselwise_recommendations.json") => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadCSV = (data, filename = "counselwise_recommendations.csv") => {
  if (!data || !data.length) return;
  const headers = ["Priority", "College Code", "College Name", "BranchCode", "Branch Name", "District", "Cutoff", "Fees", "Score", "Risk Status"];
  const rows = data.map((r, i) => [
    r.priority || i + 1,
    r.collegeCode || "",
    `"${(r.name || "").replace(/"/g, '""')}"`,
    r.branchCode || "",
    `"${(r.branch || "").replace(/"/g, '""')}"`,
    r.district || "",
    r.cutoff || "",
    r.fees || "",
    r.score || "",
    (r.riskLabel === "Backup" || r.riskLabel === "Safe") ? "Backup Colleges" : 
    (r.riskLabel === "BestMatch" || r.riskLabel === "Moderate") ? "Best Matching Colleges" : 
    "Competitive Colleges"
  ]);

  const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const shareToClipboard = async (results, rank, category, gender) => {
  if (!results || !results.length) return false;
  
  let summary = `🎓 *CounselWise Recommendations Summary* 🎓\n\n`;
  summary += `👤 *Student Profile*:\n`;
  summary += `  - Rank: ${rank || "N/A"}\n`;
  summary += `  - Category: ${category || "N/A"}\n`;
  summary += `  - Gender: ${gender || "N/A"}\n\n`;
  
  summary += `🏫 *Top Recommended Options*:\n`;
  results.slice(0, 10).forEach((r, i) => {
    const risk = (r.riskLabel === "Backup" || r.riskLabel === "Safe") ? "Backup" : 
                 (r.riskLabel === "BestMatch" || r.riskLabel === "Moderate") ? "Best Match" : 
                 "Competitive";
    summary += `${i + 1}. [${r.collegeCode}] ${r.name}\n`;
    summary += `   - Branch: ${r.branchCode} - ${r.branch}\n`;
    summary += `   - Cutoff: ${r.cutoff?.toLocaleString() || "N/A"} | Fees: ₹${r.fees?.toLocaleString() || "N/A"}\n`;
    summary += `   - Match Category: ${risk}\n\n`;
  });
  
  if (results.length > 10) {
    summary += `... and ${results.length - 10} more colleges found!\n\n`;
  }
  
  summary += `🔗 Generate your full options list on CounselWise today!`;

  try {
    await navigator.clipboard.writeText(summary);
    return true;
  } catch (err) {
    console.error("Clipboard copy failed", err);
    return false;
  }
};

export const generatePDF = (studentName, studentEmail, rank, category, gender, specialCategory, preferredDistricts, preferences, results) => {
  if (!results || !results.length) return;
  const pdf = new jsPDF("landscape", "mm", "a4");
  const now = new Date().toLocaleString();
  
  // Header
  pdf.setFontSize(22);
  pdf.setTextColor(37, 99, 235);
  pdf.text("CounselWise", 14, 20);
  pdf.setFontSize(14);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Web Options Report", 14, 28);
  
  pdf.setFontSize(9);
  pdf.text(`Generated on: ${now}`, 200, 20);
  
  // Student Info Box
  pdf.setDrawColor(226, 232, 240);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(14, 35, 269, 35, 3, 3, 'FD');
  
  pdf.setFontSize(11);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont("helvetica", "bold");
  pdf.text("Student Details", 18, 43);
  
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Name: ${studentName || "N/A"}`, 18, 52);
  pdf.text(`Email: ${studentEmail || "N/A"}`, 18, 58);
  pdf.text(`Rank: ${rank}`, 18, 64);
  
  pdf.text(`Category: ${category}`, 110, 52);
  pdf.text(`Gender: ${gender}`, 110, 58);
  pdf.text(`Special Category: ${specialCategory}`, 110, 64);
  
  pdf.text(`Districts: ${preferredDistricts && preferredDistricts.length ? preferredDistricts.join(", ") : "All"}`, 190, 52);
  pdf.text(`Preferences: ${preferences && preferences.length ? preferences.join(", ") : "All"}`, 190, 58);
  
  autoTable(pdf, {
    startY: 75,
    head: [["Priority", "Code", "College Name", "Branch", "District", "Cutoff", "Fees", "Score", "Risk"]],
    body: results.map((r, index) => [
      r.priority || index + 1, 
      r.collegeCode, 
      r.name, 
      `${r.branch} (${r.branchCode})`, 
      r.district, 
      r.cutoff, 
      r.fees, 
      r.score || "N/A",
      (r.riskLabel === "Backup" || r.riskLabel === "Safe") ? "Backup Colleges" : 
      (r.riskLabel === "BestMatch" || r.riskLabel === "Moderate") ? "Best Matching Colleges" : 
      "Competitive Colleges"
    ]),
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableWidth: "wrap",
    margin: { left: 8, right: 8 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 18 },
      2: { cellWidth: 70 },
      3: { cellWidth: 50 },
      4: { cellWidth: 18 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 },
      7: { cellWidth: 15 },
      8: { cellWidth: 20 }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 8) {
        const risk = data.cell.raw;
        if (risk === 'Backup Colleges') data.cell.styles.textColor = [22, 163, 74];
        else if (risk === 'Best Matching Colleges') data.cell.styles.textColor = [217, 119, 6];
        else data.cell.styles.textColor = [220, 38, 38];
      }
    }
  });
  
  pdf.save(`CounselWise_Options_${studentName || "Report"}.pdf`);
};
