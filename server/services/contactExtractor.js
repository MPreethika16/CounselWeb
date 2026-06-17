import * as cheerio from "cheerio";

// List of standard Telangana districts
const TELANGANA_DISTRICTS = [
  "Adilabad", "Bhadradri Kothagudem", "Hanamkonda", "Hyderabad", "Jagtial", 
  "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", 
  "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad", "Mahabubnagar", 
  "Mancherial", "Medak", "Medchal-Malkajgiri", "Medchal", "Mulugu", 
  "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", 
  "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Ranga Reddy", "Sangareddy", 
  "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
];

/**
 * Extract and normalize phone numbers
 */
export const extractPhones = (text) => {
  if (!text) return [];
  const phones = [];
  
  // 1. Mobile numbers (10 digits starting with 6-9, optionally prefixed with +91/91/0)
  // We use word boundary \b to prevent matching parts of longer strings
  const mobileRegex = /\b(?:\+?91[\s\-]?)?(?:0)?[6-9]\d{9}\b/g;
  let match;
  while ((match = mobileRegex.exec(text)) !== null) {
    const raw = match[0];
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 10) {
      const last10 = digits.slice(-10);
      phones.push(`+91${last10}`);
    }
  }

  // 2. Landline numbers (starts with 0, 2-4 digit STD code followed by 6-8 digit number)
  // e.g. 040-24193276, 0891-255234
  const landlineRegex = /\b0\d{2,4}[\s\-]?\d{6,8}\b/g;
  while ((match = landlineRegex.exec(text)) !== null) {
    const raw = match[0];
    const cleanRaw = raw.trim();
    // Normalize separator to a single hyphen
    if (cleanRaw.includes("-")) {
      const parts = cleanRaw.split("-").map(p => p.trim());
      if (parts.length === 2 && parts[0].length >= 3 && parts[1].length >= 6) {
        phones.push(`${parts[0]}-${parts[1]}`);
      }
    } else if (cleanRaw.includes(" ")) {
      const parts = cleanRaw.split(" ").map(p => p.trim());
      if (parts.length === 2 && parts[0].length >= 3 && parts[1].length >= 6) {
        phones.push(`${parts[0]}-${parts[1]}`);
      }
    } else {
      // Direct digits (e.g. 04024193276)
      const digits = cleanRaw.replace(/\D/g, "");
      if (digits.startsWith("0")) {
        let stdLength = 3;
        // In India, STD codes are 3 or 4 digits. If total length is 11 (e.g. 0891 + 7 digits), STD is 4 digits.
        if (digits.length === 11) {
          stdLength = 4;
        } else if (digits.length === 12) {
          stdLength = 5;
        }
        const std = digits.substring(0, stdLength);
        const num = digits.substring(stdLength);
        if (std.length >= 3 && num.length >= 6) {
          phones.push(`${std}-${num}`);
        }
      }
    }
  }

  // Deduplicate
  return [...new Set(phones)];
};

/**
 * Extract email addresses from text and validate them
 */
export const extractEmails = (text, collegeCode = "") => {
  if (!text) return [];
  const emails = [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const invalidExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
  
  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    const email = match[0].trim().toLowerCase();
    
    // Validate email pattern to exclude consecutive dots or file links matching the regex
    if (email.includes("..")) continue;
    if (invalidExtensions.some(ext => email.endsWith(ext))) continue;

    emails.push(email);
  }

  const uniqueEmails = [...new Set(emails)];
  const genericDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "yahoomail.com"];
  const codeLower = collegeCode ? collegeCode.toLowerCase() : "";

  // Split into custom college domain emails and generic emails
  const officialEmails = [];
  const genericEmails = [];

  uniqueEmails.forEach(email => {
    const domain = email.split("@")[1];
    if (genericDomains.includes(domain)) {
      // Keep generic email only if prefix contains the college code or short name
      const prefix = email.split("@")[0];
      if (codeLower && (prefix.includes(codeLower) || codeLower.includes(prefix))) {
        genericEmails.push(email);
      }
    } else {
      officialEmails.push(email);
    }
  });

  // Heuristic: If we found official college-domain emails, reject all generic ones
  if (officialEmails.length > 0) {
    return officialEmails;
  }
  
  // Otherwise, return generic ones that matched the prefix validation
  return genericEmails;
};

/**
 * Extract physical address containing PIN code, district, state
 */
