/*
  Contour — mock data generator (dev-time tool, not shipped to the runtime app)

  Produces /data/*.json from a small set of deliberately-chosen business
  parameters, so every number the dashboard displays is DERIVED from one
  consistent model rather than hand-typed in five different places.

  Run: node scripts/generate-data.js
  Deterministic: fixed PRNG seed, so re-running reproduces identical output.
*/

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) — same seed always produces the same data
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(88771155);
const randRange = (min, max) => min + rand() * (max - min);
const randInt = (min, max) => Math.floor(randRange(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const weightedPick = (items) => {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items[items.length - 1];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const END_DATE = new Date("2026-08-06T00:00:00Z"); // "today" for this dataset
const DAYS = 730; // 2 full years of daily data — required to compute a
// true previous-period comparison for the 12-month range (365 + 365)

const PLANS = [
  { id: "starter", label: "Starter", price: 29, weight: 0.55 },
  { id: "growth", label: "Growth", price: 99, weight: 0.35 },
  { id: "scale", label: "Scale", price: 299, weight: 0.1 },
];

const ACTIVE_COUNT = 3140;
const TRIAL_COUNT = 140;
const PAST_DUE_COUNT = 70;
const CANCELLED_COUNT = 50;
const TOTAL_CUSTOMERS = ACTIVE_COUNT + TRIAL_COUNT + PAST_DUE_COUNT + CANCELLED_COUNT;

const WORKSPACE = { name: "Bramwell", owner: "Dana Whitfield", role: "Head of Growth" };

function dateAt(dayIndex) {
  // dayIndex 0 = oldest day, DAYS-1 = END_DATE
  const d = new Date(END_DATE);
  d.setUTCDate(d.getUTCDate() - (DAYS - 1 - dayIndex));
  return d;
}
function iso(date) {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Name / company pools (fictional, deliberately generic — no real entities)
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Maya","Owen","Priya","Leo","Nadia","Theo","Elena","Marcus","Ines","Sam",
  "Rosa","Finn","Ada","Julian","Nora","Caleb","Sofia","Miles","Ivy","Dante",
  "Wren","August","Talia","Rhys","Bianca","Cyrus","Lucia","Emmett","Zara","Silas",
];
const LAST_NAMES = [
  "Okafor","Bergström","Nakamura","Falkner","Reyes","Whitlock","Adeyemi","Marsh","Kowalski","Doyle",
  "Vance","Ibarra","Solberg","Choudhury","Faulk","Renner","Osei","Kovac","Lindqvist","Ferreira",
  "Bram","Castel","Njoroge","Aldrich","Pham","Sorel","Whitfield","Marchetti","Tanaka","Corbin",
];
const COMPANY_PREFIX = [
  "Alder","Northbridge","Fernway","Hollow","Kestrel","Marrow","Thistle","Brightwell","Cobalt","Sable",
  "Windrow","Cinder","Elmhurst","Palisade","Amberlane","Driftwood","Granite","Larkspur","Mossgate","Rowan",
];
const COMPANY_SUFFIX = [
  "& Co","Studio","Logistics","Supply Co","Labs","Works","Collective","Partners","Group","Goods",
  "Digital","Provisions","Freight","Robotics","Media","Foundry","Analytics","Outfitters","Ventures","Systems",
];
function randomName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}
function randomCompany() {
  return `${pick(COMPANY_PREFIX)} ${pick(COMPANY_SUFFIX)}`;
}
function emailFor(name, company) {
  const [first, last] = name.toLowerCase().split(" ");
  const domain = company.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
  return `${first}.${last}@${domain}`;
}

// ---------------------------------------------------------------------------
// 1. Customer roster — this is the source of truth for the "Active Customers"
//    KPI (its count) and the "Revenue" KPI (its blended ARPU).
// ---------------------------------------------------------------------------
function buildCustomers() {
  const rows = [];
  let seq = 1;

  function pushRow(status, planOverride) {
    const name = randomName();
    const company = randomCompany();
    const plan = planOverride || weightedPick(PLANS);
    // Recent-weighted join date: businesses grew over time, so later days
    // are more likely join dates (mirrors the customersCurve growth shape).
    const growthWeighted = Math.pow(rand(), 0.55); // skews toward 1 (recent)
    const joinDayIndex = Math.min(DAYS - 1, Math.floor(growthWeighted * (DAYS - 1)));
    const joinDate = iso(dateAt(joinDayIndex));

    let mrr = 0;
    let lastActiveDayIndex = DAYS - 1;
    if (status === "active") {
      mrr = plan.price;
      lastActiveDayIndex = randInt(Math.max(joinDayIndex, DAYS - 14), DAYS - 1);
    } else if (status === "trial") {
      mrr = 0;
      lastActiveDayIndex = randInt(Math.max(joinDayIndex, DAYS - 10), DAYS - 1);
    } else if (status === "past_due") {
      mrr = plan.price;
      lastActiveDayIndex = randInt(Math.max(joinDayIndex, DAYS - 21), DAYS - 3);
    } else if (status === "cancelled") {
      mrr = 0;
      lastActiveDayIndex = randInt(joinDayIndex, DAYS - 5);
    }

    rows.push({
      id: `CUS-${String(seq).padStart(5, "0")}`,
      name,
      email: emailFor(name, company),
      company,
      plan: plan.id,
      planLabel: plan.label,
      mrr,
      status,
      joinDate,
      lastActive: iso(dateAt(lastActiveDayIndex)),
    });
    seq += 1;
  }

  for (let i = 0; i < ACTIVE_COUNT; i++) pushRow("active");
  for (let i = 0; i < TRIAL_COUNT; i++) pushRow("trial");
  for (let i = 0; i < PAST_DUE_COUNT; i++) pushRow("past_due");
  for (let i = 0; i < CANCELLED_COUNT; i++) pushRow("cancelled");

  // Shuffle so status isn't grouped in id order
  for (let i = rows.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows;
}

const customers = buildCustomers();
const activeCustomers = customers.filter((c) => c.status === "active");
const exactBlendedMonthlyARPU =
  activeCustomers.reduce((s, c) => s + c.mrr, 0) / activeCustomers.length;

// ---------------------------------------------------------------------------
// 2. Daily model curves (730 days)
// ---------------------------------------------------------------------------
function customersCurveValue(t) {
  // Smooth growth curve from ~380 to ACTIVE_COUNT, eased upward (SaaS-typical
  // accelerating growth), boundary-corrected so day DAYS-1 lands exactly on
  // ACTIVE_COUNT (enforced by an explicit override after generation).
  const START = 380;
  const progress = t / (DAYS - 1);
  const eased = Math.pow(progress, 1.35);
  const base = START + eased * (ACTIVE_COUNT - START);
  const noise = 1 + randRange(-0.01, 0.01);
  return base * noise;
}

function sessionsValue(t) {
  const START = 1900;
  const END = 2600;
  const progress = t / (DAYS - 1);
  const trend = START + progress * (END - START);
  const dow = dateAt(t).getUTCDay(); // 0 = Sunday
  const weekendDip = dow === 0 || dow === 6 ? 0.78 : 1.0;
  const noise = 1 + randRange(-0.08, 0.08);
  return trend * weekendDip * noise;
}

function conversionRateValue(t) {
  const START = 3.2;
  const END = 3.9;
  const progress = t / (DAYS - 1);
  const trend = START + progress * (END - START);
  const noise = randRange(-0.15, 0.15);
  return Math.min(5, Math.max(2.5, trend + noise));
}

const daily = [];
let rawCustomers = [];
for (let t = 0; t < DAYS; t++) rawCustomers.push(customersCurveValue(t));
// Boundary correction: force exact endpoint match with the customer roster
const endCorrection = ACTIVE_COUNT / rawCustomers[DAYS - 1];
rawCustomers = rawCustomers.map((v) => v * endCorrection);
rawCustomers[DAYS - 1] = ACTIVE_COUNT;

for (let t = 0; t < DAYS; t++) {
  const sessions = Math.round(sessionsValue(t));
  const conversionRate = Number(conversionRateValue(t).toFixed(2));
  const newSignups = Math.round((sessions * conversionRate) / 100);
  const customersCount = Math.round(rawCustomers[t]);
  const dailyRevenue =
    Math.round(customersCount * (exactBlendedMonthlyARPU / 30.4375) * (1 + randRange(-0.04, 0.04)) * 100) /
    100;

  daily.push({
    date: iso(dateAt(t)),
    revenue: Math.round(dailyRevenue),
    sessions,
    newSignups,
    conversionRate,
    activeCustomers: customersCount,
  });
}

// ---------------------------------------------------------------------------
// 3. KPI aggregation per date range
// ---------------------------------------------------------------------------
const RANGES = [
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "12mo", label: "12 months", days: 365 },
];

function slice(endExclusive, length) {
  return daily.slice(Math.max(0, endExclusive - length), endExclusive);
}

function sum(rows, key) {
  return rows.reduce((s, r) => s + r[key], 0);
}

function buildKpisForRange(range) {
  const currentRows = slice(DAYS, range.days);
  const previousRows = slice(DAYS - range.days, range.days);

  const currentRevenue = sum(currentRows, "revenue");
  const previousRevenue = sum(previousRows, "revenue");

  const currentSessions = sum(currentRows, "sessions");
  const previousSessions = sum(previousRows, "sessions");

  const currentSignups = sum(currentRows, "newSignups");
  const previousSignups = sum(previousRows, "newSignups");
  const currentConversion = (currentSignups / currentSessions) * 100;
  const previousConversion = (previousSignups / previousSessions) * 100;

  const currentCustomers = currentRows[currentRows.length - 1].activeCustomers;
  const previousCustomers = previousRows[previousRows.length - 1].activeCustomers;

  const pctDelta = (curr, prev) => (prev === 0 ? 0 : ((curr - prev) / prev) * 100);

  return {
    range: range.id,
    label: range.label,
    revenue: {
      current: Math.round(currentRevenue),
      previous: Math.round(previousRevenue),
      deltaPct: Number(pctDelta(currentRevenue, previousRevenue).toFixed(1)),
    },
    customers: {
      current: currentCustomers,
      previous: previousCustomers,
      deltaPct: Number(pctDelta(currentCustomers, previousCustomers).toFixed(1)),
    },
    conversionRate: {
      current: Number(currentConversion.toFixed(2)),
      previous: Number(previousConversion.toFixed(2)),
      deltaPts: Number((currentConversion - previousConversion).toFixed(2)),
    },
    traffic: {
      current: Math.round(currentSessions),
      previous: Math.round(previousSessions),
      deltaPct: Number(pctDelta(currentSessions, previousSessions).toFixed(1)),
    },
  };
}

const kpis = {
  generatedAt: iso(END_DATE),
  workspace: WORKSPACE,
  ranges: RANGES.map(buildKpisForRange),
};

// ---------------------------------------------------------------------------
// 4. Timeseries file: daily (for today/7d/30d/90d) + monthly rollup (for 12mo)
// ---------------------------------------------------------------------------
function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}
const last365 = slice(DAYS, 365);
const monthlyMap = new Map();
for (const row of last365) {
  const key = monthKey(row.date);
  if (!monthlyMap.has(key)) {
    monthlyMap.set(key, { month: key, revenue: 0, sessions: 0, newSignups: 0, activeCustomers: 0, days: 0 });
  }
  const bucket = monthlyMap.get(key);
  bucket.revenue += row.revenue;
  bucket.sessions += row.sessions;
  bucket.newSignups += row.newSignups;
  bucket.activeCustomers = row.activeCustomers; // last value in bucket wins (point-in-time)
  bucket.days += 1;
}
const monthly = Array.from(monthlyMap.values()).map((b) => ({
  month: b.month,
  revenue: b.revenue,
  sessions: b.sessions,
  conversionRate: Number(((b.newSignups / b.sessions) * 100).toFixed(2)),
  activeCustomers: b.activeCustomers,
}));

const timeseries = {
  daily: daily.slice(DAYS - 90), // last 90 days covers today/7d/30d/90d chart needs
  monthly, // last 12 (or 13, partial-month-safe) monthly buckets for the 12mo view
};

// ---------------------------------------------------------------------------
// 5. Transactions — derived from the customer roster, not invented separately
// ---------------------------------------------------------------------------
function buildTransactions() {
  const pool = customers.filter((c) => c.status !== "trial");
  const rows = [];
  const cards = ["Visa", "Mastercard", "Amex"];
  const STATUS_WEIGHTS = [
    { id: "paid", weight: 0.9 },
    { id: "failed", weight: 0.05 },
    { id: "refunded", weight: 0.03 },
    { id: "pending", weight: 0.02 },
  ];
  const TX_COUNT = 640;
  for (let i = 0; i < TX_COUNT; i++) {
    const customer = pick(pool);
    const plan = PLANS.find((p) => p.id === customer.plan);
    const dayIndex = randInt(DAYS - 180, DAYS - 1);
    const status = weightedPick(STATUS_WEIGHTS).id;
    const amount = status === "refunded" ? -plan.price : plan.price;
    rows.push({
      id: `TXN-${String(i + 1).padStart(5, "0")}`,
      customerId: customer.id,
      customerName: customer.name,
      company: customer.company,
      plan: plan.label,
      amount,
      status,
      method: `${pick(cards)} •••• ${randInt(1000, 9999)}`,
      date: iso(dateAt(dayIndex)),
    });
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows;
}
const transactions = buildTransactions();

// ---------------------------------------------------------------------------
// 6. Recent activity — combines real signals from the customer roster and
//    the transaction log so entries are traceable, not freestanding.
// ---------------------------------------------------------------------------
function buildActivity() {
  const events = [];
  const RECENT_WINDOW = 14;
  const cutoff = iso(dateAt(DAYS - RECENT_WINDOW));

  for (const c of customers) {
    if (c.status === "trial" && c.joinDate >= cutoff) {
      events.push({ type: "trial_started", customerName: c.name, company: c.company, date: c.joinDate });
    }
    if (c.status === "active" && c.joinDate >= cutoff) {
      events.push({ type: "new_customer", customerName: c.name, company: c.company, date: c.joinDate });
    }
    if (c.status === "cancelled" && c.lastActive >= cutoff) {
      events.push({ type: "cancelled", customerName: c.name, company: c.company, date: c.lastActive });
    }
  }
  for (const t of transactions) {
    if (t.status === "paid" && t.date >= cutoff && rand() < 0.35) {
      events.push({
        type: "payment_received",
        customerName: t.customerName,
        company: t.company,
        amount: t.amount,
        date: t.date,
      });
    }
  }
  // A handful of plan-change events for narrative variety
  const upgradeCandidates = customers.filter((c) => c.status === "active" && c.lastActive >= cutoff);
  for (let i = 0; i < 10; i++) {
    const c = pick(upgradeCandidates);
    events.push({
      type: "subscription_upgraded",
      customerName: c.name,
      company: c.company,
      plan: c.planLabel,
      date: c.lastActive,
    });
  }

  events.sort((a, b) => (a.date < b.date ? 1 : -1));
  return events.slice(0, 60).map((e, i) => ({ id: `ACT-${String(i + 1).padStart(4, "0")}`, ...e }));
}
const activity = buildActivity();

// ---------------------------------------------------------------------------
// 7. Navigation config
// ---------------------------------------------------------------------------
const nav = {
  product: { name: "Contour", tagline: "See the shape of your growth." },
  sections: [
    { id: "overview", label: "Overview", route: "#/overview", icon: "grid", order: 1 },
    { id: "analytics", label: "Analytics", route: "#/analytics", icon: "trending-up", order: 2 },
    { id: "customers", label: "Customers", route: "#/customers", icon: "users", order: 3 },
    { id: "transactions", label: "Transactions", route: "#/transactions", icon: "credit-card", order: 4 },
    { id: "reports", label: "Reports", route: "#/reports", icon: "file-text", order: 5 },
    { id: "settings", label: "Settings", route: "#/settings", icon: "settings", order: 6 },
  ],
};

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const dataDir = path.join(__dirname, "..", "data");
function write(name, obj) {
  fs.writeFileSync(path.join(dataDir, name), JSON.stringify(obj, null, 2) + "\n", "utf8");
  console.log(`wrote ${name} (${JSON.stringify(obj).length.toLocaleString()} bytes)`);
}

write("kpis.json", kpis);
write("timeseries.json", timeseries);
write("customers.json", { meta: { total: customers.length }, rows: customers });
write("transactions.json", { meta: { total: transactions.length }, rows: transactions });
write("activity.json", { rows: activity });
write("nav.json", nav);

console.log("\n--- generation summary ---");
console.log("Active customers (roster):", activeCustomers.length);
console.log("Exact blended monthly ARPU:", exactBlendedMonthlyARPU.toFixed(2));
console.log("KPI snapshot (30d):", JSON.stringify(kpis.ranges.find((r) => r.range === "30d"), null, 2));
