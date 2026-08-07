/*
  Contour — customer detail drawer (M5)

  Opens from a Customers-table row (or an attention-list item). Built once,
  lazily, on first open, and reused for every subsequent customer — only
  its content changes, the same single-persistent-instance approach the
  app shell already uses for its one nav sidebar. Appended directly to
  <body> (outside #view-root) so it isn't destroyed by the view's own
  full-region re-renders while open.

  Uses js/utils/drawer.js — M2's drawer/inert/focus pattern, extracted in
  M5 — rather than a second drawer system.

  Content is only what customers.json + transactions.json actually
  contain. The "recent transactions" list is transactions.json filtered by
  customerId — the only per-customer history the data model provides — no
  invented customer-specific facts.
*/

import { createDrawerController } from "../utils/drawer.js";
import { formatCurrency, formatDate, formatRelativeTime } from "../utils/format.js";
import { renderStatusBadge } from "./status-badge.js";
import { CUSTOMER_STATUS } from "./customer-status.js";
import { TRANSACTION_STATUS } from "./transaction-status.js";

const HISTORY_LIMIT = 6;

let controller = null;
let panelEl = null;
let titleEl = null;
let bodyEl = null;

function buildField(label, value) {
  const field = document.createElement("div");
  field.className = "detail-drawer__field";
  const dt = document.createElement("span");
  dt.className = "detail-drawer__field-label";
  dt.textContent = label;
  const dd = document.createElement("span");
  dd.className = "detail-drawer__field-value";
  dd.textContent = value;
  field.append(dt, dd);
  return field;
}

function ensureBuilt() {
  if (controller) return;

  const overlayEl = document.createElement("div");
  overlayEl.className = "detail-drawer-overlay";
  overlayEl.hidden = true;

  panelEl = document.createElement("div");
  panelEl.className = "detail-drawer";
  panelEl.setAttribute("role", "dialog");
  panelEl.setAttribute("aria-modal", "true");
  panelEl.tabIndex = -1;

  titleEl = document.createElement("h2");
  titleEl.className = "detail-drawer__title";
  titleEl.id = "customer-drawer-title";
  panelEl.setAttribute("aria-labelledby", titleEl.id);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "icon-button detail-drawer__close";
  closeButton.setAttribute("aria-label", "Close customer details");
  closeButton.innerHTML = `<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#x"></use></svg>`;

  const header = document.createElement("div");
  header.className = "detail-drawer__header";
  header.append(titleEl, closeButton);

  bodyEl = document.createElement("div");
  bodyEl.className = "detail-drawer__body";

  panelEl.append(header, bodyEl);
  document.body.append(overlayEl, panelEl);

  controller = createDrawerController({
    panelEl,
    overlayEl,
    getInertTargets: () =>
      [document.querySelector("#topbar"), document.querySelector("#sidebar"), document.querySelector("#main-content")].filter(
        Boolean
      ),
    focusOnOpen: () => closeButton,
  });

  closeButton.addEventListener("click", () => controller.close());
}

export function openCustomerDrawer(customer, transactions, triggerEl) {
  ensureBuilt();

  titleEl.textContent = customer.name;
  bodyEl.innerHTML = "";

  const statusRow = document.createElement("div");
  statusRow.className = "detail-drawer__status-row";
  const statusConfig = CUSTOMER_STATUS[customer.status] || { label: customer.status, tone: "neutral" };
  statusRow.appendChild(renderStatusBadge(statusConfig));
  const companyText = document.createElement("span");
  companyText.className = "detail-drawer__company";
  companyText.textContent = customer.company;
  statusRow.appendChild(companyText);
  bodyEl.appendChild(statusRow);

  const fields = document.createElement("div");
  fields.className = "detail-drawer__fields";
  fields.append(
    buildField("Email", customer.email),
    buildField("Plan", customer.planLabel),
    buildField("Monthly revenue", formatCurrency(customer.mrr)),
    buildField("Customer since", formatDate(customer.joinDate)),
    buildField("Last active", `${formatRelativeTime(customer.lastActive)} (${formatDate(customer.lastActive)})`),
    buildField("Customer ID", customer.id)
  );
  bodyEl.appendChild(fields);

  const history = document.createElement("div");
  history.className = "detail-drawer__history";
  const heading = document.createElement("h3");
  heading.textContent = "Recent transactions";
  history.appendChild(heading);

  const customerTransactions = transactions
    .filter((t) => t.customerId === customer.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (customerTransactions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "detail-drawer__history-empty";
    empty.textContent = "No transactions on record for this customer.";
    history.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "detail-drawer__history-list";
    for (const t of customerTransactions.slice(0, HISTORY_LIMIT)) {
      const item = document.createElement("li");
      item.className = "detail-drawer__history-item";
      const txStatus = TRANSACTION_STATUS[t.status] || { label: t.status, tone: "neutral" };
      const amountEl = document.createElement("span");
      amountEl.className = "detail-drawer__history-amount tabular-nums";
      amountEl.textContent = formatCurrency(t.amount);
      const dateEl = document.createElement("span");
      dateEl.className = "detail-drawer__history-date";
      dateEl.textContent = formatDate(t.date);
      item.append(amountEl, renderStatusBadge(txStatus), dateEl);
      list.appendChild(item);
    }
    history.appendChild(list);
  }
  bodyEl.appendChild(history);

  controller.open(triggerEl);
}

export function closeCustomerDrawer() {
  if (controller) controller.close();
}
