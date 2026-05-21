import React, { createContext, useContext, useState, useEffect } from 'react';
import logger from '../utils/logger';

const CounselContext = createContext();

export const useCounsel = () => useContext(CounselContext);

export const CounselProvider = ({ children }) => {
  // Shared form inputs managed purely in React memory
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [maxFees, setMaxFees] = useState("");
  const [strictDistrictFilter, setStrictDistrictFilter] = useState(false);
  const [specialCategory, setSpecialCategory] = useState("None");

  // Predictor-specific states
  const [selectedBranchCode, setSelectedBranchCode] = useState("");
  const [branchType, setBranchType] = useState("");
  const [backupResults, setBackupResults] = useState([]);
  const [bestMatchResults, setBestMatchResults] = useState([]);
  const [competitiveResults, setCompetitiveResults] = useState([]);
  const [missingMessages, setMissingMessages] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  // WebOptions-specific states
  const [preferences, setPreferences] = useState([]);
  const [optionLimit, setOptionLimit] = useState(50);
  const [customLimit, setCustomLimit] = useState("");
  const [riskFilters, setRiskFilters] = useState([]);
  const [results, setResults] = useState([]);
  const [strategySummary, setStrategySummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  // Log state updates using our logger utility
  useEffect(() => {
    logger.log("CounselContext State Update:", {
      rank, category, gender, selectedDistricts, maxFees, strictDistrictFilter,
      specialCategory, selectedBranchCode, branchType, preferences, optionLimit,
      customLimit, riskFilters
    });
  }, [
    rank, category, gender, selectedDistricts, maxFees, strictDistrictFilter,
    specialCategory, selectedBranchCode, branchType, preferences, optionLimit,
    customLimit, riskFilters
  ]);

  const resetState = () => {
    logger.log("CounselContext State Reset Initiated");
    setRank("");
    setCategory("");
    setGender("");
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
