import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { getBranchType } from "../utils/branchLogic";
import MultiSelect from "./MultiSelect";

const Preferences = ({ branches = [], colleges = [], preferences = [], setPreferences }) => {
  const [selectedCategory, setSelectedCategory] = useState("");

  const activeBranches = colleges && colleges.length > 0 ? colleges : (branches || []);

  const branchGroups = useMemo(() => {
    const groups = { computing: new Map(), electrical: new Map(), core: new Map(), agriculture: new Map(), medical: new Map(), other: new Map() };
    activeBranches.forEach((item) => {
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
  }, [activeBranches]);

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
      <label className="counsel-field-label">
        Branch Preferences (in order) *
      </label>

      <div className="branch-preference-row" style={{ marginBottom: "12px", marginTop: "6px" }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <select 
            className="input-field counsel-form-input" 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
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
              key={selectedCategory}
              predictor
              options={currentCategoryBranches}
              selected={selectedInCurrentCategory}
              onChange={handleCategoryBranchesChange}
              placeholder="Select branches..."
              searchable={true}
              getOptionLabel={(opt) => opt.label}
              getOptionValue={(opt) => opt.code}
              getSelectedLabel={(opt) => opt.code}
              showChipsInline={false}
            />
          ) : (
            <select 
              className="input-field counsel-form-input" 
              value="" 
              disabled 
            >
              <option value="">Select Category first</option>
            </select>
          )}
        </div>
      </div>

      {preferences.length > 0 && (
        <div className="selected-preferences">
          {preferences.map((code, index) => (
            <div key={code} className="preference-order-chip">
              <span className="chip-index">{index + 1}.</span>
              <span>{code}</span>
              <button
                type="button"
                onClick={() => removeBranch(code)}
                aria-label={`Remove ${code}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Preferences;
