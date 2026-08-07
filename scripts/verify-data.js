/*
  Contour — mock data consistency verification (M1)

  Independently re-derives figures from the SHIPPED /data/*.json files and
  diffs them against the values those same files claim, rather than trusting
  the generator's own arithmetic. Exits non-zero and prints failures if any
  check fails.

  Run: node scripts/verify-data.js
*/
const fs = require("fs");
const path = require("path");
const dataDir = path.join(__dirname, "..", "data");
const load = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));

const kpis = load("kpis.json");
const timeseries = load("timeseries.json");
const customersFile = load("customers.json");
const transactionsFile = load("transactions.json");
const activity = load("activity.json");
const nav = load("nav.json");

let failures = 0;
let checks = 0;
function check(label, pass, detail) {
  checks += 1;
  if (!pass) {
    failures += 1;
    console.log(`FAIL  ${label}${detail ? " — " + detail : ""}`);
  } else {
    console.log(`OK    ${label}${detail ? " — " + detail : ""}`);
  }
}
function approxEqual(a, b, tolerancePct) {
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) * 100 <= tolerancePct;
}

// ---------------------------------------------------------------------------
// 1. Customer roster counts must exactly match KPI snapshot
// ---------------------------------------------------------------------------
const rows = customersFile.rows;
check("customers.json meta.total matches array length", customersFile.meta.total === rows.length,
  `meta=${customersFile.meta.total} actual=${rows.length}`);

const activeRows = rows.filter((c) => c.status === "active");
const kpiToday = kpis.ranges.find((r) => r.range === "today");
check(
  "Active customer row count === KPI 'customers.current' (today range)",
  activeRows.length === kpiToday.customers.current,
  `rows=${activeRows.length} kpi=${kpiToday.customers.current}`
);

const validStatuses = new Set(["active", "trial", "past_due", "cancelled"]);
check("All customer statuses are within the defined enum", rows.every((c) => validStatuses.has(c.status)));
check("No negative MRR values", rows.every((c) => c.mrr >= 0));

// ---------------------------------------------------------------------------
// 2. Blended ARPU consistency: revenue KPI should be explainable by
//    (active customers × blended monthly ARPU), within noise tolerance
// ---------------------------------------------------------------------------
const blendedARPU = activeRows.reduce((s, c) => s + c.mrr, 0) / activeRows.length;
const kpi30 = kpis.ranges.find((r) => r.range === "30d");
const impliedMonthlyRevenue = kpiToday.customers.current * blendedARPU;
check(
  "30d revenue is within 10% of (active customers × blended ARPU)",
  approxEqual(kpi30.revenue.current, impliedMonthlyRevenue, 10),
  `kpi=${kpi30.revenue.current} implied=${impliedMonthlyRevenue.toFixed(0)} blendedARPU=${blendedARPU.toFixed(2)}`
);

// ---------------------------------------------------------------------------
// 3. Re-derive today/7d/30d/90d KPIs directly from the shipped daily
//    timeseries (independent of the generator's in-memory computation)
// ---------------------------------------------------------------------------
const daily = timeseries.daily; // last 90 days
function sliceLast(n) {
  return daily.slice(daily.length - n);
}
function sumKey(arr, key) {
  return arr.reduce((s, r) => s + r[key], 0);
}
for (const [rangeId, n] of [["today", 1], ["7d", 7], ["30d", 30], ["90d", 90]]) {
  const kpiRange = kpis.ranges.find((r) => r.range === rangeId);
  const rows90 = sliceLast(n);
  const recomputedRevenue = sumKey(rows90, "revenue");
  const recomputedSessions = sumKey(rows90, "sessions");
  const recomputedCustomers = rows90[rows90.length - 1].activeCustomers;
  check(
    `${rangeId}: recomputed revenue from daily[] matches kpis.json`,
    recomputedRevenue === kpiRange.revenue.current,
    `recomputed=${recomputedRevenue} kpi=${kpiRange.revenue.current}`
  );
  check(
    `${rangeId}: recomputed traffic from daily[] matches kpis.json`,
    recomputedSessions === kpiRange.traffic.current,
    `recomputed=${recomputedSessions} kpi=${kpiRange.traffic.current}`
  );
  check(
    `${rangeId}: recomputed active-customers snapshot matches kpis.json`,
    recomputedCustomers === kpiRange.customers.current,
    `recomputed=${recomputedCustomers} kpi=${kpiRange.customers.current}`
  );
}

// ---------------------------------------------------------------------------
// 4. 12-month range cross-checked against the monthly rollup (daily[] only
//    retains 90 days, so 365-day totals can only be verified via monthly[])
// ---------------------------------------------------------------------------
const kpi12mo = kpis.ranges.find((r) => r.range === "12mo");
const monthly = timeseries.monthly;
const monthlyRevenueSum = sumKey(monthly, "revenue");
const monthlySessionsSum = sumKey(monthly, "sessions");
check(
  "12mo revenue: sum(monthly[].revenue) matches kpis.json within 1%",
  approxEqual(monthlyRevenueSum, kpi12mo.revenue.current, 1),
  `monthly-sum=${monthlyRevenueSum} kpi=${kpi12mo.revenue.current}`
);
check(
  "12mo traffic: sum(monthly[].sessions) matches kpis.json within 1%",
  approxEqual(monthlySessionsSum, kpi12mo.traffic.current, 1),
  `monthly-sum=${monthlySessionsSum} kpi=${kpi12mo.traffic.current}`
);
check(
  "12mo customers: last monthly bucket matches kpis.json current snapshot",
  monthly[monthly.length - 1].activeCustomers === kpi12mo.customers.current
);

// ---------------------------------------------------------------------------
// 5. Transactions must reference real customers and match plan pricing
// ---------------------------------------------------------------------------
const customerById = new Map(rows.map((c) => [c.id, c]));
const planPrices = { Starter: 29, Growth: 99, Scale: 299 };
const txRows = transactionsFile.rows;
check("transactions.json meta.total matches array length", transactionsFile.meta.total === txRows.length);
check(
  "Every transaction references an existing customer",
  txRows.every((t) => customerById.has(t.customerId))
);
check(
  "Every transaction amount matches its stated plan's price (± refund sign)",
  txRows.every((t) => Math.abs(t.amount) === planPrices[t.plan])
);
check(
  "No transaction references a trial customer (trials don't get billed)",
  txRows.every((t) => customerById.get(t.customerId).status !== "trial")
);

// ---------------------------------------------------------------------------
// 6. Activity feed dates fall within its stated recent window and reference
//    real people/companies from the customer roster
// ---------------------------------------------------------------------------
const customerNames = new Set(rows.map((c) => c.name));
check(
  "All activity entries reference a name present in customers.json",
  activity.rows.every((a) => customerNames.has(a.customerName))
);
const sortedDesc = activity.rows.every(
  (a, i) => i === 0 || activity.rows[i - 1].date >= a.date
);
check("Activity feed is sorted most-recent-first", sortedDesc);

// ---------------------------------------------------------------------------
// 7. Navigation config completeness
// ---------------------------------------------------------------------------
const expectedSections = ["overview", "analytics", "customers", "transactions", "reports", "settings"];
check(
  "nav.json contains exactly the six approved sections, in order",
  JSON.stringify(nav.sections.sort((a, b) => a.order - b.order).map((s) => s.id)) ===
    JSON.stringify(expectedSections)
);

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures > 0) {
  console.log(`${failures} FAILURE(S) — see above.`);
  process.exit(1);
}
