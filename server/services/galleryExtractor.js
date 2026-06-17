import * as cheerio from "cheerio";
import probe from "probe-image-size";

// Keywords for classification
const CATEGORIES = {
  classroom: ["classroom", "class-room", "lecture-hall", "lecture-room", "bench", "desk", "blackboard", "whiteboard", "smartboard"],
  library: ["library", "books", "reading-room", "journal", "bookshelf", "librarian"],
  laboratory: ["lab", "laboratory", "physics-lab", "chemistry-lab", "computer-lab", "workshop", "equipment", "apparatus", "computers", "server-room"],
  hostel: ["hostel", "mess", "dining-hall", "dorm", "canteen", "cafeteria", "room-sharing"],
  auditorium: ["auditorium", "seminar-hall", "conference-hall", "stage", "convention", "seminar"],
  sports: ["sports", "ground", "playground", "gym", "cricket", "football", "volleyball", "basketball", "stadium", "court", "athletics"],
  building: ["building", "block", "admin-block", "academic-block", "tower", "structure", "facade", "main-block"],
  campus: ["campus", "entrance", "gate", "lawn", "garden", "fountain", "portico", "yard", "greenery"]
};

// Blacklist tokens for quality filtering
const QUALITY_BLACKLIST = ["logo", "icon", "favicon", "facebook", "twitter", "linkedin", "youtube", "instagram"];

/**
 * Clean and normalize image url
 */
const normalizeUrl = (src, baseUrl) => {
  if (!src) return null;
  try {
    return new URL(src.trim(), baseUrl).toString();
  } catch (e) {
    return null;
  }
};

/**
 * Extract images from html source using cheerio
 */
export const extractImagesFromHtml = (html, baseUrl) => {
  if (!html) return [];
  const $ = cheerio.load(html);
  const imagesFound = [];

  // 1. Parse img tags
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    const alt = $(el).attr("alt") || "";
    const resolved = normalizeUrl(src, baseUrl);
    if (resolved) {
      imagesFound.push({ url: resolved, alt, source: "img_tag" });
    }
  });

  // 2. Parse picture/source tags
  $("picture source, source").each((_, el) => {
    const srcset = $(el).attr("srcset");
    const alt = $(el).parent().find("img").attr("alt") || "";
    if (srcset) {
      // Split srcset by commas and extract URL
      const urls = srcset.split(",").map(part => part.trim().split(/\s+/)[0]);
      urls.forEach(src => {
        const resolved = normalizeUrl(src, baseUrl);
        if (resolved) {
          imagesFound.push({ url: resolved, alt, source: "picture_tag" });
        }
      });
    }
  });

  // 3. Parse inline style attributes for background-image
  $("[style]").each((_, el) => {
    const style = $(el).attr("style");
    if (style && /background-image/i.test(style)) {
      const match = style.match(/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/i);
      if (match && match[1]) {
        const resolved = normalizeUrl(match[1], baseUrl);
        if (resolved) {
          imagesFound.push({ url: resolved, alt: "", source: "inline_style" });
        }
      }
    }
  });

  // 4. Parse style tags for background-image CSS
  $("style").each((_, el) => {
    const css = $(el).text();
    const matches = css.matchAll(/background-image\s*:\s*url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi);
    for (const match of matches) {
      if (match[1]) {
        const resolved = normalizeUrl(match[1], baseUrl);
        if (resolved) {
          imagesFound.push({ url: resolved, alt: "", source: "style_tag" });
        }
      }
    }
  });

  // 5. Parse <a> tags ending in image extensions (lightbox galleries)
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href && /\.(jpe?g|png|webp|jfif)(\?.*)?$/i.test(href)) {
      const resolved = normalizeUrl(href, baseUrl);
      if (resolved) {
        const alt = $(el).attr("title") || $(el).attr("alt") || $(el).text().trim() || "";
        imagesFound.push({ url: resolved, alt, source: "anchor_lightbox" });
      }
    }
  });

  // 6. Parse any tags with lazy-loading/data attributes
  const dataAttrs = ["data-src", "data-lazy", "data-lazy-src", "data-original", "data-zoom", "data-large-img", "data-slide"];
  const selector = dataAttrs.map(attr => `[${attr}]`).join(", ");
  $(selector).each((_, el) => {
    dataAttrs.forEach(attr => {
      const val = $(el).attr(attr);
      if (val) {
        const resolved = normalizeUrl(val, baseUrl);
        if (resolved) {
          const alt = $(el).attr("alt") || $(el).attr("title") || "";
          imagesFound.push({ url: resolved, alt, source: `lazy_${attr}` });
        }
      }
    });
  });

  return imagesFound;
};

