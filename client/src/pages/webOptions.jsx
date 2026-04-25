import { useState, useEffect } from "react";
import Preferences from "../components/Preferences";

import jsPDF from "jspdf";

const API_URL = "http://localhost:5000";

function WebOptions() {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");

  const [preferences, setPreferences] = useState([]);
  const [results, setResults] = useState([]);

  const [preferTopColleges, setPreferTopColleges] = useState(true);
  const [preferredLocation, setPreferredLocation] = useState("");
  const [maxFees, setMaxFees] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  const [dragIndex, setDragIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const districts = [...new Set(colleges.map(c => c.district))];

  const [colleges, setColleges] = useState([]);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

    useEffect(() => {
      if (rank && category && gender && preferences.length) {
        handleGenerate();
      }
    }, [page]);

  useEffect(() => {
    fetch("http://localhost:5000/api/colleges")
      .then(res => res.json())
      .then(data => setColleges(data))
      .catch(() => alert("Failed to load colleges"));
  }, []);

  // LOAD FROM SHARE LINK
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
      setLoading(true);

      fetch(`${API_URL}/api/options/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data?.options) {
            setResults(data.options);
          } else {
            alert("Invalid share link");
          }
        })
        .catch(() => alert("Failed to load shared options"))
        .finally(() => setLoading(false));
    }
  }, []);

  // GENERATE
  const handleGenerate = () => {
    if (!rank || !category || !gender) {
      alert("Fill Rank, Category, Gender");
      return;
    }

    if (preferences.length === 0) {
      alert("Select preferences");
      return;
    }

    const handleGenerate = async () => {
  if (!rank || !category || !gender) {
    alert("Fill Rank, Category, Gender");
    return;
  }

  if (preferences.length === 0) {
    alert("Select preferences");
    return;
  }

  try {
   const res = await fetch(
  `http://localhost:5000/api/web-options?page=${page}&limit=20`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rank: Number(rank),
      category,
      gender,
      preferences,
      preferTopColleges,
      preferredLocation,
      maxFees: Number(maxFees),
      riskFilter
    })
  }
);

const data = await res.json();

setResults(data.options);
setPages(data.pages);
  

  } catch (err) {
    alert("Failed to generate options");
  }
};

    setResults(options);
  };

  // PDF EXPORT (cleaner)
  const exportPDF = () => {
    if (!results.length) return;

    const pdf = new jsPDF();
    let y = 20;

    pdf.setFontSize(14);
    pdf.text("TS EAMCET Web Options", 10, 10);

    pdf.setFontSize(10);
    pdf.text(`Rank: ${rank}`, 10, 16);
    pdf.text(`Preferences: ${preferences.join(", ")}`, 10, 22);

    results.forEach((item) => {
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

    pdf.save("web_options.pdf");
  };

  // CSV EXPORT
  const exportCSV = () => {
    if (!results.length) return;

    const headers = [
      "Priority", "Code", "College", "Branch", "District", "Cutoff", "Risk"
    ];

    const rows = results.map(r => [
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
    a.download = "web_options.csv";
    a.click();
  };

  // DRAG
  const handleDragStart = (index) => setDragIndex(index);

  const handleDrop = (index) => {
    if (dragIndex === null) return;

    const updated = [...results];
    const dragged = updated[dragIndex];

    updated.splice(dragIndex, 1);
    updated.splice(index, 0, dragged);

    const newList = updated.map((item, i) => ({
      ...item,
      priority: i + 1
    }));

    setResults(newList);
    setDragIndex(null);
  };

  // SAVE (AUTH)
  const saveOptions = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Login required");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/options/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ options: results })
      });

      const data = await res.json();

      if (data.id) {
        alert("Saved successfully!");
      } else {
        alert("Save failed");
      }
    } catch (err) {
      alert("Server error");
    }
  };

  // SHARE (FIXED)
  const shareOptions = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Login required");
      return;
    }

    const res = await fetch(`${API_URL}/api/options/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ options: results })
    });

    const data = await res.json();

    if (data.id) {
      const link = `${window.location.origin}/web-options?id=${data.id}`;
      navigator.clipboard.writeText(link);
      alert("Share link copied!");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Web Options Generator</h1>

      <input
        type="number"
        placeholder="Rank"
        value={rank}
        onChange={(e) => setRank(e.target.value)}
      />

      <br /><br />

      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Category</option>
        {["OC","BC_A","BC_B","SC","ST"].map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <br /><br />

      <select value={gender} onChange={(e) => setGender(e.target.value)}>
        <option value="">Gender</option>
        <option value="BOYS">BOYS</option>
        <option value="GIRLS">GIRLS</option>
      </select>

      <br /><br />

      <Preferences setPreferences={setPreferences} />

      <br /><br />

      <button onClick={handleGenerate}>Generate</button>
      <button onClick={exportPDF}>PDF</button>
      <button onClick={exportCSV}>CSV</button>
      <button onClick={saveOptions}>Save</button>
      <button onClick={shareOptions}>Share</button>

      <hr />

      {loading && <p>Loading shared data...</p>}

      {!loading && results.length === 0 && <p>No results yet</p>}

      {results.map((item, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)}
          style={{
            border: "1px solid gray",
            margin: "8px",
            padding: "10px",
            cursor: "grab"
          }}
        >

          <div style={{ marginTop: "20px" }}>
  <button
    disabled={page === 1}
    onClick={() => setPage(prev => prev - 1)}
  >
    Prev
  </button>

  <span style={{ margin: "0 10px" }}>
    Page {page} of {pages}
  </span>

  <button
    disabled={page === pages}
    onClick={() => setPage(prev => prev + 1)}
  >
    Next
  </button>
</div>
          <strong>
            #{item.priority} {item.name}
          </strong>

          <p>{item.branchCode}</p>
          <p>{item.district}</p>

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

export default WebOptions;