import { LOAD_EVENT_ID, LOAD_USERNAME, loadTestPassword } from "./load-test-config.mjs";

const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const password = loadTestPassword();
const phaseSeconds = Math.max(10, Number(process.env.LOAD_TEST_PHASE_SECONDS) || 30);
const phases = (process.env.LOAD_TEST_USERS || "5,10,30").split(",").map(Number)
  .filter((value) => Number.isInteger(value) && value > 0 && value <= 1000);
if (!phases.length) throw new Error("LOAD_TEST_USERS geÃ§ersiz.");

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: LOAD_USERNAME, password }),
});
if (!login.ok) throw new Error(`GiriÅŸ baÅŸarÄ±sÄ±z: ${login.status}`);
const cookie = login.headers.get("set-cookie")?.split(";")[0];
if (!cookie) throw new Error("Oturum cookie'si alÄ±namadÄ±.");

const createMetrics = () => ({ durations: [], requests: 0, failures: 0, failuresByReason: {} });
const recordFailure = (metrics, reason) => {
  metrics.failures++;
  metrics.failuresByReason[reason] = (metrics.failuresByReason[reason] || 0) + 1;
};
const request = async (path, metrics, options = {}) => {
  const started = performance.now();
  try {
    const url = /^https?:\/\//i.test(path) ? path : `${base}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: { cookie, ...options.headers },
      signal: AbortSignal.timeout(15_000),
    });
    metrics.durations.push(performance.now() - started);
    metrics.requests++;
    if (!response.ok) {
      recordFailure(metrics, `HTTP ${response.status}`);
      return null;
    }
    return response;
  } catch (error) {
    metrics.durations.push(performance.now() - started);
    metrics.requests++;
    recordFailure(metrics, error?.name === "TimeoutError" ? "timeout" : "network");
    return null;
  }
};

async function scenario(deadline, metrics) {
  while (Date.now() < deadline) {
    const first = await request(`/api/admin/weddings/${LOAD_EVENT_ID}/media?limit=24&sort=new`, metrics);
    if (!first) continue;
    const page = await first.json();
    if (page.nextCursor)
      await request(`/api/admin/weddings/${LOAD_EVENT_ID}/media?limit=24&sort=new&cursor=${encodeURIComponent(page.nextCursor)}`, metrics);
    await request(`/api/admin/weddings/${LOAD_EVENT_ID}/media?limit=24&type=photo&sort=new`, metrics);
    await request(`/api/admin/weddings/${LOAD_EVENT_ID}/media?limit=24&search=Misafir%20250&sort=new`, metrics);
    if (page.items?.[0]?.preview_url) await request(page.items[0].preview_url, metrics);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const summarize = (metrics, seconds) => {
  const durations = [...metrics.durations].sort((a, b) => a - b);
  const percentile = (ratio) => durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))] || 0;
  return {
    requests: metrics.requests,
    failures: metrics.failures,
    failuresByReason: metrics.failuresByReason,
    errorRate: metrics.requests ? Number(((metrics.failures / metrics.requests) * 100).toFixed(2)) : 0,
    requestsPerSecond: Number((metrics.requests / seconds).toFixed(2)),
    latencyMs: {
      p50: Math.round(percentile(0.5)),
      p95: Math.round(percentile(0.95)),
      p99: Math.round(percentile(0.99)),
      max: Math.round(durations.at(-1) || 0),
    },
  };
};

const total = createMetrics();
const phaseResults = [];
for (const users of phases) {
  console.log(`Faz: ${users} eÅŸzamanlÄ± kullanÄ±cÄ±, ${phaseSeconds} saniye`);
  const metrics = createMetrics();
  const deadline = Date.now() + phaseSeconds * 1000;
  await Promise.all(Array.from({ length: users }, () => scenario(deadline, metrics)));
  total.durations.push(...metrics.durations);
  total.requests += metrics.requests;
  total.failures += metrics.failures;
  for (const [reason, count] of Object.entries(metrics.failuresByReason))
    total.failuresByReason[reason] = (total.failuresByReason[reason] || 0) + count;
  const result = { users, ...summarize(metrics, phaseSeconds) };
  phaseResults.push(result);
  console.log(`Faz sonucu: ${JSON.stringify(result)}`);
}

const report = {
  base,
  eventId: LOAD_EVENT_ID,
  phaseSeconds,
  phases: phaseResults,
  total: summarize(total, phaseSeconds * phases.length),
};
console.log(JSON.stringify(report, null, 2));
const p95Limit = Number(process.env.LOAD_TEST_P95_LIMIT_MS) || 750;
const errorRateLimit = Number(process.env.LOAD_TEST_ERROR_RATE_LIMIT) || 1;
if (phaseResults.some((phase) => phase.errorRate >= errorRateLimit || phase.latencyMs.p95 >= p95Limit))
  process.exitCode = 1;
