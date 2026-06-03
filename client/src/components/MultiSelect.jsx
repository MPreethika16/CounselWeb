import { useState, useEffect, useRef } from "react";
import { ChevronDown, X, Search } from "lucide-react";

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
  predictor = false,
  hasError = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

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

  useEffect(() => {
    if (!isOpen) {
      setSearchVal("");
      return;
    }

    let focusTimer;
    focusTimer = setTimeout(() => {
      if (searchable) {
        const searchInput = containerRef.current?.querySelector(
          predictor ? ".predictor-dropdown-search-input" : ".multi-select-search"
        );
        searchInput?.focus();
      } else {
        const firstOption = containerRef.current?.querySelector('[role="option"]');
        firstOption?.focus();
      }
    }, 50);

    const updatePlacement = () => {
      if (!predictor || !containerRef.current || !menuRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const menuHeight = Math.min(280, window.innerHeight * 0.5);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUp(spaceBelow < menuHeight && spaceAbove > spaceBelow);
    };

    if (predictor) {
      updatePlacement();
      window.addEventListener("resize", updatePlacement);
      window.addEventListener("scroll", updatePlacement, true);
    }

    return () => {
      if (focusTimer) clearTimeout(focusTimer);
      if (predictor) {
        window.removeEventListener("resize", updatePlacement);
        window.removeEventListener("scroll", updatePlacement, true);
      }
    };
  }, [isOpen, searchable, predictor]);

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

  const filteredOptions = options
    .filter((option) => {
      const optionLabel = String(getOptionLabel(option));
      const optionValue = String(getOptionValue(option));
      const searchString = searchVal.toLowerCase();
      
      return (
        optionLabel.toLowerCase().includes(searchString) ||
        optionValue.toLowerCase().includes(searchString)
      );
    });

  const displayLabelFn = getSelectedLabel || getOptionLabel;

  const wrapperClass = predictor
    ? "multi-select predictor-dropdown input-group"
    : "multi-select input-group";

  const triggerClass = predictor
    ? [
        "predictor-dropdown-trigger",
        "multi-select-trigger",
        isOpen ? "is-open" : "",
        hasError ? "has-error" : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const menuClass = predictor
    ? ["predictor-dropdown-menu", "multi-select-menu", openUp ? "is-open-up" : ""]
        .filter(Boolean)
        .join(" ")
    : "multi-select-menu";

  const defaultTriggerStyle = predictor
    ? undefined
    : {
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
      };

  const defaultMenuStyle = predictor
    ? undefined
    : {
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
      };

  return (
    <div
      className={wrapperClass}
      ref={containerRef}
      style={predictor ? { position: "relative", width: "100%" } : { position: "relative", width: "100%", marginBottom: "16px" }}
    >
      {label && <label style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>{label}</label>}

      {/* Control / Selected items input area */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={triggerClass || undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
          }
        }}
        style={defaultTriggerStyle}
      >
        {!showChipsInline && selected.length > 0 ? (
          <span style={predictor ? undefined : { color: "var(--text-muted)", fontSize: "15px", userSelect: "none" }} className={predictor ? "predictor-dropdown-value" : undefined}>
            {renderValue ? renderValue(selected) : placeholder}
          </span>
        ) : selected.length === 0 && !searchVal ? (
          <span
            style={predictor ? undefined : { color: "var(--text-muted)", fontSize: "15px", userSelect: "none" }}
            className={predictor ? "predictor-dropdown-value is-placeholder" : undefined}
          >
            {placeholder}
          </span>
        ) : null}

        {/* Render chips for selected values */}
        {showChipsInline && selected.map((val) => {
          const matchingOption = options.find((opt) => String(getOptionValue(opt)) === String(val));
          const chipLabel = matchingOption ? displayLabelFn(matchingOption) : val;

          return (
            <div
              key={val}
              className="multi-select-chip"
            >
              <span>{chipLabel}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveItem(e, val)}
                aria-label={`Remove ${chipLabel}`}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        {predictor && (
          <ChevronDown size={16} className="predictor-dropdown-chevron" aria-hidden="true" />
        )}
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          ref={menuRef}
          className={menuClass}
          style={defaultMenuStyle}
        >
          {/* Search bar inside dropdown */}
          {searchable && (
            <div
              className={predictor ? "predictor-dropdown-search" : undefined}
              style={predictor ? undefined : {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border-color)",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <Search size={16} style={predictor ? undefined : { color: "var(--text-muted)" }} className={predictor ? "predictor-dropdown-search-icon" : undefined} />
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
                placeholder="Type to filter…"
                className={predictor ? "predictor-dropdown-search-input" : "multi-select-search"}
                style={predictor ? undefined : {
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
                  aria-label="Clear search"
                  onClick={() => setSearchVal("")}
                  className={predictor ? "predictor-dropdown-search-clear" : undefined}
                  style={predictor ? undefined : { background: "transparent", border: "none", cursor: "pointer", display: "flex", color: "var(--text-muted)" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* List of scrollable choices */}
          <div
            className={predictor ? "predictor-dropdown-options multi-select-options-list" : "multi-select-options-list"}
            role="listbox"
            aria-multiselectable="true"
            style={predictor ? undefined : { overflowY: "auto", overflowX: "hidden", padding: "6px", display: "flex", flexDirection: "column", gap: "2px" }}
          >
            {filteredOptions.length === 0 ? (
              <div
                className={predictor ? "predictor-dropdown-empty" : undefined}
                style={predictor ? undefined : { padding: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}
              >
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
                          const searchInput = containerRef.current?.querySelector(
                            predictor ? ".predictor-dropdown-search-input" : ".multi-select-search"
                          );
                          searchInput?.focus();
                        }
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setIsOpen(false);
                        const trigger = containerRef.current?.querySelector('[role="button"]');
                        trigger?.focus();
                      }
                    }}
                    className={`multi-select-option multiselect-option-item ${predictor ? "predictor-dropdown-option" : ""} ${isSelected ? "is-selected" : ""}`}
                  >
                    <span>{optLabel}</span>
                    {isSelected && (
                      <span className={predictor ? "predictor-dropdown-check" : "multi-select-check"}>✓</span>
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
