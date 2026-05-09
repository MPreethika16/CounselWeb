import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000";

const districtOptions = [
  "HYD",
  "MDL",
  "RR",
  "KGM",
  "SRP",
  "WGL",
  "KHM",
  "MED",
  "SRD",
  "KMR",
  "NZB",
  "KRM",
  "JTL",
  "MHB",
  "SDP",
  "PDL",
  "SRC",
  "WNP",
  "MBN",
  "HNK",
  "NPT",
  "NLG",
  "YBG",
];

const getBranchType = (branch = "") => {
  const b = branch.toUpperCase();

  // COMPUTING
  if (
    b.includes("COMPUTER") ||
    b.includes("CSE") ||
    b.includes("ARTIFICIAL INTELLIGENCE") ||
    b.includes("MACHINE LEARNING") ||
    b.includes("DATA SCIENCE") ||
    b.includes("CYBER SECURITY") ||
    b.includes("INFORMATION TECHNOLOGY") ||
    b.includes("IOT") ||
    b.includes("NETWORKS") ||
    b.includes("SOFTWARE ENGINEERING") ||
    b.includes("BUSINESS SYSTEM")
  ) {
    return "computing";
  }

  // ELECTRICAL
  if (
    b.includes("ELECTRONICS") ||
    b.includes("COMMUNICATION") ||
    b.includes("ELECTRICAL") ||
    b.includes("INSTRUMENTATION") ||
    b.includes("VLSI") ||
    b.includes("TELEMATICS")
  ) {
    return "electrical";
  }

  // CORE
  if (
      b.includes("CIVIL") ||
  b.includes("MECHANICAL") ||
  b.includes("CHEMICAL") ||
  b.includes("MINING") ||
  b.includes("METALLURGICAL") ||
  b.includes("METALLURGY") ||
  b.includes("AUTOMOBILE") ||
  b.includes("AERONAUTICAL") ||
  b.includes("TEXTILE") ||
  b.includes("PRODUCTION") ||
  b.includes("MANUFACTURING") ||
  b.includes("GEO INFORMATICS") ||
  b.includes("BUILDING SERVICES")
  ) {
    return "core";
  }

  // AGRICULTURE
  if (
    b.includes("AGRICULTURAL") ||
    b.includes("FOOD TECHNOLOGY") ||
    b.includes("DAIRY")
  ) {
    return "agriculture";
  }

  // MEDICAL
  if (b.includes("BIO") || b.includes("BIOMEDICAL") || b.includes("PHARM")) {
    return "medical";
  }

  return "other";
};

function Predictor() {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [district, setDistrict] = useState("");

  const [branchType, setBranchType] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [maxFees, setMaxFees] = useState("");

  const [branches, setBranches] = useState([]);
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/colleges/branches`)
      .then((res) => res.json())
      .then((data) => {
        setBranches(data.branches || []);
      })
      .catch(() => alert("Failed to load branches"));
  }, []);

  const branchGroups = useMemo(() => {
    const groups = {
      computing: new Map(),
      electrical: new Map(),
      core: new Map(),
      agriculture: new Map(),
      medical: new Map(),
    };

    branches.forEach((item) => {
      if (!item.branch) return;

      const type = getBranchType(item.branch);

      if (!groups[type]) return;

      const code = item.branchCode || "";
      const label = code ? `${code} - ${item.branch}` : item.branch;

      groups[type].set(label, {
        code,
        branch: item.branch,
        label,
      });
    });

    return {
      computing: [...groups.computing.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
      electrical: [...groups.electrical.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
      core: [...groups.core.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
      agriculture: [...groups.agriculture.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
      medical: [...groups.medical.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    };
  }, [branches]);

  const handlePredict = async () => {
    if (!rank || !category || !gender) {
      alert("Please fill Rank, Category and Gender");
      return;
    }

    if (!selectedBranch) {
      alert("Please select a branch first");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rank: Number(rank),
          category,
          gender,
          district,
          branch: selectedBranch,
          maxFees: maxFees ? Number(maxFees) : "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Prediction failed");
        return;
      }

      setResult(data.recommendations || []);
    } catch {
      alert("Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setRank("");
    setCategory("");
    setGender("");
    setDistrict("");
    setBranchType("");
    setSelectedBranch("");
    setMaxFees("");
    setResult([]);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>College Predictor</h1>

      <input
        type="number"
        placeholder="Enter Rank"
        value={rank}
        onChange={(e) => setRank(e.target.value)}
      />

      <br />
      <br />

      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Select Category</option>
        {["OC", "BC_A", "BC_B", "BC_C", "BC_D", "BC_E", "SC", "ST"].map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <br />
      <br />

      <select value={gender} onChange={(e) => setGender(e.target.value)}>
        <option value="">Select Gender</option>
        <option value="BOYS">BOYS</option>
        <option value="GIRLS">GIRLS</option>
      </select>

      <br />
      <br />

      <select value={district} onChange={(e) => setDistrict(e.target.value)}>
        <option value="">All Districts</option>
        {districtOptions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <br />
      <br />

      <h3>Filters</h3>

      <select
        value={branchType}
        onChange={(e) => {
          setBranchType(e.target.value);
          setSelectedBranch("");
          setResult([]);
        }}
      >
        <option value="">Select Branch Type</option>
        <option value="computing">Computing</option>
        <option value="electrical">Electrical</option>
        <option value="core">Core</option>
        <option value="agriculture">Agriculture</option>
        <option value="medical">Medical</option>
      </select>

      <br />
      <br />

      {branchType && (
        <div>
          <p>
            <strong>Select Branch:</strong>{" "}
            {selectedBranch || "No branch selected"}
          </p>

          {branchGroups[branchType]?.length === 0 && (
            <p style={{ color: "red" }}>No branches found for this type.</p>
          )}

          {branchGroups[branchType]?.map((item) => (
            <button
              key={item.label}
              onClick={() => setSelectedBranch(item.branch)}
              style={{
                margin: "5px",
                padding: "8px",
                border:
                  selectedBranch === item.branch
                    ? "2px solid blue"
                    : "1px solid gray",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <br />

      <input
        type="number"
        placeholder="Max Fees"
        value={maxFees}
        onChange={(e) => setMaxFees(e.target.value)}
      />

      <br />
      <br />

      <button onClick={handlePredict} disabled={loading}>
        {loading ? "Predicting..." : "Predict"}
      </button>

      <button onClick={resetFilters} style={{ marginLeft: "10px" }}>
        Reset Filters
      </button>

      <div>
        <h2>Top 3 Strong Safe Colleges</h2>

        {result.length === 0 && <p>No predictions yet.</p>}

        {result.map((college) => (
          <div key={college._id} style={cardStyle}>
            <h3>
              {college.name} ({college.collegeCode})
            </h3>

            <p style={{ color: "green", fontWeight: "bold" }}>
              Match Score: {college.score}
            </p>

            <p>
              <strong>Branch:</strong> {college.branch} ({college.branchCode})
            </p>

            <p>
              <strong>Location:</strong> {college.place}, {college.district}
            </p>

            <p>
              <strong>Cutoff:</strong> {college.cutoff}
            </p>

            <p>
              <strong>Fees:</strong> ₹{college.fees}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "15px",
  margin: "10px 0",
  background: "#fff",
};

export default Predictor;
