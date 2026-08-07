/*
  Contour — Reports view (M6)

  Three cards, each a live reflection of state.js — not a fourth
  independent dataset. The Analytics Snapshot reuses M4's state.filters
  and metrics.js; the Customer Roster and Transactions Summary reuse M5's
  state.tables.{customers,transactions} and table.js's own
  filterAndSortRows(), so "what's currently filtered" can never drift from
  what the Customers/Transactions pages themselves would show. Every
  export button exports exactly that reused dataset — never fabricated
  rows.
*/

import { getState, subscribe } from "../state.js";
import { getMetric, direction, periodLabel, seriesFor } from "../modules/metrics.js";
import { renderTrendBadge } from "../modules/trend-indicator.js";
import { renderSparkline } from "../modules/sparkline.js";
import { renderStatusBadge } from "../modules/status-badge.js";
import { filterAndSortRows } from "../modules/table.js";
import { rowsToCsv, downloadCsv } from "../utils/csv.js";
import { showToast } from "../modules/toast.js";
import { CUSTOMER_STATUS, CUSTOMER_STATUS_OPTIONS } from "../modules/customer-status.js";
import { TRANSACTION_STATUS, TRANSACTION_STATUS_OPTIONS } from "../modules/transaction-status.js";
import { COLUMNS as CUSTOMER_COLUMNS, SEARCH_FIELDS as CUSTOMER_SEARCH_FIELDS, GET_STATUS as CUSTOMER_GET_STATUS, EXPORT_COLUMNS as CUSTOMER_EXPORT_COLUMNS } from "./customers.js";
import { COLUMNS as TRANSACTION_COLUMNS, SEARCH_FIELDS as TRANSACTION_SEARCH_FIELDS, GET_STATUS as TRANSACTION_GET_STATUS, EXPORT_COLUMNS as TRANSACTION_EXPORT_COLUMNS } from "./transactions.js";
import { formatCurrency, formatNumber } from "../utils/format.js";

function buildExportButton(label, onExport) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "data-table__export-button";
  button.textContent = label;
  button.addEventListener("click", onExport);
  return button;
}

function filterSummary(tableState, statusOptions) {
  const parts = [];
  if (tableState.status !== "all") {
    const option = statusOptions.find((o) => o.value === tableState.status);
    parts.push(`status: ${option ? option.label : tableState.status}`);
  }
  if (tableState.search.trim()) parts.push(`search: "${tableState.search.trim()}"`);
  return parts.length ? `Matches the Customers/Transactions page's current filter (${parts.join(", ")})` : "No filter currently active on that page — this is every row";
}

function buildAnalyticsSnapshotCard(data, filters) {
  const metric = getMetric(filters.metric);
  const range = data.kpis.ranges.find((r) => r.range === filters.dateRange) || data.kpis.ranges[0];
  const series = seriesFor(metric, range, data.timeseries);
  const dir = direction(metric.getDelta(range));

  const card = document.createElement("article");
  card.className = "report-card";

  const heading = document.createElement("h2");
  heading.className = "report-card__title";
  heading.textContent = "Analytics Snapshot";
  card.appendChild(heading);

  const note = document.createElement("p");
  note.className = "report-card__note";
  note.textContent = `Reflects the metric and date range currently selected on Overview/Analytics: ${metric.label}, ${range.label.toLowerCase()}.`;
  card.appendChild(note);

  const value = document.createElement("p");
  value.className = "report-card__value tabular-nums";
  value.textContent = metric.formatValue(range[metric.kpiField].current);
  card.appendChild(value);

  card.appendChild(
    renderTrendBadge({ direction: dir, deltaText: metric.formatDelta(range), periodLabel: periodLabel(range) })
  );

  const sparklineWrap = document.createElement("div");
  sparklineWrap.className = `report-card__sparkline report-card__sparkline--${dir}`;
  sparklineWrap.appendChild(renderSparkline(series.map((p) => p.value)));
  card.appendChild(sparklineWrap);

  card.appendChild(
    buildExportButton(`Export ${metric.label} data (${series.length} points)`, () => {
      const csv = rowsToCsv(
        [
          { key: "label", label: metric.label === "Conversion Rate" ? "Period" : "Date" },
          { key: "value", label: metric.label },
        ].map((c) => ({ ...c, getValue: (row) => row[c.key] })),
        series
      );
      downloadCsv(`contour-analytics-${metric.id}-${range.range}.csv`, csv);
      showToast(`Exported ${series.length} data point${series.length === 1 ? "" : "s"} to CSV.`);
    })
  );

  return card;
}

