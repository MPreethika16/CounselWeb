export const getBranchType = (branch = "", code = "") => {
  const b = (branch + " " + code).toUpperCase();
  if (b.includes("CSE") || b.includes("CSM") || b.includes("CSD") || b.includes("CSC") || b.includes("CSB") || b.includes("CSO") || b.includes("CSI") || b.includes("CIC") || b.includes("AIM") || b.includes("AID") || b.includes("AI") || b.includes("DATA") || b.includes("CYBER") || b.includes("COMPUTER") || b.includes("INFORMATION") || b.includes("IT") || b.includes("IOT") || b.includes("ARTIFICIAL") || b.includes("MACHINE LEARNING")) return "computing";
  if (b.includes("ECE") || b.includes("EEE") || b.includes("EIE") || b.includes("ECM") || b.includes("ECT") || b.includes("ELECTRONICS") || b.includes("ELECTRICAL") || b.includes("COMMUNICATION") || b.includes("INSTRUMENTATION") || b.includes("VLSI")) return "electrical";
  if (b.includes("MEC") || b.includes("CIV") || b.includes("CHE") || b.includes("MIN") || b.includes("MET") || b.includes("AUT") || b.includes("MECHANICAL") || b.includes("CIVIL") || b.includes("CHEMICAL") || b.includes("MINING") || b.includes("METALLURGY") || b.includes("AUTOMOBILE")) return "core";
  if (b.includes("AGR") || b.includes("FOOD") || b.includes("DAIRY") || b.includes("AGRICULTURAL") || b.includes("FOOD TECHNOLOGY")) return "agriculture";
  if (b.includes("BIO") || b.includes("BME") || b.includes("PHM") || b.includes("PHARM") || b.includes("BIOTECH") || b.includes("BIOTECHNOLOGY") || b.includes("BIOMEDICAL")) return "medical";
  return "other";
};
