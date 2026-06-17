import fs from "fs/promises";
import path from "path";

/**
 * Headless static-analysis for Performance Anti-Patterns.
 */
export async function runPerformanceAudit(dirPath) {
  const recommendations = [];
  const files = await fetchFilesRecursively(dirPath);

  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    
    const content = await fs.readFile(file, "utf8");
    const basename = path.basename(file);

    // 1. Un-memoized complex lists
    if (content.match(/\.map\(/) && !content.includes("useMemo")) {
      recommendations.push(`[${basename}] Consider wrapping list mapping inside useMemo if data size is large.`);
    }

    // 2. Heavy imports not code-split
    if (content.includes("import * as") || content.match(/import {.*,.*,.*,.*}/)) {
      recommendations.push(`[${basename}] Large bulk import detected. Consider dynamic import() for code-splitting.`);
    }
    
    // 3. window.location SSR violation
    if (content.includes("window.location.href =") && !content.includes("typeof window")) {
      recommendations.push(`[${basename}] window.location mutation detected without SSR guard. Use useRouter().`);
    }
  }

  return {
    scannedFiles: files.length,
    recommendationsCount: recommendations.length,
    recommendations,
    status: "COMPLETE"
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
