/**
 * Comprehensive API Stress & Load Test for Release Checklist Tool
 *
 * Measures:
 * - Concurrency levels (5, 10, 25, 50 virtual users)
 * - Throughput (RPS)
 * - Error rate
 * - Latency distribution: min, median (p50), p95, p99, max
 * - Read & Write performance
 */

const BASE_URL = process.env.API_URL || "http://localhost:3000/api/graphql";

async function runGraphQL(query, variables = {}) {
  const start = performance.now();
  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const duration = performance.now() - start;
    if (!res.ok) {
      return { success: false, status: res.status, duration };
    }
    const data = await res.json();
    if (data.errors && data.errors.length > 0) {
      return { success: false, error: data.errors[0].message, duration };
    }
    return { success: true, duration, data: data.data };
  } catch (err) {
    return { success: false, error: err.message, duration: performance.now() - start };
  }
}

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { min: 0, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return {
    min: sorted[0],
    p50,
    p95,
    p99,
    max: sorted[sorted.length - 1],
    avg,
  };
}

async function runScenario(scenarioName, requestFn, concurrency, totalRequests) {
  console.log(`\n========================================`);
  console.log(`Running Scenario: ${scenarioName}`);
  console.log(`Concurrency: ${concurrency} VUs | Total Requests: ${totalRequests}`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`========================================`);

  let completed = 0;
  let successful = 0;
  let failed = 0;
  const latencies = [];

  const startTime = performance.now();

  async function worker() {
    while (true) {
      const currentIndex = completed++;
      if (currentIndex >= totalRequests) break;

      const result = await requestFn(currentIndex);
      latencies.push(result.duration);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeSeconds = (performance.now() - startTime) / 1000;
  const stats = calculatePercentiles(latencies);
  const throughput = totalRequests / totalTimeSeconds;
  const errorRate = (failed / totalRequests) * 100;

  console.log(`Results:`);
  console.log(`  Duration:         ${totalTimeSeconds.toFixed(2)}s`);
  console.log(`  Throughput:       ${throughput.toFixed(2)} req/sec`);
  console.log(`  Success / Failed: ${successful} / ${failed}`);
  console.log(`  Error Rate:       ${errorRate.toFixed(2)}%`);
  console.log(`  Latency (avg):    ${stats.avg.toFixed(2)} ms`);
  console.log(`  Latency (p50):    ${stats.p50.toFixed(2)} ms`);
  console.log(`  Latency (p95):    ${stats.p95.toFixed(2)} ms`);
  console.log(`  Latency (p99):    ${stats.p99.toFixed(2)} ms`);
  console.log(`  Latency (max):    ${stats.max.toFixed(2)} ms`);

  return {
    scenarioName,
    concurrency,
    totalRequests,
    durationSeconds: totalTimeSeconds,
    throughputRps: throughput,
    successful,
    failed,
    errorRate,
    stats,
  };
}

async function main() {
  console.log(`Initiating ReleaseCheck GraphQL API Stress Test...`);

  // Verify API health
  const healthCheck = await runGraphQL(`query { releases { id name } }`);
  if (!healthCheck.success) {
    console.error(`Health check failed! Ensure target API is running:`, healthCheck.error);
    process.exit(1);
  }
  console.log(`API reachable. Active releases count:`, healthCheck.data.releases.length);

  const readQuery = `
    query StressReadReleases {
      releases {
        id
        name
        date
        status
        additionalInfo
        completedSteps
        checklist {
          id
          label
          completed
        }
      }
    }
  `;

  const results = [];

  // Concurrency profile for reads: 5 -> 10 -> 25 -> 50 VUs
  for (const concurrency of [5, 10, 25, 50]) {
    const res = await runScenario(
      `GraphQL Query: releases (${concurrency} VUs)`,
      () => runGraphQL(readQuery),
      concurrency,
      concurrency * 10
    );
    results.push(res);
  }

  // Write scenario: controlled mutation test with cleanup
  console.log(`\nTesting Write Mutation under concurrency...`);
  const createdIds = [];
  const writeRes = await runScenario(
    `GraphQL Mutation: createRelease (10 VUs)`,
    async (idx) => {
      const res = await runGraphQL(
        `
        mutation StressCreateRelease($input: CreateReleaseInput!) {
          createRelease(input: $input) {
            id
          }
        }
      `,
        {
          input: {
            name: `Stress Test Release ${idx}-${Date.now()}`,
            date: new Date().toISOString(),
            additionalInfo: "Automated load benchmark record",
            completedSteps: ["pr_merged", "tests_passing"],
          },
        }
      );
      if (res.success && res.data?.createRelease?.id) {
        createdIds.push(res.data.createRelease.id);
      }
      return res;
    },
    10,
    30
  );
  results.push(writeRes);

  // Cleanup created stress-test records
  console.log(`Cleaning up ${createdIds.length} benchmark records...`);
  for (const id of createdIds) {
    await runGraphQL(`mutation Clean($id: ID!) { deleteRelease(id: $id) }`, { id });
  }
  console.log(`Cleanup complete.`);

  console.log(`\n========================================`);
  console.log(`ALL LOAD TESTS COMPLETED SUCCESSFULLY`);
  console.log(`========================================`);
}

main().catch((err) => {
  console.error("Stress test execution failed:", err);
  process.exit(1);
});
