import { useState } from "react";

const branchOptions = [
  { branch: "COMPUTER SCIENCE AND ENGINEERING", code: "CSE" },
  { branch: "COMPUTER SCIENCE AND ENGINEERING (ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING)", code: "CSM" },
  { branch: "COMPUTER SCIENCE AND ENGINEERING (DATA SCIENCE)", code: "CSD" },
  { branch: "COMPUTER SCIENCE AND ENGINEERING (CYBER SECURITY)", code: "CSC" },
  { branch: "INFORMATION TECHNOLOGY", code: "INF" },
  { branch: "ELECTRONICS AND COMMUNICATION ENGINEERING", code: "ECE" },
  { branch: "ELECTRICAL AND ELECTRONICS ENGINEERING", code: "EEE" },
  { branch: "CIVIL ENGINEERING", code: "CIV" },
  { branch: "MECHANICAL ENGINEERING", code: "MEC" }
];

const Preferences = ({ setPreferences }) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const selectBranch = (item) => {
    if (selectedBranches.includes(item.code)) return;

    const updated = [...selectedBranches, item.code];
    setSelectedBranches(updated);
    setPreferences(updated);

    setInputValue("");
    setSuggestions([]);
  };

  const removeBranch = (code) => {
    const updated = selectedBranches.filter((b) => b !== code);
    setSelectedBranches(updated);
    setPreferences(updated);
  };

  return (
    <div>
      <h3>Branch Preferences</h3>

      <input
        type="text"
        placeholder="Search CSE, CSM, CSD..."
        value={inputValue}
        onChange={(e) => {
          const value = e.target.value;
          setInputValue(value);

          if (value.trim()) {
            const filtered = branchOptions.filter((item) =>
              item.code.toLowerCase().includes(value.toLowerCase()) ||
              item.branch.toLowerCase().includes(value.toLowerCase())
            );

            setSuggestions(filtered);
          } else {
            setSuggestions([]);
          }
        }}
      />

      {inputValue && (
        <div style={{ border: "1px solid gray", width: "430px" }}>
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <div
                key={item.code}
                onClick={() => selectBranch(item)}
                style={{ padding: "8px", cursor: "pointer" }}
              >
                {item.code} - {item.branch}
              </div>
            ))
          ) : (
            <div style={{ padding: "8px" }}>No branch found</div>
          )}
        </div>
      )}

      <div style={{ marginTop: "10px" }}>
        {selectedBranches.map((code, index) => (
          <span
            key={code}
            style={{
              display: "inline-block",
              padding: "8px",
              margin: "5px",
              border: "1px solid gray",
              borderRadius: "20px"
            }}
          >
            {index + 1}. {code}
            <button onClick={() => removeBranch(code)}> ✕ </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default Preferences;