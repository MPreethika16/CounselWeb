import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000";

const districtOptions = [
  "HYD", "MDL", "RR", "KGM", "SRP", "WGL", "KHM",
  "MED", "SRD", "KMR", "NZB", "KRM", "JTL", "MHB",
  "SDP", "PDL", "SRC", "WNP", "MBN", "HNK", "NPT",
  "NLG", "YBG"
];

function Predictor() {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [district, setDistrict] = useState("");

  const [branchType, setBranchType] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [maxFees, setMaxFees] = useState("");

  const [colleges, setColleges] = useState([]);
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/colleges?limit=5000`)
      .then((res) => res.json())
      .then((data) => {
        console.log("COLLEGES API RESPONSE:", data);

        if (Array.isArray(data)) {
          setColleges(data);
        } else if (Array.isArray(data.colleges)) {
          setColleges(data.colleges);
        } else {
          setColleges([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load colleges:", err);
        alert("Failed to load colleges");
      });
  }, []);

  const getBranchType = (branch = "", code = "") => {
    const text = `${branch} ${code}`.toLowerCase();

    if (
      text.includes("computer") ||
      text.includes("cse") ||
      text.includes("csm") ||
      text.includes("csd") ||
      text.includes("csc") ||
      text.includes("csb") ||
      text.includes("cso") ||
      text.includes("aim") ||
      text.includes("aids") ||
      text.includes("artificial") ||
      text.includes("machine learning") ||
      text.includes("data") ||
      text.includes("cyber") ||
      text.includes("information") ||
      text.includes("inf") ||
      text.includes("it")
    ) {
      return "computing";
    }

    if (
      text.includes("electrical") ||
      text.includes("electronics") ||
      text.includes("eee") ||
      text.includes("ece")
    ) {
      return "electrical";
    }

    if (
      text.includes("civil") ||
      text.includes("mechanical") ||
      text.includes("automobile") ||
      text.includes("mining") ||
      text.includes("metallurgy") ||
      text.includes("chemical")
    ) {
      return "core";
    }

    if (
      text.includes("agri") ||
      text.includes("food") ||
      text.includes("dairy")
    ) {
      return "agriculture";
    }

    if (
      text.includes("bio") ||
      text.includes("pharm") ||
      text.includes("medical")
    ) {
      return "medical";
    }

    return "other";
  };

  const branchGroups = useMemo(() => {
    const groups = {
      computing: new Map(),
      electrical: new Map(),
      core: new Map(),
      agriculture: new Map(),
      medical: new Map()
    };

    colleges.forEach((college) => {
      if (!college.branch || !college.branchCode) return;

      const type = getBranchType(college.branch, college.branchCode);

      if (!groups[type]) return;

      const label = `${college.branchCode} - ${college.branch}`;

      groups[type].set(label, {
        code: college.branchCode,
        branch: college.branch,
        label
      });
    });

    const finalGroups = {
      computing: [...groups.computing.values()].sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
      electrical: [...groups.electrical.values()].sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
      core: [...groups.core.values()].sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
      agriculture: [...groups.agriculture.values()].sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
      medical: [...groups.medical.values()].sort((a, b) =>
        a.label.localeCompare(b.label)
      )
    };

    console.log("BRANCH GROUPS:", finalGroups);

    return finalGroups;
  }, [colleges]);

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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rank: Number(rank),
          category,
          gender,
          district,
          branch: selectedBranch,
          maxFees: maxFees ? Number(maxFees) : ""
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Prediction failed");
        return;
      }

      setResult(data.recommendations || []);
    } catch (err) {
      console.error("Prediction failed:", err);
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

      <p>Total colleges loaded: {colleges.length}</p>

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

          <p>
            Branches found: {branchGroups[branchType]?.length || 0}
          </p>

          {branchGroups[branchType]?.length === 0 && (
            <p style={{ color: "red" }}>
              No branches found. Check if colleges loaded and branch/branchCode exist.
            </p>
          )}

          {branchGroups[branchType]?.map((item) => (
            <button
              key={item.label}
              onClick={() => setSelectedBranch(item.code)}
              style={{
                margin: "5px",
                padding: "8px",
                border:
                  selectedBranch === item.code
                    ? "2px solid blue"
                    : "1px solid gray",
                borderRadius: "6px",
                cursor: "pointer"
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
  background: "#fff"
};

export default Predictor;