function buildCustomerRosterCard(data, tableState) {
  const allCustomers = data.customers.rows;
  const counts = { trial: 0, active: 0, past_due: 0, cancelled: 0 };
  for (const c of allCustomers) counts[c.status] = (counts[c.status] || 0) + 1;

  const filtered = filterAndSortRows({
    data: allCustomers,
    searchFields: CUSTOMER_SEARCH_FIELDS,
    getStatus: CUSTOMER_GET_STATUS,
    columns: CUSTOMER_COLUMNS,
    tableState,
  });

  const card = document.createElement("article");
  card.className = "report-card";

  const heading = document.createElement("h2");
  heading.className = "report-card__title";
  heading.textContent = "Customer Roster";
  card.appendChild(heading);

  const value = document.createElement("p");
  value.className = "report-card__value tabular-nums";
  value.textContent = formatNumber(allCustomers.length);
  card.appendChild(value);

  const breakdown = document.createElement("ul");
  breakdown.className = "report-card__breakdown";
  for (const [statusKey, count] of Object.entries(counts)) {
    const config = CUSTOMER_STATUS[statusKey];
    const li = document.createElement("li");
    li.className = "report-card__breakdown-item";
    li.appendChild(renderStatusBadge(config));
    const countEl = document.createElement("span");
    countEl.className = "report-card__breakdown-count tabular-nums";
    countEl.textContent = formatNumber(count);
    li.appendChild(countEl);
    breakdown.appendChild(li);
  }
  card.appendChild(breakdown);

  const note = document.createElement("p");
  note.className = "report-card__note";
  note.textContent = filterSummary(tableState, CUSTOMER_STATUS_OPTIONS);
  card.appendChild(note);

  card.appendChild(
    buildExportButton(`Export matching customers (${filtered.length})`, () => {
      const csv = rowsToCsv(CUSTOMER_EXPORT_COLUMNS, filtered);
      downloadCsv("contour-customer-roster.csv", csv);
      showToast(`Exported ${filtered.length} customer${filtered.length === 1 ? "" : "s"} to CSV.`);
    })
  );

  return card;
}

function buildTransactionsSummaryCard(data, tableState) {
  const allTransactions = data.transactions.rows;
  const totalPaid = allTransactions.filter((t) => t.status === "paid").reduce((sum, t) => sum + t.amount, 0);
  const totalRefunded = allTransactions
    .filter((t) => t.status === "refunded")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const counts = { paid: 0, pending: 0, failed: 0, refunded: 0 };
  for (const t of allTransactions) counts[t.status] = (counts[t.status] || 0) + 1;

  const filtered = filterAndSortRows({
    data: allTransactions,
    searchFields: TRANSACTION_SEARCH_FIELDS,
    getStatus: TRANSACTION_GET_STATUS,
    columns: TRANSACTION_COLUMNS,
    tableState,
  });

  const card = document.createElement("article");
  card.className = "report-card";

  const heading = document.createElement("h2");
  heading.className = "report-card__title";
  heading.textContent = "Transactions Summary";
  card.appendChild(heading);

  const value = document.createElement("p");
  value.className = "report-card__value tabular-nums";
  value.textContent = formatCurrency(totalPaid);
  card.appendChild(value);

  const note = document.createElement("p");
  note.className = "report-card__note";
  note.textContent = `Total paid across all ${allTransactions.length} transactions on record. ${formatCurrency(totalRefunded)} refunded across ${counts.refunded} transaction${counts.refunded === 1 ? "" : "s"}.`;
  card.appendChild(note);

  const breakdown = document.createElement("ul");
  breakdown.className = "report-card__breakdown";
  for (const [statusKey, count] of Object.entries(counts)) {
    const config = TRANSACTION_STATUS[statusKey];
    const li = document.createElement("li");
    li.className = "report-card__breakdown-item";
    li.appendChild(renderStatusBadge(config));
    const countEl = document.createElement("span");
    countEl.className = "report-card__breakdown-count tabular-nums";
    countEl.textContent = formatNumber(count);
    li.appendChild(countEl);
    breakdown.appendChild(li);
  }
  card.appendChild(breakdown);

  const filterNote = document.createElement("p");
  filterNote.className = "report-card__note";
  filterNote.textContent = filterSummary(tableState, TRANSACTION_STATUS_OPTIONS);
  card.appendChild(filterNote);

  card.appendChild(
    buildExportButton(`Export matching transactions (${filtered.length})`, () => {
      const csv = rowsToCsv(TRANSACTION_EXPORT_COLUMNS, filtered);
      downloadCsv("contour-transactions-summary.csv", csv);
      showToast(`Exported ${filtered.length} transaction${filtered.length === 1 ? "" : "s"} to CSV.`);
    })
  );

  return card;
}

export function renderReportsView(section) {
  const root = document.querySelector("#view-root");

  function render() {
    const { data, filters, tables } = getState();

    root.innerHTML = `<h1>${section.label}</h1><p class="view-placeholder__note">Live snapshots of your current dashboard state — each export reflects exactly what's shown here, not a separate dataset.</p>`;

    const grid = document.createElement("div");
    grid.className = "report-grid";
    grid.appendChild(buildAnalyticsSnapshotCard(data, filters));
    grid.appendChild(buildCustomerRosterCard(data, tables.customers));
    grid.appendChild(buildTransactionsSummaryCard(data, tables.transactions));
    root.appendChild(grid);
  }

  render();
  return subscribe(render);
}