/**
 * Apply fast quality rules and regex checks
 */
export const filterImageByMetadata = (imageUrl, altText = "", pageTitle = "") => {
  const urlLower = imageUrl.toLowerCase();
  const altLower = altText.toLowerCase();
  const titleLower = pageTitle.toLowerCase();
  
  // 1. Reject GIFs
  if (urlLower.includes(".gif") || urlLower.endsWith(".gif")) {
    return { accepted: false, reason: "gif_rejected" };
  }

  // 2. Extract filename
  let filename = "";
  try {
    const pathParts = new URL(imageUrl).pathname.split("/");
    filename = pathParts[pathParts.length - 1].toLowerCase();
  } catch (e) {
    filename = urlLower;
  }

  // 3. Reject quality blacklist tokens
  const matchesBlacklist = QUALITY_BLACKLIST.some(token => 
    urlLower.includes(token) || filename.includes(token)
  );

  if (matchesBlacklist) {
    return { accepted: false, reason: "blacklist_token" };
  }

  // 4. Reject promotional images
  const PROMOTIONAL_KEYWORDS = [
    "poster", "webposter", "seminar", "conference", "workshop", 
    "placement-drive", "recruitment", "admission", "event", 
    "notification", "gate", "hackathon", "webinar", "results", "exam"
  ];
  const matchesPromo = PROMOTIONAL_KEYWORDS.some(kw => 
    urlLower.includes(kw) || 
    filename.includes(kw) || 
    altLower.includes(kw) || 
    titleLower.includes(kw)
  );

  if (matchesPromo) {
    return { accepted: false, reason: "promotional_rejected" };
  }

  return { accepted: true };
};

/**
 * Perform network size validation using probe-image-size
 */
export const checkImageDimensions = async (imageUrl, timeoutMs = 4000) => {
  try {
    const result = await probe(imageUrl, { timeout: timeoutMs });
    if (result.width >= 400 && result.height >= 300) {
      return { valid: true, width: result.width, height: result.height };
    }
    return { valid: false, reason: `dimensions_too_small (${result.width}x${result.height})` };
  } catch (e) {
    return { valid: false, reason: `probe_failed (${e.message})` };
  }
};

/**
 * Score images based on quality and relevance keywords
 */
