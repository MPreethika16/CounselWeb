import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

const SearchableSelect = forwardRef(function SearchableSelect(
  {
    value = "",
    onChange,
    options = [],
    placeholder = "Select",
    disabled = false,
    searchable = true,
    hasError = false,
    id,
    getOptionLabel = (option) =>
      typeof option === "object"
        ? String(option?.label ?? option?.name ?? option?.value ?? "")
        : String(option),
    getOptionValue = (option) =>
      typeof option === "object"
        ? String(option?.value ?? option?.code ?? option?.id ?? option?.label ?? "")
        : String(option),
    emptyMessage = "No options found",
    "aria-labelledby": ariaLabelledBy,
    // Optional: custom renderer for each option row in the dropdown
    renderOption,
    // Optional: custom renderer for the selected value shown in the trigger
    renderValue,
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useImperativeHandle(ref, () => triggerRef.current);

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

    const focusTimer = setTimeout(() => {
      if (searchable) {
        containerRef.current?.querySelector(".predictor-dropdown-search-input")?.focus();
      } else {
        containerRef.current?.querySelector('[role="option"]')?.focus();
      }
    }, 50);

    const updatePlacement = () => {
      if (!containerRef.current || !menuRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const menuHeight = Math.min(280, window.innerHeight * 0.5);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUp(spaceBelow < menuHeight && spaceAbove > spaceBelow);
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [isOpen, searchable]);

  const filteredOptions = options.filter((option) => {
    if (!searchable || !searchVal.trim()) return true;
    const optionLabel = String(getOptionLabel(option));
    const optionValue = String(getOptionValue(option));
    const searchString = searchVal.toLowerCase();
    return (
      optionLabel.toLowerCase().includes(searchString) ||
      optionValue.toLowerCase().includes(searchString)
    );
  });

  const selectedOption = options.find((opt) => String(getOptionValue(opt)) === String(value));
  const displayValue = selectedOption
    ? (renderValue ? null : getOptionLabel(selectedOption))
    : "";
  const customTriggerContent = selectedOption && renderValue ? renderValue(selectedOption) : null;

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const toggleOpen = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const triggerClasses = [
    "predictor-dropdown-trigger",
    isOpen ? "is-open" : "",
    disabled ? "is-disabled" : "",
    hasError ? "has-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const menuClasses = ["predictor-dropdown-menu", openUp ? "is-open-up" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="predictor-dropdown" ref={containerRef}>
      <div
        id={id}
        ref={triggerRef}
        className={triggerClasses}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        aria-invalid={hasError}
        aria-labelledby={ariaLabelledBy}
        tabIndex={disabled ? -1 : 0}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleOpen();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
          } else if (e.key === "ArrowDown" && !isOpen) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        {customTriggerContent ? (
          <span className="predictor-dropdown-value predictor-dropdown-value--custom">
            {customTriggerContent}
          </span>
        ) : (
          <span
            className={`predictor-dropdown-value ${displayValue ? "" : "is-placeholder"}`}
          >
            {displayValue || placeholder}
          </span>
        )}
        <ChevronDown size={16} className="predictor-dropdown-chevron" aria-hidden="true" />
      </div>

      {isOpen && !disabled && (
        <div ref={menuRef} className={menuClasses}>
          {searchable && (
            <div className="predictor-dropdown-search">
              <Search size={16} className="predictor-dropdown-search-icon" aria-hidden="true" />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Type to filter…"
                className="predictor-dropdown-search-input"
                aria-label="Filter options"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    containerRef.current?.querySelector('[role="option"]')?.focus();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }
                }}
              />
              {searchVal && (
                <button
                  type="button"
                  className="predictor-dropdown-search-clear"
                  onClick={() => setSearchVal("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          <div className="predictor-dropdown-options" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="predictor-dropdown-empty">{emptyMessage}</div>
            ) : (
              filteredOptions.map((option) => {
                const optVal = getOptionValue(option);
                const optLabel = getOptionLabel(option);
                const isSelected = String(optVal) === String(value);

                return (
                  <div
                    key={optVal}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    className={`predictor-dropdown-option multiselect-option-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelect(optVal)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelect(optVal);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        e.currentTarget.nextElementSibling?.focus();
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const prev = e.currentTarget.previousElementSibling;
                        if (prev) {
                          prev.focus();
                        } else {
                          containerRef.current
                            ?.querySelector(".predictor-dropdown-search-input")
                            ?.focus();
                        }
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setIsOpen(false);
                        triggerRef.current?.focus();
                      }
                    }}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <span>{optLabel}</span>
                    )}
                    {isSelected && <span className="predictor-dropdown-check">✓</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default SearchableSelect;
