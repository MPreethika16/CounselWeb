import { useEffect, useState } from "react";
import Preferences from "../components/Preferences";
import jsPDF from "jspdf";

const API_URL = "http://localhost:5000";

const districtOptions = [
  "HYD", "MDL", "RR", "KGM", "SRP", "WGL", "KHM",
  "MED", "SRD", "KMR", "NZB", "KRM", "JTL", "MHB",
  "SDP", "PDL", "SRC", "WNP", "MBN", "HNK", "NPT",
  "NLG", "YBG"
];

function WebOptions() {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [preferences, setPreferences] = useState([]);

  const [results, setResults] = useState([]);
  const [colleges, setColleges] = useState([]);

  const [preferTopColleges, setPreferTopColleges] = useState(true);
  const [preferredDistricts, setPreferredDistricts] = useState([]);
  const [maxFees, setMaxFees] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  const [optionLimit, setOptionLimit] = useState(50);
  const [customLimit, setCustomLimit] = useState("");

  const [dragIndex, setDragIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/colleges?limit=5000`)
      .then((res) => res.json())
      .then((data) => {
        setColleges(data.colleges || []);
      })
      .catch(() => alert("Failed to load colleges"));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
      setLoading(true);

      fetch(`${API_URL}/api/options/${id}`)
        .then((res) => res.json())
        .then((data) => {
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

  useEffect(() => {
    if (rank && category && gender && preferences.length > 0) {
      handleGenerate(page);
    }
  }, [page]);

  const finalOptionLimit = customLimit ? Number(customLimit) : Number(optionLimit);

  const toggleDistrict = (district) => {
    setPreferredDistricts((prev) =>
      prev.includes(district)
        ? prev.filter((d) => d !== district)
        : [...prev, district]
    );
  };

  const handleGenerate = async (currentPage = 1) => {
    if (!rank || !category || !gender) {
      alert("Fill Rank, Category, Gender");
      return;
    }

    if (preferences.length === 0) {
      alert("Select branch preferences");
      return;
    }

    if (!finalOptionLimit || finalOptionLimit <= 0) {
      alert("Enter valid number of options");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/api/web-options?page=${currentPage}&limit=${finalOptionLimit}`,
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
            preferredDistricts,
            maxFees: maxFees ? Number(maxFees) : "",
            riskFilter,
            optionLimit: finalOptionLimit
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to generate options");
        return;
      }

      setResults(data.options || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setPage(data.page || currentPage);
    } catch (err) {
      alert("Failed to generate options");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    setPage(1);
    handleGenerate(1);
  };

  const exportPDF = () => {
    if (!results.length) return;

    const pdf = new jsPDF();
    let y = 30;

    pdf.setFontSize(14);
    pdf.text("TS EAMCET Web Options", 10, 10);

    pdf.setFontSize(10);
    pdf.text(`Rank: ${rank}`, 10, 18);
    pdf.text(`Preferences: ${preferences.join(", ")}`, 10, 24);
    pdf.text(
      `Districts: ${preferredDistricts.length ? preferredDistricts.join(", ") : "All"}`,
      10,
      30
    );

    results.forEach((item) => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(
        `${item.priority}. ${item.collegeCode} - ${item.branchCode} - ${item.district} - ${item.riskLabel}`,
        10,
        y
      );
      y += 7;
    });

    pdf.save("web_options.pdf");
  };

  const exportCSV = () => {
    if (!results.length) return;

    const headers = [
      "Priority",
      "Code",
      "College",
      "Branch",
      "District",
      "Cutoff",
      "Fees",
      "Score",
      "Risk"
    ];

    const rows = results.map((r) => [
      r.priority,
      r.collegeCode,
      `"${r.name}"`,
      r.branchCode,
      r.district,
      r.cutoff,
      r.fees,
      r.score,
      r.riskLabel
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "web_options.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

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

  const saveOptions = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Login required");
      return;
    }

    if (!results.length) {
      alert("Generate options first");
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

  const shareOptions = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Login required");
      return;
    }

    if (!results.length) {
      alert("Generate options first");
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
        const link = `${window.location.origin}/web-options?id=${data.id}`;
        navigator.clipboard.writeText(link);
        alert("Share link copied!");
      } else {
        alert("Share failed");
      }
    } catch (err) {
      alert("Share failed");
    }
  };

  const safeOptions = results.filter((item) => item.riskLabel === "Safe");
  const moderateOptions = results.filter((item) => item.riskLabel === "Moderate");
  const dreamOptions = results.filter((item) => item.riskLabel === "Dream");

  const renderOptionCard = (item, index) => (
    <div
      key={item._id || index}
      draggable
      onDragStart={() => handleDragStart(index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => handleDrop(index)}
      style={{
        border: "1px solid gray",
        margin: "8px 0",
        padding: "12px",
        borderRadius: "8px",
        cursor: "grab"
      }}
    >
      <strong>
        #{item.priority} {item.name}
      </strong>

      <p>
        {item.branch} ({item.branchCode})
      </p>

      <p>
        District: {item.district} | Place: {item.place}
      </p>

      <p>
        Cutoff: {item.cutoff} | Fees: ₹{item.fees} | Score: {item.score}
      </p>

      <p
        style={{
          fontWeight: "bold",
          color:
            item.riskLabel === "Safe"
              ? "green"
              : item.riskLabel === "Moderate"
              ? "orange"
              : "red"
        }}
      >
        {item.riskLabel}
      </p>
    </div>
  );

  return (
    <div style={{ padding: "20px" }}>
      <h1>Web Options Generator</h1>

      <input
        type="number"
        placeholder="Rank"
        value={rank}
        onChange={(e) => setRank(e.target.value)}
      />

      <br />
      <br />

      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Category</option>
        {["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST"].map(
          (c) => (
            <option key={c} value={c}>
              {c}
            </option>
          )
        )}
      </select>

      <br />
      <br />

      <select value={gender} onChange={(e) => setGender(e.target.value)}>
        <option value="">Gender</option>
        <option value="BOYS">BOYS</option>
        <option value="GIRLS">GIRLS</option>
      </select>

      <br />
      <br />

      <Preferences colleges={colleges} setPreferences={setPreferences} />

      <br />
      <br />

      <h3>Preferred Districts</h3>
      <p>Select one or more districts. Leave empty for all districts.</p>

      <div>
        {districtOptions.map((district) => (
          <button
            key={district}
            onClick={() => toggleDistrict(district)}
            style={{
              margin: "5px",
              padding: "8px",
              border: preferredDistricts.includes(district)
                ? "2px solid blue"
                : "1px solid gray",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            {district}
          </button>
        ))}
      </div>

      <br />

      <label>
        <input
          type="checkbox"
          checked={preferTopColleges}
          onChange={(e) => setPreferTopColleges(e.target.checked)}
        />
        Prefer top colleges
      </label>

      <br />
      <br />

      <input
        type="number"
        placeholder="Max Fees"
        value={maxFees}
        onChange={(e) => setMaxFees(e.target.value)}
      />

      <br />
      <br />

      <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
        <option value="ALL">All Risk Types</option>
        <option value="Safe">Safe</option>
        <option value="Moderate">Moderate</option>
        <option value="Dream">Dream</option>
      </select>

      <br />
      <br />

      <h3>Number of Web Options</h3>

      <select
        value={optionLimit}
        onChange={(e) => {
          setOptionLimit(Number(e.target.value));
          setCustomLimit("");
        }}
      >
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value={150}>150</option>
        <option value={200}>200</option>
      </select>

      <br />
      <br />

      <input
        type="number"
        placeholder="Custom size"
        value={customLimit}
        onChange={(e) => setCustomLimit(e.target.value)}
      />

      <br />
      <br />

      <button onClick={handleGenerateClick} disabled={loading}>
        {loading ? "Generating..." : "Generate"}
      </button>
      <button onClick={exportPDF}>PDF</button>
      <button onClick={exportCSV}>CSV</button>
      <button onClick={saveOptions}>Save</button>
      <button onClick={shareOptions}>Share</button>

      <hr />

      {loading && <p>Loading...</p>}

      {!loading && results.length === 0 && <p>No results yet</p>}

      {!loading && results.length > 0 && (
        <>
          <p>Total Matching Options: {total}</p>
          <p>Showing: {results.length} options on this page</p>
          <p>Drag cards to manually reorder options.</p>

          <div style={{ margin: "20px 0" }}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>

            <span style={{ margin: "0 10px" }}>
              Page {page} of {pages}
            </span>

            <button
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>

          {safeOptions.length > 0 && (
            <>
              <h2>🟢 Safe Colleges</h2>
              {safeOptions.map(renderOptionCard)}
            </>
          )}

          {moderateOptions.length > 0 && (
            <>
              <h2>🟡 Moderate Colleges</h2>
              {moderateOptions.map(renderOptionCard)}
            </>
          )}

          {dreamOptions.length > 0 && (
            <>
              <h2>🔴 Dream Colleges</h2>
              {dreamOptions.map(renderOptionCard)}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default WebOptions;