export const extractAddress = (text, sourceUrl = "", pageType = "", fallbackDistrict = "") => {
  if (!text) return null;

  // Indian Pincodes: 6 digits starting with 1-9
  const pincodeRegex = /\b[1-9]\d{2}\s?\d{3}\b/g;
  let match;
  const candidates = [];

  while ((match = pincodeRegex.exec(text)) !== null) {
    const pincodeRaw = match[0];
    const pincodeNormalized = pincodeRaw.replace(/\s/g, "");
    const index = match.index;

    // Grab a context of 200 characters before the pincode
    const startIdx = Math.max(0, index - 200);
    const contextText = text.substring(startIdx, index + pincodeRaw.length + 30);

    // Clean up lines to form a structured address candidate
    const lines = contextText.split("\n").map(l => l.trim()).filter(l => {
      if (!l) return false;
      // Filter out phone numbers/emails
      if (l.includes("@")) return false;
      if (l.replace(/\D/g, "").length >= 10 && !l.includes(pincodeNormalized)) return false;
      // Filter out typical navigation/layout items
      const navbarKeywords = ["mandatory", "student info", "aec & coe", "naac", "recruitment", "admissions", "placements", "facilities", "research", "alumni", "developed by"];
      if (navbarKeywords.some(kw => l.toLowerCase().includes(kw))) return false;
      return true;
    });

    if (lines.length === 0) continue;

    // Take the last few lines ending at or near the pincode line
    let addressLines = [];
    let foundPinLine = false;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes(pincodeRaw)) {
        foundPinLine = true;
      }
      if (foundPinLine) {
        addressLines.unshift(line);
      }
      // Keep up to 4 lines for the address details
      if (addressLines.length >= 4) break;
    }

    const fullAddress = addressLines.join(", ")
      .replace(/,\s*,/g, ",") // Remove duplicate commas
      .replace(/\s+/g, " ")   // Normalize spacing
      .trim();

    if (fullAddress.length < 15) continue;

    const details = parseAddressDetails(fullAddress, fallbackDistrict);

    // Determine confidence
    let confidence = 50;
    if (pageType === "contact" || pageType === "contact-us") {
      confidence = 95;
    } else if (pageType === "home") {
      confidence = 75;
    } else if (pageType === "about" || pageType === "about-us") {
      confidence = 70;
    }

    candidates.push({
      fullAddress: details.fullAddress,
      city: details.city,
      mandal: details.mandal,
      district: details.district,
      state: details.state,
      pincode: details.pincode,
      districtConfidence: details.districtConfidence,
      confidence,
      sourceUrl,
      evidenceText: contextText.trim(),
      extractedAt: new Date()
    });
  }

  if (candidates.length === 0) return null;

  // Sort candidates by confidence descending, then by length descending
  candidates.sort((a, b) => b.confidence - a.confidence || b.fullAddress.length - a.fullAddress.length);
  return candidates[0];
};

/**
 * Parse structured address components (city, mandal, district, state, pincode)
 */
export const parseAddressDetails = (fullAddress, fallbackDistrict) => {
  const cleanAddr = fullAddress.replace(/\s+/g, " ");
  
  // 1. Pincode
  const pinMatch = cleanAddr.match(/\b([1-9]\d{2}\s?\d{3})\b/);
  const pincode = pinMatch ? pinMatch[1].replace(/\s/g, "") : "";

  // 2. State
  let state = "Telangana"; // Default fallback
  if (/andhra\s+pradesh/i.test(cleanAddr)) {
    state = "Andhra Pradesh";
  }

  // 3. Mandal
  let mandal = "";
  const mandalMatch = cleanAddr.match(/\b([a-zA-Z\s]+)\s+Mandal/i);
  if (mandalMatch) {
    mandal = mandalMatch[1].trim().split(",").pop().trim();
  }

  // 4. District & Confidence
  let district = "";
  let districtConfidence = 0;
  const matchedDistrict = TELANGANA_DISTRICTS.find(d => 
    new RegExp(`\\b${d.replace(/\-/g, "\\-")}\\b`, "i").test(cleanAddr)
  );

  if (matchedDistrict) {
    district = matchedDistrict;
    districtConfidence = 95; // Found in address text
  } else {
    district = fallbackDistrict;
    districtConfidence = 50; // Fallback to database district
  }

  // 5. City
  let city = "";
  const majorCities = ["Hyderabad", "Secunderabad", "Warangal", "Hanamkonda", "Karimnagar", "Khammam", "Nizamabad", "Mahabubnagar"];
  const matchedCity = majorCities.find(c => 
    new RegExp(`\\b${c}\\b`, "i").test(cleanAddr)
  );

  if (matchedCity) {
    city = matchedCity;
  } else {
    const parts = cleanAddr.split(",").map(p => p.trim());
    const stateIdx = parts.findIndex(p => new RegExp(state, "i").test(p));
    if (stateIdx > 0) {
      city = parts[stateIdx - 1];
    } else {
      const distIdx = parts.findIndex(p => new RegExp(district, "i").test(p));
      if (distIdx > 0 && parts[distIdx - 1] !== mandal) {
        city = parts[distIdx - 1];
      }
    }
  }

  if (city) {
    city = city.replace(/PIN\s*:\s*\d*/gi, "").replace(/PIN\s*\d*/gi, "").trim();
    if (city.toLowerCase() === mandal.toLowerCase() || city.toLowerCase().includes("mandal") || city.toLowerCase().includes("village")) {
      city = "";
    }
  }

  // Check genuinely valid city == district cases (like Hyderabad)
  const genuinelyValidCityDistricts = ["hyderabad", "karimnagar", "khammam", "nizamabad", "mahabubnagar", "warangal"];
  if (city && district && city.toLowerCase() === district.toLowerCase()) {
    if (!genuinelyValidCityDistricts.includes(district.toLowerCase())) {
      city = ""; // Avoid duplicate name unless valid
    }
  }

  return {
    fullAddress,
    city,
    mandal,
    district,
    state,
    pincode,
    districtConfidence
  };
};

