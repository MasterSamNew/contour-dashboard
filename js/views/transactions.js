/*
  Contour — Transactions view (M5)

  A second, independent configuration over the same table engine
  (js/modules/table.js) Customers uses — different columns, different
  status vocabulary, different default sort, no row-activation/drawer —
  demonstrating the engine is genuinely reusable rather than
  Customers-specific. Reactive to state.tables.transactions.
*/

import { getState, subscribe } from "../state.js";
import { renderDataTable } from "../modules/table.js";
import { renderStatusBadge } from "../modules/status-badge.js";
import { TRANSACTION_STATUS, TRANSACTION_STATUS_OPTIONS } from "../modules/transaction-status.js";
import { formatCurrency, formatDate } from "../utils/format.js";
import { captureControlFocus, restoreControlFocus } from "../utils/focus.js";

function customerCell(tx) {
  return `
    <span class="data-table__row-title">${tx.customerName}</span>
    <span class="data-table__row-subtitle">${tx.company}</span>
  `;
}

function statusCell(tx) {
  const config = TRANSACTION_STATUS[tx.status] || { label: tx.status, tone: "neutral" };
  return renderStatusBadge(config);
}

export const SEARCH_FIELDS = (row) => [row.customerName, row.company, row.id];
export const GET_STATUS = (row) => row.status;

export const COLUMNS = [
  {
    key: "customer",
    label: "Customer",
    sortable: true,
    getValue: (row) => row.customerName.toLowerCase(),
    render: customerCell,
  },
  {
    key: "plan",
    label: "Plan",
    sortable: true,
    hideBelow: "sm",
    getValue: (row) => row.plan,
    render: (row) => row.plan,
  },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    align: "right",
    defaultSortDir: "desc",
    getValue: (row) => row.amount,
    render: (row) => formatCurrency(row.amount),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    getValue: (row) => (TRANSACTION_STATUS[row.status] || { label: row.status }).label,
    render: statusCell,
  },
  {
    key: "method",
    label: "Method",
    sortable: false,
    hideBelow: "md",
    getValue: (row) => row.method,
    render: (row) => row.method,
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
    align: "right",
    defaultSortDir: "desc",
    getValue: (row) => row.date,
    render: (row) => formatDate(row.date),
  },
];

export const EXPORT_COLUMNS = [
  { key: "id", label: "Transaction ID", getValue: (row) => row.id },
  { key: "customerId", label: "Customer ID", getValue: (row) => row.customerId },
  { key: "customerName", label: "Customer", getValue: (row) => row.customerName },
  { key: "company", label: "Company", getValue: (row) => row.company },
  { key: "plan", label: "Plan", getValue: (row) => row.plan },
  { key: "amount", label: "Amount", getValue: (row) => row.amount },
  { key: "status", label: "Status", getValue: (row) => (TRANSACTION_STATUS[row.status] || { label: row.status }).label },
  { key: "method", label: "Method", getValue: (row) => row.method },
  { key: "date", label: "Date", getValue: (row) => row.date },
];

export function renderTransactionsView(section) {
  const root = document.querySelector("#view-root");

  function render() {
    const snapshot = captureControlFocus(root);
    const { data } = getState();

    root.innerHTML = `<h1>${section.label}</h1>`;

    root.appendChild(
      renderDataTable({
        stateKey: "transactions",
        data: data.transactions.rows,
        columns: COLUMNS,
        searchLabel: "Search transactions",
        searchPlaceholder: "Search by customer or company…",
        searchFields: SEARCH_FIELDS,
        statusOptions: TRANSACTION_STATUS_OPTIONS,
        getStatus: GET_STATUS,
        getRowId: (row) => row.id,
        caption: "Transactions",
        emptyLabel: "No transactions match your search and filters.",
        exportColumns: EXPORT_COLUMNS,
        exportFilename: "contour-transactions.csv",
      })
    );

    restoreControlFocus(root, snapshot);
  }

  render();
  return subscribe(render);
}
