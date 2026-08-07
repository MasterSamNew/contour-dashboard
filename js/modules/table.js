/*
  Contour — reusable data-table engine (M5)

  One generic table (search + status filter + sort + pagination + empty
  state) driven entirely by a column/config object — Customers and
  Transactions are both just configuration over this, not two separate
  table implementations. State lives centrally in state.tables[stateKey]
  (M5 extends M4's state.filters pattern), so a render is always a pure
  function of current state — same "no vdom, rebuild the region" approach
  as the M4 chart workspace.

  The one exception is the search input: committing it to central state on
  every keystroke would rebuild (and steal focus from) the input on every
  keystroke. It's debounced instead — see commitTableState() — and any
  other control (filter/sort/page) flushes a pending debounce immediately
  so a value the user just typed is never silently dropped.
*/

import { getState, setState } from "../state.js";
import { rowsToCsv, downloadCsv } from "../utils/csv.js";
import { showToast } from "./toast.js";

const SEARCH_DEBOUNCE_MS = 300;

function compareValues(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

// Exported so Reports (M6) can compute "whatever the Customers/Transactions
// page is currently filtered to" using the exact same logic the table
// itself uses to render — not a second, hand-copied filter implementation
// that could quietly drift from this one.
export function filterAndSortRows({ data, searchFields, getStatus, columns, tableState }) {
  let rows = data;
  const query = tableState.search.trim().toLowerCase();
  if (query) {
    rows = rows.filter((row) => searchFields(row).some((field) => String(field).toLowerCase().includes(query)));
  }
  if (tableState.status !== "all") {
    rows = rows.filter((row) => getStatus(row) === tableState.status);
  }
  const sortColumn = columns.find((c) => c.key === tableState.sortKey) || columns[0];
  const dir = tableState.sortDir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => compareValues(sortColumn.getValue(a), sortColumn.getValue(b)) * dir);
}

// column.render(row) may return either an HTML string (plain/formatted
// text — the M3/M4 convention for trusted static fixture data) or a DOM
// node (status badges, so table.js reuses the one status-badge.js
// implementation instead of re-templating badge markup as a string).
function appendRendered(parent, rendered) {
  if (typeof rendered === "string") {
    parent.innerHTML = rendered;
  } else {
    parent.appendChild(rendered);
  }
}

