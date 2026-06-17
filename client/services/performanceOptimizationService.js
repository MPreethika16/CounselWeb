import fs from "fs/promises";
import path from "path";

/**
 * Headless static-analysis for enforcing React Optimization strategies
 */
export async function auditPerformanceOptimizations(dirPath) {
  const recommendations = [];
  const files = await fetchFilesRecursively(dirPath);

  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    
    const content = await fs.readFile(file, "utf8");
    const basename = path.basename(file);

    // 1. Missing React.memo on stateless primitives
    if (content.includes("export default function") && !content.includes("useApi") && !content.includes("useContext") && !content.includes("React.memo")) {
      recommendations.push(`[${basename}] Pure visual component lacks React.memo, exposing it to wasteful parent rerenders.`);
    }

    // 2. Missing useCallback on inline functions passed to children
    if (content.match(/=\s*\(\)\s*=>\s*{/) && content.includes("onAction=") && !content.includes("useCallback")) {
      recommendations.push(`[${basename}] Inline arrow function passed as prop. Wrap in useCallback to preserve referential equality.`);
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
