/*
  Contour — Customers needing attention (M5)

  Derived from customers.json alone — no separate/independent dataset.
  Two genuinely attention-worthy states the data actually represents:
  past-due (still recoverable, most overdue first) and recently cancelled
  (most recent churn first, using lastActive as the only "when" the data
  model provides — there's no separate cancellation-date field). A fixed
  split (PAST_DUE_LIMIT + CANCELLED_LIMIT) guarantees both categories are
  represented rather than one status's larger count crowding out the
  other.
*/

import { renderStatusBadge } from "./status-badge.js";
import { CUSTOMER_STATUS } from "./customer-status.js";
import { formatCurrency, formatRelativeTime } from "../utils/format.js";

const PAST_DUE_LIMIT = 4;
const CANCELLED_LIMIT = 2;

function buildAttentionList(customers) {
  const pastDue = customers
    .filter((c) => c.status === "past_due")
    .sort((a, b) => a.lastActive.localeCompare(b.lastActive)) // oldest lastActive first = most overdue
    .slice(0, PAST_DUE_LIMIT);

  const recentlyCancelled = customers
    .filter((c) => c.status === "cancelled")
    .sort((a, b) => b.lastActive.localeCompare(a.lastActive)) // newest lastActive first = most recent churn
    .slice(0, CANCELLED_LIMIT);

  return [...pastDue, ...recentlyCancelled];
}

function buildItem(customer, onActivate) {
  const li = document.createElement("li");
  li.className = "attention-list__item";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "attention-list__trigger";
  button.setAttribute("aria-label", `View details for ${customer.name}, ${customer.company}`);

  const info = document.createElement("span");
  info.className = "attention-list__info";
  const name = document.createElement("span");
  name.className = "attention-list__name";
  name.textContent = customer.name;
  const company = document.createElement("span");
  company.className = "attention-list__company";
  company.textContent = customer.company;
  info.append(name, company);

  const meta = document.createElement("span");
  meta.className = "attention-list__meta";
  const statusConfig = CUSTOMER_STATUS[customer.status] || { label: customer.status, tone: "neutral" };
  meta.appendChild(renderStatusBadge(statusConfig));
  const mrr = document.createElement("span");
  mrr.className = "attention-list__mrr tabular-nums";
  mrr.textContent = formatCurrency(customer.mrr);
  const lastActive = document.createElement("span");
  lastActive.className = "attention-list__last-active";
  lastActive.textContent = `Active ${formatRelativeTime(customer.lastActive)}`;
  meta.append(mrr, lastActive);

  button.append(info, meta);
  button.addEventListener("click", () => onActivate(customer, button));

  li.appendChild(button);
  return li;
}

export function renderAttentionList(customers, onActivate) {
  const items = buildAttentionList(customers);

  const section = document.createElement("section");
  section.className = "attention-list";
  section.setAttribute("aria-labelledby", "attention-list-title");

  const heading = document.createElement("h2");
  heading.id = "attention-list-title";
  heading.className = "attention-list__title";
  heading.innerHTML = `<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#alert"></use></svg><span>Customers needing attention</span>`;
  section.appendChild(heading);

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "attention-list__empty";
    empty.textContent = "No customers currently need attention.";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.className = "attention-list__list";
  for (const customer of items) {
    list.appendChild(buildItem(customer, onActivate));
  }
  section.appendChild(list);

  return section;
}
