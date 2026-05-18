import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";

function MultiSelect({
  label,
  options = [],
  selected = [],
  onChange,
  placeholder = "Select options...",
  getOptionLabel = (option) => (typeof option === "object" ? option?.label || option?.name || "" : String(option)),
  getOptionValue = (option) => (typeof option === "object" ? option?.value || option?.code || option?.id || "" : String(option)),
  getSelectedLabel,
  searchable = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleToggleSelect = (optionValue) => {
    if (selected.includes(optionValue)) {
      onChange(selected.filter((item) => item !== optionValue));
    } else {
      onChange([...selected, optionValue]);
    }
  };

  const handleRemoveItem = (e, itemValue) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== itemValue));
  };

  const filteredOptions = options.filter((option) => {
    const optionLabel = getOptionLabel(option);
    const optionValue = getOptionValue(option);
    const searchString = searchVal.toLowerCase();
    
    return (
      optionLabel.toLowerCase().includes(searchString) ||
      optionValue.toLowerCase().includes(searchString)
    );
  });

  const displayLabelFn = getSelectedLabel || getOptionLabel;

  return (
    <div className="multi-select input-group" ref={containerRef} style={{ position: "relative", width: "100%", marginBottom: "16px" }}>
      {label && <label style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>{label}</label>}
      
      {/* Control / Selected items input area */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "6px 12px",
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          borderRadius: "var(--radius-md)",
          minHeight: "46px",
          alignItems: "center",
          cursor: "pointer",
          transition: "var(--transition)",
          position: "relative",
          boxShadow: isOpen ? "0 0 0 3px var(--accent-glow)" : "none",
          borderColor: isOpen ? "var(--accent-blue)" : "var(--input-border)",
        }}
      >
        {selected.length === 0 && !searchVal && (
          <span style={{ color: "var(--text-muted)", fontSize: "15px", userSelect: "none" }}>{placeholder}</span>
        )}

        {/* Render chips for selected values */}
        {selected.map((val) => {
          const matchingOption = options.find((opt) => getOptionValue(opt) === val);
          const chipLabel = matchingOption ? displayLabelFn(matchingOption) : val;

          return (
            <div
              key={val}
              className="multi-select-chip"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "var(--accent-glow)",
                border: "1px solid var(--accent-blue)",
                color: "var(--accent-blue)",
                padding: "3px 8px",
                borderRadius: "16px",
                fontSize: "13px",
                fontWeight: "500",
                height: "30px",
                boxSizing: "border-box",
              }}
            >
              <span>{chipLabel}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveItem(e, val)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-blue)",
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            zIndex: 100,
            marginTop: "6px",
            background: "var(--bg-card)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
            maxHeight: "280px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {/* Search bar inside dropdown */}
          {searchable && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border-color)",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <Search size={16} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Type to filter..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  padding: "4px 0",
                }}
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => setSearchVal("")}
                  style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", color: "var(--text-muted)" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* List of scrollable choices */}
          <div className="multi-select-menu" style={{ overflowY: "auto", overflowX: "hidden", padding: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const optVal = getOptionValue(option);
                const optLabel = getOptionLabel(option);
                const isSelected = selected.includes(optVal);

                return (
                  <div
                    key={optVal}
                    onClick={() => handleToggleSelect(optVal)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderRadius: "8px",
                      fontSize: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: isSelected ? "var(--accent-glow)" : "transparent",
                      color: isSelected ? "var(--accent-blue)" : "var(--text-primary)",
                      fontWeight: isSelected ? "600" : "400",
                      transition: "var(--transition)",
                    }}
                    className="multi-select-option multiselect-option-item"
                  >
                    <span>{optLabel}</span>
                    {isSelected && (
                      <span style={{ fontSize: "12px", fontWeight: "bold" }}>✓</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
