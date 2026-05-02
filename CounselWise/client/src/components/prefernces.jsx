import { useState } from "react";


const Preferences=()=>{
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  //const [preferences, setPreferences] = useState([""]);
  const branches = [...new Set(colleges.map(c => c.branch))];
    return(
<div style={{ position: "relative", maxWidth: "300px" }}>
  <input
    type="text"
    placeholder="Search branch..."
    value={inputValue}
    onChange={(e) => {
      const value = e.target.value;

      setInputValue(value);

      if (value.trim().length > 0) {
        const filtered = branches
          .filter((b) =>
            b.toLowerCase().startsWith(value.toLowerCase())
          )
          .slice(0, 6);

        setSuggestions(filtered);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    }}
    style={{
      width: "100%",
      padding: "8px",
      border: "1px solid #ccc",
      borderRadius: "6px"
    }}
  />


  {showSuggestions && (
    <div style={{
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      border: "1px solid #ccc",
      background: "#fff",
      zIndex: 10
    }}>
      {suggestions.length > 0 ? (
        suggestions.map((s, i) => (
          <div
            key={i}
            style={{
              padding: "8px",
              cursor: "pointer"
            }}
            onClick={() => {
              setInputValue(s);
              setShowSuggestions(false);
            }}
          >
            {s}
          </div>
        ))
      ) : (
        <div style={{ padding: "8px" }}>
          No branch found
        </div>
      )}
    </div>
  )}
</div>
    )
};

export default Preferences;
