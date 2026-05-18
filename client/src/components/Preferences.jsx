import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { getBranchType } from "../utils/branchLogic";
import MultiSelect from "./MultiSelect";

const Preferences = ({ branches = [], preferences = [], setPreferences }) => {
  const [selectedCategory, setSelectedCategory] = useState("");

  const branchGroups = useMemo(() => {
    const groups = { computing: new Map(), electrical: new Map(), core: new Map(), agriculture: new Map(), medical: new Map(), other: new Map() };
    branches.forEach((item) => {
      if (!item.branch) return;
      const type = getBranchType(item.branch, item.branchCode);
      if (!groups[type]) return;
      const code = item.branchCode || "";
      const label = code ? `${code} - ${item.branch}` : item.branch;
      groups[type].set(label, { code, branch: item.branch, label });
    });
    return {
      computing: [...groups.computing.values()].sort((a, b) => a.label.localeCompare(b.label)),
      electrical: [...groups.electrical.values()].sort((a, b) => a.label.localeCompare(b.label)),
      core: [...groups.core.values()].sort((a, b) => a.label.localeCompare(b.label)),
      agriculture: [...groups.agriculture.values()].sort((a, b) => a.label.localeCompare(b.label)),
      medical: [...groups.medical.values()].sort((a, b) => a.label.localeCompare(b.label)),
      other: [...groups.other.values()].sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [branches]);

  const currentCategoryBranches = useMemo(() => {
    return selectedCategory ? branchGroups[selectedCategory] || [] : [];
  }, [selectedCategory, branchGroups]);

  const selectedInCurrentCategory = useMemo(() => {
    return preferences.filter(code => 
      currentCategoryBranches.some(b => b.code === code)
    );
  }, [preferences, currentCategoryBranches]);

  const handleCategoryBranchesChange = (newSelectedInCurrentCategory) => {
    const otherCategoryPrefs = preferences.filter(code => 
      !currentCategoryBranches.some(b => b.code === code)
    );
    
    const added = newSelectedInCurrentCategory.filter(code => !preferences.includes(code));
    const keptCurrent = newSelectedInCurrentCategory.filter(code => preferences.includes(code));
    
    const newPrefs = [
      ...preferences.filter(code => otherCategoryPrefs.includes(code) || keptCurrent.includes(code)),
      ...added
    ];
    
    setPreferences(newPrefs);
  };

  const removeBranch = (branchCode) => {
    setPreferences(preferences.filter((b) => b !== branchCode));
  };

  return (
    <div>
      <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
        Branch Preferences (in order) *
      </label>

      <div className="branch-preference-row" style={{ marginBottom: '16px' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <select 
            className="input-field" 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ minHeight: '46px' }}
          >
            <option value="">Category</option>
            <option value="computing">Computing</option>
            <option value="electrical">Electrical</option>
            <option value="core">Core</option>
            <option value="agriculture">Agriculture</option>
            <option value="medical">Medical</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          {selectedCategory ? (
            <MultiSelect
              options={currentCategoryBranches}
              selected={selectedInCurrentCategory}
              onChange={handleCategoryBranchesChange}
              placeholder="Select specific branches..."
              searchable={true}
              getOptionLabel={(opt) => opt.label}
              getOptionValue={(opt) => opt.code}
              getSelectedLabel={(opt) => opt.code}
            />
          ) : (
            <select 
              className="input-field" 
              value="" 
              disabled 
              style={{ minHeight: '46px' }}
            >
              <option value="">Select Category first</option>
            </select>
          )}
        </div>
      </div>

      {preferences.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: '12px' }}>
          {preferences.map((code, index) => (
            <div
              key={code}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "rgba(37, 99, 235, 0.1)", border: "1px solid rgba(37, 99, 235, 0.2)",
                color: "var(--accent-blue)", padding: "8px 16px", 
                borderRadius: "24px", fontSize: "14px", fontWeight: "600"
              }}
            >
              <span style={{opacity: 0.6}}>{index + 1}.</span> {code}
              <button 
                onClick={() => removeBranch(code)} 
                style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--accent-blue)", marginLeft: '4px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Preferences;