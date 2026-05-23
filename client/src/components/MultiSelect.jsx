import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";

function MultiSelect({
  label,
  options = [],
  selected = [],
  onChange,
  placeholder = "Select options...",
  getOptionLabel = (option) => (typeof option === "object" ? String(option?.label ?? option?.name ?? "") : String(option)),
  getOptionValue = (option) => (typeof option === "object" ? String(option?.value ?? option?.code ?? option?.id ?? "") : String(option)),
  getSelectedLabel,
  searchable = true,
  showChipsInline = true,
  renderValue,
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

  // Keyboard navigation focus management on dropdown open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (searchable) {
          const searchInput = containerRef.current?.querySelector(".multi-select-search");
          searchInput?.focus();
        } else {
          const firstOption = containerRef.current?.querySelector('[role="option"]');
          firstOption?.focus();
        }
      }, 50);
    }
  }, [isOpen, searchable]);

  const handleToggleSelect = (optionValue) => {
    const stringVal = String(optionValue);
    const hasMatch = selected.some(item => String(item) === stringVal);
    if (hasMatch) {
      onChange(selected.filter((item) => String(item) !== stringVal));
    } else {
      onChange([...selected, optionValue]);
    }
  };

  const handleRemoveItem = (e, itemValue) => {
    e.stopPropagation();
    const stringVal = String(itemValue);
    onChange(selected.filter((item) => String(item) !== stringVal));
  };

  const filteredOptions = options.filter((option) => {
    const optionLabel = String(getOptionLabel(option));
    const optionValue = String(getOptionValue(option));
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
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
          }
        }}
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
        {!showChipsInline && selected.length > 0 ? (
          <span style={{ color: "var(--text-muted)", fontSize: "15px", userSelect: "none" }}>
            {renderValue ? renderValue(selected) : placeholder}
          </span>
        ) : selected.length === 0 && !searchVal ? (
          <span style={{ color: "var(--text-muted)", fontSize: "15px", userSelect: "none" }}>{placeholder}</span>
        ) : null}

        {/* Render chips for selected values */}
        {showChipsInline && selected.map((val) => {
          const matchingOption = options.find((opt) => String(getOptionValue(opt)) === String(val));
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
                fontSize: "12px",
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
          className="multi-select-menu"
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
            boxSizing: "border-box",
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
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const firstOption = containerRef.current?.querySelector('[role="option"]');
                    firstOption?.focus();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setIsOpen(false);
                    const trigger = containerRef.current?.querySelector('[role="button"]');
                    trigger?.focus();
                  }
                }}
                placeholder="Type to filter..."
                className="multi-select-search"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
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
          <div 
            className="multi-select-options-list" 
            role="listbox"
            aria-multiselectable="true"
            style={{ overflowY: "auto", overflowX: "hidden", padding: "6px", display: "flex", flexDirection: "column", gap: "2px" }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const optVal = getOptionValue(option);
                const optLabel = getOptionLabel(option);
                const isSelected = selected.some(item => String(item) === String(optVal));

                return (
                  <div
                    key={optVal}
                    onClick={() => handleToggleSelect(optVal)}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggleSelect(optVal);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const nextSibling = e.currentTarget.nextElementSibling;
                        if (nextSibling) nextSibling.focus();
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const prevSibling = e.currentTarget.previousElementSibling;
                        if (prevSibling) {
                          prevSibling.focus();
                        } else {
                          const searchInput = containerRef.current?.querySelector(".multi-select-search");
                          searchInput?.focus();
                        }
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setIsOpen(false);
                        const trigger = containerRef.current?.querySelector('[role="button"]');
                        trigger?.focus();
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderRadius: "8px",
                      fontSize: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: isSelected ? "var(--accent-glow)" : "transparent",
                      color: isSelected ? "var(--accent-blue)" : "var(--text-primary)",
                      fontWeight: isSelected ? "600" : "400",
                      transition: "var(--transition)",
                      outline: "none",
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
