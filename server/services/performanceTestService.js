/**
 * Internal load-generator and latency measuring utility.
 */

export async function measureLatency(fn, iterations = 10) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    times.push(durationMs);
  }

  times.sort((a, b) => a - b);
  
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  return { p50, p95, p99, times };
}

export async function stressTest(fn, concurrentLevel) {
  const promises = [];
  const start = process.hrtime.bigint();
  
  let failures = 0;

  for (let i = 0; i < concurrentLevel; i++) {
    promises.push(
      fn().catch(() => { failures++; })
    );
  }

  await Promise.all(promises);
  
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  const memUsage = process.memoryUsage();

  return {
    concurrentLevel,
    durationMs,
    failures,
    heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024)
  };
}
