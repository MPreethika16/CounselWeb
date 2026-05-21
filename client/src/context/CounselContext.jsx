import React, { createContext, useContext, useState, useEffect } from 'react';

const CounselContext = createContext();

export const useCounsel = () => useContext(CounselContext);

export const CounselProvider = ({ children }) => {
  // Check if manual page refresh/reload occurred to perform auto-reset
  const isReload = typeof window !== 'undefined' && 
    window.performance && 
    window.performance.getEntriesByType('navigation')[0]?.type === 'reload';

  if (isReload) {
    [
      "counsel_rank", "counsel_category", "counsel_gender", "counsel_selectedDistricts",
      "counsel_maxFees", "counsel_strictDistrictFilter", "counsel_specialCategory",
      "counsel_selectedBranchCode", "counsel_branchType", "counsel_preferences",
      "counsel_optionLimit", "counsel_customLimit", "counsel_riskFilters"
    ].forEach(k => localStorage.removeItem(k));
  }

  // Shared form inputs (checks counsel keys first, then falls back to user profile/guest preferences)
  const [rank, setRank] = useState(() => {
    const counselRank = localStorage.getItem("counsel_rank");
    if (counselRank) return counselRank;
    const userStr = localStorage.getItem("user") || localStorage.getItem("guest_preferences");
    try {
      if (userStr) return JSON.parse(userStr).rank || "";
    } catch {}
    return "";
  });

  const [category, setCategory] = useState(() => {
    const counselCat = localStorage.getItem("counsel_category");
    if (counselCat) return counselCat;
    const userStr = localStorage.getItem("user") || localStorage.getItem("guest_preferences");
    try {
      if (userStr) return JSON.parse(userStr).category || "OC";
    } catch {}
    return "OC";
  });

  const [gender, setGender] = useState(() => {
    const counselGen = localStorage.getItem("counsel_gender");
    if (counselGen) return counselGen;
    const userStr = localStorage.getItem("user") || localStorage.getItem("guest_preferences");
    try {
      if (userStr) return JSON.parse(userStr).gender || "BOYS";
    } catch {}
    return "BOYS";
  });

  const [selectedDistricts, setSelectedDistricts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("counsel_selectedDistricts")) || [];
    } catch {
      return [];
    }
  });
  const [maxFees, setMaxFees] = useState(() => localStorage.getItem("counsel_maxFees") || "");
  const [strictDistrictFilter, setStrictDistrictFilter] = useState(() => localStorage.getItem("counsel_strictDistrictFilter") === "true");
  const [specialCategory, setSpecialCategory] = useState(() => localStorage.getItem("counsel_specialCategory") || "None");

  // Predictor-specific states
  const [selectedBranchCode, setSelectedBranchCode] = useState(() => localStorage.getItem("counsel_selectedBranchCode") || "");
  const [branchType, setBranchType] = useState(() => localStorage.getItem("counsel_branchType") || "");
  const [backupResults, setBackupResults] = useState([]);
  const [bestMatchResults, setBestMatchResults] = useState([]);
  const [competitiveResults, setCompetitiveResults] = useState([]);
  const [missingMessages, setMissingMessages] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  // WebOptions-specific states
  const [preferences, setPreferences] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("counsel_preferences")) || [];
    } catch {
      return [];
    }
  });
  const [optionLimit, setOptionLimit] = useState(() => Number(localStorage.getItem("counsel_optionLimit")) || 50);
  const [customLimit, setCustomLimit] = useState(() => localStorage.getItem("counsel_customLimit") || "");
  const [riskFilters, setRiskFilters] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("counsel_riskFilters")) || [];
    } catch {
      return [];
    }
  });
  const [results, setResults] = useState([]);
  const [strategySummary, setStrategySummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  // Sync state changes with localStorage
  useEffect(() => {
    localStorage.setItem("counsel_rank", rank);
    localStorage.setItem("counsel_category", category);
    localStorage.setItem("counsel_gender", gender);
    localStorage.setItem("counsel_selectedDistricts", JSON.stringify(selectedDistricts));
    localStorage.setItem("counsel_maxFees", maxFees);
    localStorage.setItem("counsel_strictDistrictFilter", strictDistrictFilter);
    localStorage.setItem("counsel_specialCategory", specialCategory);
    localStorage.setItem("counsel_selectedBranchCode", selectedBranchCode);
    localStorage.setItem("counsel_branchType", branchType);
    localStorage.setItem("counsel_preferences", JSON.stringify(preferences));
    localStorage.setItem("counsel_optionLimit", optionLimit);
    localStorage.setItem("counsel_customLimit", customLimit);
    localStorage.setItem("counsel_riskFilters", JSON.stringify(riskFilters));
  }, [
    rank, category, gender, selectedDistricts, maxFees, strictDistrictFilter,
    specialCategory, selectedBranchCode, branchType, preferences, optionLimit,
    customLimit, riskFilters
  ]);

  const resetState = () => {
    setRank("");
    setCategory("OC");
    setGender("BOYS");
    setSelectedDistricts([]);
    setMaxFees("");
    setStrictDistrictFilter(false);
    setSpecialCategory("None");
    setSelectedBranchCode("");
    setBranchType("");
    setBackupResults([]);
    setBestMatchResults([]);
    setCompetitiveResults([]);
    setMissingMessages({});
    setHasSearched(false);
    setPreferences([]);
    setOptionLimit(50);
    setCustomLimit("");
    setRiskFilters([]);
    setResults([]);
    setStrategySummary(null);
    setTotal(0);
    setPages(1);
    setPage(1);

    // Wipe specific storage keys
    [
      "counsel_rank", "counsel_category", "counsel_gender", "counsel_selectedDistricts",
      "counsel_maxFees", "counsel_strictDistrictFilter", "counsel_specialCategory",
      "counsel_selectedBranchCode", "counsel_branchType", "counsel_preferences",
      "counsel_optionLimit", "counsel_customLimit", "counsel_riskFilters"
    ].forEach(k => localStorage.removeItem(k));
  };

  return (
    <CounselContext.Provider value={{
      rank, setRank,
      category, setCategory,
      gender, setGender,
      selectedDistricts, setSelectedDistricts,
      maxFees, setMaxFees,
      strictDistrictFilter, setStrictDistrictFilter,
      specialCategory, setSpecialCategory,
      selectedBranchCode, setSelectedBranchCode,
      branchType, setBranchType,
      backupResults, setBackupResults,
      bestMatchResults, setBestMatchResults,
      competitiveResults, setCompetitiveResults,
      missingMessages, setMissingMessages,
      hasSearched, setHasSearched,
      preferences, setPreferences,
      optionLimit, setOptionLimit,
      customLimit, setCustomLimit,
      riskFilters, setRiskFilters,
      results, setResults,
      strategySummary, setStrategySummary,
      total, setTotal,
      pages, setPages,
      page, setPage,
      resetState
    }}>
      {children}
    </CounselContext.Provider>
  );
};
