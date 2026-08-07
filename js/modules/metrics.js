/*
  Contour — metric registry (M4)

  Single source of truth for how each of the four headline metrics maps
  onto kpis.json (current/delta) and timeseries.json (daily/monthly trend).
  M3's KPI cards and M4's chart both read this instead of each hardcoding
  their own copy of the field names and formatters, so the two surfaces
  can't quietly drift apart.
*/

import { formatCurrency, formatNumber, formatPercent, formatPoints, formatDate, formatMonth } from "../utils/format.js";

export const METRICS = [
  {
    id: "revenue",
    label: "Revenue",
    kpiField: "revenue",
    dailyField: "revenue",
    monthlyField: "revenue",
    formatValue: (value) => formatCurrency(value),
    getDelta: (range) => range.revenue.deltaPct,
    formatDelta: (range) => formatPercent(range.revenue.deltaPct, { signed: true }),
  },
  {
    id: "customers",
    label: "Active Customers",
    kpiField: "customers",
    dailyField: "activeCustomers",
    monthlyField: "activeCustomers",
    formatValue: (value) => formatNumber(Math.round(value)),
    getDelta: (range) => range.customers.deltaPct,
    formatDelta: (range) => formatPercent(range.customers.deltaPct, { signed: true }),
  },
  {
    id: "conversion-rate",
    label: "Conversion Rate",
    kpiField: "conversionRate",
    dailyField: "conversionRate",
    monthlyField: "conversionRate",
    formatValue: (value) => formatPercent(value, { decimals: 2 }),
    getDelta: (range) => range.conversionRate.deltaPts,
    formatDelta: (range) => formatPoints(range.conversionRate.deltaPts),
  },
  {
    id: "traffic",
    label: "Traffic",
    kpiField: "traffic",
    dailyField: "sessions",
    monthlyField: "sessions",
    formatValue: (value) => formatNumber(Math.round(value)),
    getDelta: (range) => range.traffic.deltaPct,
    formatDelta: (range) => formatPercent(range.traffic.deltaPct, { signed: true }),
  },
];

export function getMetric(id) {
  return METRICS.find((metric) => metric.id === id) || METRICS[0];
}

export function direction(delta) {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function periodLabel(range) {
  return range.range === "today" ? "vs yesterday" : `vs previous ${range.label.toLowerCase()}`;
}

// Daily rows only retain the last 90 days, so a 12-month series has to read
// the monthly rollup instead — the same split verify-data.js relies on to
// cross-check the 12mo KPI figures. "today" uses the last 2 daily rows
// (yesterday + today) rather than a single point: kpis.json's own "today"
// range is itself a today-vs-yesterday comparison, so this reproduces that
// exact pair instead of inventing intraday data the source has none of.
const RANGE_DAY_COUNTS = { today: 2, "7d": 7, "30d": 30, "90d": 90 };

export function seriesFor(metric, range, timeseries) {
  if (range.range === "12mo") {
    return timeseries.monthly.map((row) => ({
      label: formatMonth(row.month),
      value: row[metric.monthlyField],
    }));
  }
  const days = RANGE_DAY_COUNTS[range.range] ?? 30;
  return timeseries.daily.slice(-days).map((row) => ({
    label: formatDate(row.date),
    value: row[metric.dailyField],
  }));
}