export const calculateImageScore = (imageUrl, altText = "", pageTitle = "", sourcePageUrl = "") => {
  const urlLower = imageUrl.toLowerCase();
  const altLower = altText.toLowerCase();
  const titleLower = pageTitle.toLowerCase();
  const sourceLower = sourcePageUrl.toLowerCase();
  
  let filename = "";
  try {
    const pathParts = new URL(imageUrl).pathname.split("/");
    filename = pathParts[pathParts.length - 1].toLowerCase();
  } catch (e) {
    filename = urlLower;
  }

  const combinedText = `${urlLower} ${filename} ${altLower} ${titleLower}`;

  let score = 0;

  // Positive scoring
  const BUILDING_KWS = ["building", "block", "admin-block", "academic-block", "tower", "structure", "facade", "main-block"];
  const CAMPUS_KWS = ["campus", "entrance", "gate", "lawn", "garden", "fountain", "portico", "yard", "greenery"];
  const INFRASTRUCTURE_KWS = [
    "classroom", "class-room", "lecture-hall", "lecture-room", "bench", "desk", "blackboard", "whiteboard", "smartboard",
    "library", "books", "reading-room", "journal", "bookshelf", "librarian",
    "lab", "laboratory", "physics-lab", "chemistry-lab", "computer-lab", "workshop", "equipment", "apparatus", "computers", "server-room",
    "hostel", "mess", "dining-hall", "dorm", "canteen", "cafeteria", "room-sharing",
    "auditorium", "seminar-hall", "conference-hall", "stage", "convention", "seminar",
    "sports", "ground", "playground", "gym", "cricket", "football", "volleyball", "basketball", "stadium", "court", "athletics",
    "facilities", "infrastructure"
  ];

  const hasBuilding = BUILDING_KWS.some(kw => combinedText.includes(kw));
  if (hasBuilding) score += 40;

  const hasCampus = CAMPUS_KWS.some(kw => combinedText.includes(kw));
  if (hasCampus) score += 30;

  const hasInfra = INFRASTRUCTURE_KWS.some(kw => combinedText.includes(kw));
  if (hasInfra) score += 20;

  const isGalleryPage = sourceLower.includes("/gallery") || titleLower.includes("gallery");
  if (isGalleryPage) score += 15;

  const isFacilitiesPage = sourceLower.includes("/facilities") || 
                            sourceLower.includes("/infrastructure") || 
                            titleLower.includes("facilities") || 
                            titleLower.includes("infrastructure");
  if (isFacilitiesPage) score += 15;

  // Priority Path Boost (+25)
  const priorityPaths = ["/gallery", "/campus", "/hostel", "/facilities", "/infrastructure", "/library", "/sports"];
  const hasPriorityPath = priorityPaths.some(path => sourceLower.includes(path));
  if (hasPriorityPath) {
    score += 25;
  }

  // Negative scoring
  const POSTER_KWS = ["poster", "webposter", "admission", "notification", "results", "exam", "gate"];
  const BANNER_KWS = ["banner", "webbanner", "slider"];
  const EVENT_KWS = ["event", "seminar", "conference", "workshop", "placement-drive", "recruitment", "hackathon", "webinar"];

  const hasPoster = POSTER_KWS.some(kw => combinedText.includes(kw));
  if (hasPoster) score -= 50;

  const hasBanner = BANNER_KWS.some(kw => combinedText.includes(kw));
  if (hasBanner) score -= 50;

  const hasEvent = EVENT_KWS.some(kw => combinedText.includes(kw));
  if (hasEvent) score -= 50;

  return score;
};

/**
 * Classify images based on keywords found in alt text, filename, url path, and page title
 */
export const classifyImage = (imageUrl, altText = "", pageTitle = "") => {
  const urlLower = imageUrl.toLowerCase();
  const altLower = altText.toLowerCase();
  const titleLower = pageTitle.toLowerCase();
  
  let filename = "";
  try {
    const pathParts = new URL(imageUrl).pathname.split("/");
    filename = pathParts[pathParts.length - 1].toLowerCase();
  } catch (e) {
    filename = urlLower;
  }

  let bestCategory = "other";
  let maxConfidence = 40;

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    let score = 0;
    
    // Check alt text (highest weight)
    const matchesAlt = keywords.some(kw => altLower.includes(kw));
    if (matchesAlt) score += 40;

    // Check filename
    const matchesFile = keywords.some(kw => filename.includes(kw));
    if (matchesFile) score += 30;

    // Check url path
    const matchesPath = keywords.some(kw => urlLower.includes(kw));
    if (matchesPath) score += 20;

    // Check page title / context
    const matchesTitle = keywords.some(kw => titleLower.includes(kw));
    if (matchesTitle) score += 15;

    if (score > 0) {
      const confidence = Math.min(100, 50 + score);
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestCategory = category;
      }
    }
  }

  return { category: bestCategory, confidence: maxConfidence };
};
