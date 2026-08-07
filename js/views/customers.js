/*
  Contour — Customers view (M5)

  Configuration over the generic table engine (js/modules/table.js) — this
  file owns only what's Customers-specific: columns, search fields, status
  options, and wiring row clicks to the detail drawer. Reactive to
  state.tables.customers the same way Overview/Analytics are reactive to
  state.filters (M4).
*/

import { getState, subscribe } from "../state.js";
import { renderDataTable } from "../modules/table.js";
import { renderStatusBadge } from "../modules/status-badge.js";
import { CUSTOMER_STATUS, CUSTOMER_STATUS_OPTIONS } from "../modules/customer-status.js";
import { openCustomerDrawer, closeCustomerDrawer } from "../modules/customer-drawer.js";
import { formatCurrency, formatRelativeTime } from "../utils/format.js";
import { captureControlFocus, restoreControlFocus } from "../utils/focus.js";

function nameCell(customer) {
  return `
    <span class="data-table__row-title">${customer.name}</span>
    <span class="data-table__row-subtitle">${customer.company}</span>
  `;
}

function statusCell(customer) {
  const config = CUSTOMER_STATUS[customer.status] || { label: customer.status, tone: "neutral" };
  return renderStatusBadge(config);
}

export const SEARCH_FIELDS = (row) => [row.name, row.company, row.email];
export const GET_STATUS = (row) => row.status;

export const COLUMNS = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    getValue: (row) => row.name.toLowerCase(),
    render: nameCell,
    rowAriaLabel: (row) => `View details for ${row.name}, ${row.company}`,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    getValue: (row) => (CUSTOMER_STATUS[row.status] || { label: row.status }).label,
    render: statusCell,
  },
  {
    key: "plan",
    label: "Plan",
    sortable: true,
    hideBelow: "sm",
    getValue: (row) => row.planLabel,
    render: (row) => row.planLabel,
  },
  {
    key: "mrr",
    label: "MRR",
    sortable: true,
    align: "right",
    defaultSortDir: "desc",
    getValue: (row) => row.mrr,
    render: (row) => formatCurrency(row.mrr),
  },
  {
    key: "lastActive",
    label: "Last Active",
    sortable: true,
    align: "right",
    hideBelow: "md",
    defaultSortDir: "desc",
    getValue: (row) => row.lastActive,
    render: (row) => formatRelativeTime(row.lastActive),
  },
];

export const EXPORT_COLUMNS = [
  { key: "id", label: "Customer ID", getValue: (row) => row.id },
  { key: "name", label: "Name", getValue: (row) => row.name },
  { key: "email", label: "Email", getValue: (row) => row.email },
  { key: "company", label: "Company", getValue: (row) => row.company },
  { key: "plan", label: "Plan", getValue: (row) => row.planLabel },
  { key: "mrr", label: "MRR", getValue: (row) => row.mrr },
  { key: "status", label: "Status", getValue: (row) => (CUSTOMER_STATUS[row.status] || { label: row.status }).label },
  { key: "joinDate", label: "Join Date", getValue: (row) => row.joinDate },
  { key: "lastActive", label: "Last Active", getValue: (row) => row.lastActive },
];

export function renderCustomersView(section) {
  const root = document.querySelector("#view-root");

  function render() {
    const snapshot = captureControlFocus(root);
    const { data } = getState();

    root.innerHTML = `<h1>${section.label}</h1>`;

    root.appendChild(
      renderDataTable({
        stateKey: "customers",
        data: data.customers.rows,
        columns: COLUMNS,
        searchLabel: "Search customers",
        searchPlaceholder: "Search by name, company, or email…",
        searchFields: SEARCH_FIELDS,
        statusOptions: CUSTOMER_STATUS_OPTIONS,
        getStatus: GET_STATUS,
        getRowId: (row) => row.id,
        caption: "Customers",
        emptyLabel: "No customers match your search and filters.",
        onRowActivate: (customer, triggerEl) => openCustomerDrawer(customer, data.transactions.rows, triggerEl),
        exportColumns: EXPORT_COLUMNS,
        exportFilename: "contour-customers.csv",
      })
    );

    restoreControlFocus(root, snapshot);
  }

  render();
  const unsubscribe = subscribe(render);
  return () => {
    unsubscribe();
    closeCustomerDrawer();
  };
}