export function renderDataTable(config) {
  const {
    stateKey,
    data,
    columns,
    searchLabel,
    searchPlaceholder,
    searchFields,
    statusOptions,
    getStatus,
    getRowId,
    pageSize = 25,
    caption,
    emptyLabel,
    onRowActivate,
    exportColumns,
    exportFilename,
  } = config;

  const tableState = getState().tables[stateKey];

  const container = document.createElement("section");
  container.className = "data-table";

  // ---- Toolbar: search + status filter ----
  const toolbar = document.createElement("div");
  toolbar.className = "data-table__toolbar";

  const searchWrap = document.createElement("div");
  searchWrap.className = "data-table__search";
  const searchInputId = `${stateKey}-search`;
  const label = document.createElement("label");
  label.className = "visually-hidden";
  label.htmlFor = searchInputId;
  label.textContent = searchLabel || "Search";
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.id = searchInputId;
  searchInput.className = "data-table__search-input";
  searchInput.placeholder = searchPlaceholder || "Search…";
  searchInput.value = tableState.search;
  searchInput.dataset.searchGroup = `${stateKey}-search`;
  searchWrap.append(label, searchInput);

  const filterGroup = document.createElement("div");
  filterGroup.className = "data-table__filter";
  filterGroup.setAttribute("role", "group");
  filterGroup.setAttribute("aria-label", "Status");
  for (const option of statusOptions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "data-table__filter-button";
    button.textContent = option.label;
    button.dataset.controlGroup = `${stateKey}-status`;
    button.dataset.controlValue = option.value;
    button.setAttribute("aria-pressed", String(option.value === tableState.status));
    button.addEventListener("click", () => commitTableState({ status: option.value, page: 1 }));
    filterGroup.appendChild(button);
  }

  toolbar.append(searchWrap, filterGroup);
  container.appendChild(toolbar);

  let debounceHandle = null;

  function commitTableState(patch, { debounce = false } = {}) {
    if (debounceHandle) {
      clearTimeout(debounceHandle);
      debounceHandle = null;
    }
    const flush = () => {
      const { tables } = getState();
      setState({
        tables: { ...tables, [stateKey]: { ...tables[stateKey], search: searchInput.value, ...patch } },
      });
    };
    if (debounce) {
      debounceHandle = setTimeout(flush, SEARCH_DEBOUNCE_MS);
    } else {
      flush();
    }
  }

  searchInput.addEventListener("input", () => commitTableState({ page: 1 }, { debounce: true }));

  // ---- Compute the current page of rows ----
  const query = tableState.search.trim().toLowerCase();
  const rows = filterAndSortRows({ data, searchFields, getStatus, columns, tableState });

  // Exports the full filtered/sorted result set (every matching row, not
  // just the current page) — "the currently relevant dataset" means
  // whatever search/filter narrowed it to, not an arbitrary page slice.
  if (exportColumns) {
    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "data-table__export-button";
    exportButton.textContent = "Export CSV";
    exportButton.addEventListener("click", () => {
      const csv = rowsToCsv(exportColumns, rows);
      downloadCsv(exportFilename || `${stateKey}.csv`, csv);
      showToast(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} to CSV.`);
    });
    toolbar.appendChild(exportButton);
  }

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(Math.max(1, tableState.page), totalPages);
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  // ---- Results: table, or empty state ----
  const results = document.createElement("div");
  results.className = "data-table__results";

  if (totalRows === 0) {
    results.appendChild(buildEmptyState({ emptyLabel, hasQuery: !!query, hasStatusFilter: tableState.status !== "all" }, commitTableState));
  } else {
    results.appendChild(buildTable({ columns, pageRows, tableState, caption, onRowActivate, getRowId, commitTableState }));
    results.appendChild(buildPagination({ page, totalPages, totalRows, start, shown: pageRows.length, commitTableState }));
  }

  container.appendChild(results);

  return container;
}

function buildEmptyState({ emptyLabel, hasQuery, hasStatusFilter }, commitTableState) {
  const wrap = document.createElement("div");
  wrap.className = "data-table__empty";
  wrap.setAttribute("role", "status");

  const message = document.createElement("p");
  message.textContent = emptyLabel || "No results match your search and filters.";
  wrap.appendChild(message);

  if (hasQuery || hasStatusFilter) {
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "data-table__empty-clear";
    clearButton.textContent = "Clear search and filters";
    clearButton.addEventListener("click", () => commitTableState({ search: "", status: "all", page: 1 }));
    wrap.appendChild(clearButton);
  }

  return wrap;
}

function buildTable({ columns, pageRows, tableState, caption, onRowActivate, getRowId, commitTableState }) {
  const table = document.createElement("table");
  table.className = "data-table__table";

  if (caption) {
    const captionEl = document.createElement("caption");
    captionEl.className = "visually-hidden";
    captionEl.textContent = caption;
    table.appendChild(captionEl);
  }

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const column of columns) {
    const th = document.createElement("th");
    th.scope = "col";
    if (column.hideBelow) th.className = `data-table__cell--hide-${column.hideBelow}`;
    if (column.align === "right") th.classList.add("data-table__cell--right");

    if (column.sortable) {
      const isSorted = tableState.sortKey === column.key;
      if (isSorted) th.setAttribute("aria-sort", tableState.sortDir === "desc" ? "descending" : "ascending");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "data-table__sort-button";
      button.dataset.controlGroup = "sort";
      button.dataset.controlValue = column.key;
      button.innerHTML = `<span>${column.label}</span><span class="data-table__sort-indicator" aria-hidden="true">${
        isSorted ? (tableState.sortDir === "desc" ? "▼" : "▲") : ""
      }</span>`;
      button.addEventListener("click", () => {
        const nextDir = isSorted ? (tableState.sortDir === "asc" ? "desc" : "asc") : column.defaultSortDir || "asc";
        commitTableState({ sortKey: column.key, sortDir: nextDir });
      });
      th.appendChild(button);
    } else {
      th.textContent = column.label;
    }
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of pageRows) {
    const tr = document.createElement("tr");
    columns.forEach((column, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) cell.scope = "row";
      if (column.hideBelow) cell.className = `data-table__cell--hide-${column.hideBelow}`;
      if (column.align === "right") cell.classList.add("data-table__cell--right");

      if (index === 0 && onRowActivate) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "data-table__row-trigger";
        appendRendered(button, column.render(row));
        if (column.rowAriaLabel) button.setAttribute("aria-label", column.rowAriaLabel(row));
        button.addEventListener("click", () => onRowActivate(row, button));
        cell.appendChild(button);
      } else {
        appendRendered(cell, column.render(row));
      }
      tr.appendChild(cell);
    });
    tr.dataset.rowId = getRowId(row);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  return table;
}

function buildPagination({ page, totalPages, totalRows, start, shown, commitTableState }) {
  const nav = document.createElement("div");
  nav.className = "data-table__pagination";

  const summary = document.createElement("p");
  summary.className = "data-table__pagination-summary";
  summary.textContent = shown === 0 ? "No results" : `Showing ${start + 1}–${start + shown} of ${totalRows}`;
  nav.appendChild(summary);

  const controls = document.createElement("div");
  controls.className = "data-table__pagination-controls";

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "data-table__pagination-button";
  prev.textContent = "Previous";
  prev.disabled = page <= 1;
  prev.dataset.controlGroup = "page";
  prev.dataset.controlValue = "prev";
  prev.addEventListener("click", () => commitTableState({ page: page - 1 }));

  const status = document.createElement("span");
  status.className = "data-table__pagination-status";
  status.textContent = `Page ${page} of ${totalPages}`;
  status.setAttribute("aria-live", "polite");

  const next = document.createElement("button");
  next.type = "button";
  next.className = "data-table__pagination-button";
  next.textContent = "Next";
  next.disabled = page >= totalPages;
  next.dataset.controlGroup = "page";
  next.dataset.controlValue = "next";
  next.addEventListener("click", () => commitTableState({ page: page + 1 }));

  controls.append(prev, status, next);
  nav.appendChild(controls);

  return nav;
}