/**
 * Categorize a phone number using surrounding text evidence
 */
export const categorizePhone = (phone, text) => {
  if (!text) return "general";
  const lines = text.split("\n").map(l => l.trim().toLowerCase());
  const digits = phone.replace(/\D/g, "");
  const last7 = digits.slice(-7);

  // Find lines containing the phone number
  const matchingLine = lines.find(line => line.replace(/\D/g, "").includes(last7)) || "";

  const adKeywords = ["admission", "enquiry", "academic", "intake"];
  const plKeywords = ["placement", "cdc", "recruiter", "recruit", "cdc-events"];
  const prKeywords = ["principal", "director", "head of", "dean"];
  const ofKeywords = ["office", "admin", "accounts", "billing", "registrar"];

  if (adKeywords.some(kw => matchingLine.includes(kw))) return "admissions";
  if (plKeywords.some(kw => matchingLine.includes(kw))) return "placements";
  if (prKeywords.some(kw => matchingLine.includes(kw))) return "principal";
  if (ofKeywords.some(kw => matchingLine.includes(kw))) return "office";

  return "general";
};

/**
 * Asynchronously verify social link by fetching titles/og-titles or falling back to URL string matching
 */
export const verifySocialLink = async (url, collegeName, shortName, aliases) => {
  if (!url) return { url: "", verified: false, confidence: 0 };
  
  const namesToCheck = [
    collegeName,
    shortName,
    ...(aliases || [])
  ].filter(Boolean).map(n => n.toLowerCase());

  const urlLower = url.toLowerCase();
  let title = "";
  let fetchedSuccessfully = false;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(4000)
    });

    if (res.status === 200) {
      const html = await res.text();
      const $ = cheerio.load(html);
      title = $("title").text().trim() || $('meta[property="og:title"]').attr("content") || "";
      if (title) fetchedSuccessfully = true;
    }
  } catch (e) {
    // Silent catch, fallback to URL heuristics
  }

  if (fetchedSuccessfully && title) {
    const titleLower = title.toLowerCase();
    const matchesTitle = namesToCheck.some(name => titleLower.includes(name));
    if (matchesTitle) {
      return { url, verified: true, confidence: 95 };
    }
  }

  // Fallback string heuristics on URL slug
  const cleanSlug = urlLower.replace(/https?:\/\/(www\.)?(facebook|instagram|linkedin|youtube|twitter|x)\.com\//i, "");
  const matchesSlug = namesToCheck.some(name => {
    const cleanName = name.replace(/[^a-z0-9]/g, "");
    const cleanSlugAlpha = cleanSlug.replace(/[^a-z0-9]/g, "");
    return cleanSlugAlpha.includes(cleanName) || cleanName.includes(cleanSlugAlpha);
  });

  if (matchesSlug) {
    return { url, verified: true, confidence: 80 };
  }

  return { url, verified: false, confidence: 40 };
};

/**
 * Extract Social Profiles and Google Maps Links from Page HTML
 */
export const extractSocialAndMapsLinks = (html) => {
  if (!html) return { socialLinks: {}, googleMapsUrl: "" };
  const $ = cheerio.load(html);
  
  const socialLinks = {
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    twitter: ""
  };
  let googleMapsUrl = "";

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const url = href.trim();
    const urlLower = url.toLowerCase();

    // Check Google Maps link
    if (urlLower.includes("google.com/maps") || urlLower.includes("maps.google") || urlLower.includes("maps.app.goo.gl")) {
      if (!googleMapsUrl) {
        googleMapsUrl = url;
      }
    }

    // Check Social Media URLs (excluding sharing intents)
    if (urlLower.includes("facebook.com/") && !urlLower.includes("sharer")) {
      if (!socialLinks.facebook) socialLinks.facebook = url;
    } else if (urlLower.includes("instagram.com/")) {
      if (!socialLinks.instagram) socialLinks.instagram = url;
    } else if (urlLower.includes("linkedin.com/") && !urlLower.includes("shareArticle")) {
      if (!socialLinks.linkedin) socialLinks.linkedin = url;
    } else if (urlLower.includes("youtube.com/channel/") || urlLower.includes("youtube.com/c/") || urlLower.includes("youtube.com/user/") || urlLower.includes("youtube.com/@")) {
      if (!socialLinks.youtube) socialLinks.youtube = url;
    } else if ((urlLower.includes("twitter.com/") || urlLower.includes("x.com/")) && !urlLower.includes("intent/tweet") && !urlLower.includes("share")) {
      if (!socialLinks.twitter) socialLinks.twitter = url;
    }
  });

  return { socialLinks, googleMapsUrl };
};
