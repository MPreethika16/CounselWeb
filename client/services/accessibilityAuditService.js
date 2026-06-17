import fs from "fs/promises";
import path from "path";

/**
 * Headless static-analysis for WCAG compliance.
 */
export async function runAccessibilityAudit(dirPath) {
  const issues = [];
  const files = await fetchFilesRecursively(dirPath);

  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    
    const content = await fs.readFile(file, "utf8");
    const basename = path.basename(file);

    // 1. Missing alt tags
    if (content.match(/<img(?![^>]*alt=)/)) {
      issues.push(`[${basename}] <img> missing 'alt' attribute.`);
    }

    // 2. Buttons without readable text or aria-label
    if (content.match(/<button(?![^>]*aria-label=)[^>]*>\s*<\s*\/\s*button>/)) {
      issues.push(`[${basename}] <button> is empty and missing 'aria-label'.`);
    }

    // 3. Inputs missing associated labels or aria-labels
    if (content.match(/<input(?![^>]*aria-label=)(?![^>]*id=)/)) {
      issues.push(`[${basename}] <input> missing 'id' or 'aria-label' for screen readers.`);
    }
  }

  return {
    scannedFiles: files.length,
    issuesCount: issues.length,
    issues,
    status: issues.length === 0 ? "PASS" : "FAIL"
  };
}

async function fetchFilesRecursively(dir) {
  let results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const file of list) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(await fetchFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}
