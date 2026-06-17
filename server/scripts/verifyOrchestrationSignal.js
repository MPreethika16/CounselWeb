// server/scripts/verifyOrchestrationSignal.js
// This script verifies that the SIGINT/SIGTERM graceful shutdown works correctly.
// It starts the server as a child process, sends a shutdown signal, waits for exit,
// and then writes JSON reports indicating success/failure.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '../../'); // project root (counselweb-clean)
const serverPath = path.join(projectRoot, 'server', 'server.js');

function writeReport(fileName, data) {
  const reportPath = path.join(projectRoot, fileName);
  fs.writeFileSync(reportPath, JSON.stringify(data, null, 2), 'utf8');
}

(async () => {
  console.log('Starting server for signal verification...');
  const child = spawn('node', [serverPath], {
    cwd: projectRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Capture any error output for the report
  let stderr = '';
  child.stderr.on('data', (chunk) => (stderr += chunk.toString()));

  // Wait for the server to start listening (simple delay)
  await new Promise((res) => setTimeout(res, 2000));

  console.log('Sending SIGINT to server...');
  child.kill('SIGINT');

  const exitCode = await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code));
  });

  const report = {
    description: 'Graceful shutdown verification via SIGINT signal',
    exitCode,
    stderr: stderr.trim(),
    passed: exitCode === 0 && !stderr.includes('Error'),
    timestamp: new Date().toISOString()
  };

  writeReport('orchestration-signal-report.json', report);

  // Simple verification summary
  const verification = {
    status: report.passed ? 'PASS' : 'FAIL',
    details: report.passed ? 'Server exited cleanly and no errors were logged.' : 'Server exit failed or errors were logged.',
    timestamp: new Date().toISOString()
  };
  writeReport('orchestration-signal-verification.json', verification);

  console.log('Verification complete. Reports generated.');
})();
