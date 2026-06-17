import fs from "fs/promises";
import path from "path";

/**
 * Headless heuristic check for Bundle sizes
 */
export async function runBundleAnalysis(dirPath) {
  const issues = [];
  const files = await fetchFilesRecursively(dirPath);

  for (const file of files) {
    if (!file.endsWith('.js') && !file.endsWith('.jsx')) continue;
    
    const content = await fs.readFile(file, "utf8");
    const basename = path.basename(file);

    // Tree-shaking violations
    if (content.includes("import * as _ from 'lodash'") || content.includes("import _ from 'lodash'")) {
      issues.push(`[${basename}] Heavy lodash import detected. Use named imports or lodash-es for tree-shaking.`);
    }
    
    if (content.includes("import moment from 'moment'")) {
      issues.push(`[${basename}] Moment.js is massive. Consider migrating to date-fns or dayjs.`);
    }
  }

  return {
    scannedFiles: files.length,
    bundleIssuesCount: issues.length,
    issues,
    status: issues.length === 0 ? "OPTIMIZED" : "ATTENTION_REQUIRED"
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
