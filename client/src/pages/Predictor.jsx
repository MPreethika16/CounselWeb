import { useState, useMemo } from "react";



function Predictor() {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [district, setDistrict] = useState("");

  const [branchType, setBranchType] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [maxFees, setMaxFees] = useState("");

  const [result, setResult] = useState([]);

  //Unique districts
  const districts = useMemo(
    () => [...new Set(colleges.map(c => c.district))],
    []
  );

  const [colleges, setColleges] = useState([]);

useEffect(() => {
  fetch("http://localhost:5000/api/colleges")
    .then(res => res.json())
    .then(data => setColleges(data))
    .catch(() => alert("Failed to load colleges"));
}, []);

  //Branch category
  const getBranchType = (branch) => {
    const b = branch.toUpperCase();

    if (
      b.includes("COMPUTER") ||
      b.includes("CSE") ||
      b.includes("INFORMATION") ||
      b.includes("ARTIFICIAL") ||
      b.includes("DATA") ||
      b.includes("CYBER") ||
      b.includes("IT")
    ) return "computing";

    if (
      b.includes("ELECTRONICS") ||
      b.includes("ELECTRICAL") ||
      b.includes("EEE") ||
      b.includes("ECE")
    ) return "electrical";

    if (
      b.includes("AGRICULTURAL") ||
      b.includes("FOOD") ||
      b.includes("DAIRY")
    ) return "agricultural";

    if (
      b.includes("PHARM") ||
      b.includes("BIO") ||
      b.includes("MEDICAL")
    ) return "medical";

    return "core";
  };

  // Branch groups
  const branchGroups = useMemo(() => {
    const groups = {
      computing: new Set(),
      electrical: new Set(),
      core: new Set(),
      agricultural: new Set(),
      medical: new Set()
    };

    colleges.forEach(c => {
      const type = getBranchType(c.branch);
      groups[type].add(c.branch);
    });

    Object.keys(groups).forEach(k => {
      groups[k] = [...groups[k]];
    });

    return groups;
  }, []);

  // Predict
  const handlePredict = () => {
    if (!rank || !category || !gender) {
      alert("Please fill all fields");
      return;
    }

    const handlePredict = async () => {
  if (!rank || !category || !gender) {
    alert("Fill all fields");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rank: Number(rank),
        category,
        gender,
        district,
        selectedBranch,
        maxFees: Number(maxFees)
      })
    });

    const data = await res.json();

    setResult(data);

  } catch (err) {
    alert("Prediction failed");
  }
};

    setResult(output);
  };

  // Reset
  const resetFilters = () => {
    setBranchType("");
    setSelectedBranch("");
    setMaxFees("");
    setResult([]);
  };

  // Render cards
  const renderCards = () => {
    if (result.length === 0) {
      return <p>No strong safe colleges found.</p>;
    }

    return result.map((c, i) => (
      <div key={i} style={cardStyle}>
        <h3>{c.name} ({c.collegeCode})</h3>

        <p style={{ color: "green" }}>
          Strong Safe Match: {c.score}%
        </p>

        <p><strong>Branch:</strong> {c.branch} ({c.branchCode})</p>
        <p><strong>Affiliated:</strong> {c.affiliated}</p>
        <p><strong>Location:</strong> {c.place}, {c.district}</p>
        <p><strong>Cutoff:</strong> {c.cutoff}</p>
        <p><strong>Fees:</strong> ₹{c.fees}</p>
      </div>
    ));
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

      <br /><br />

      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Select Category</option>
        {["OC","BC_A","BC_B","BC_C","BC_D","BC_E","SC","ST"].map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <br /><br />

      <select value={gender} onChange={(e) => setGender(e.target.value)}>
        <option value="">Select Gender</option>
        <option value="BOYS">BOYS</option>
        <option value="GIRLS">GIRLS</option>
      </select>

      <br /><br />

      <select value={district} onChange={(e) => setDistrict(e.target.value)}>
        <option value="">All Districts</option>
        {districts.map((d, i) => (
          <option key={i} value={d}>{d}</option>
        ))}
      </select>

      <br /><br />

      
      <h3>Filters</h3>

      <select
        value={branchType}
        onChange={(e) => {
          setBranchType(e.target.value);
          setSelectedBranch("");
        }}
      >
        <option value="">All Branch Types</option>
        <option value="computing">Computing</option>
        <option value="electrical">Electrical</option>
        <option value="core">Core</option>
        <option value="agricultural">Agricultural</option>
        <option value="medical">Medical</option>
      </select>

      <br /><br />

      {branchType && (
        <div>
          {branchGroups[branchType].map((b, i) => (
            <button
              key={i}
              onClick={() => setSelectedBranch(b)}
              style={{
                margin: "5px",
                padding: "8px",
                border: selectedBranch === b
                  ? "2px solid blue"
                  : "1px solid gray"
              }}
            >
              {b}
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

      <br /><br />

      <button onClick={handlePredict}>Predict</button>
      <button onClick={resetFilters} style={{ marginLeft: "10px" }}>
        Reset Filters
      </button>

      
      <div>
        <h2> Top 3 Strong Safe Colleges</h2>
        {renderCards()}
      </div>
    </div>
  );
}

// style
const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "15px",
  margin: "10px",
  background: "#fff",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
};

export default Predictor;