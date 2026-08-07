/*
  Contour — Recent Activity feed (M5)

  Renders data/activity.json as-is: the array is already most-recent-first
  (verified by M1's verify-data.js), so this module never re-sorts it — it
  only slices the first ACTIVITY_LIMIT entries for a compact panel. Type is
  conveyed by both an icon shape and an explicit text label, never by tone
  color alone.
*/

import { formatCurrency, formatRelativeTime } from "../utils/format.js";

const ACTIVITY_LIMIT = 8;

const ACTIVITY_TYPE = {
  payment_received: {
    icon: "credit-card",
    tone: "positive",
    label: (a) => (a.amount ? `Payment received — ${formatCurrency(a.amount)}` : "Payment received"),
  },
  subscription_upgraded: {
    icon: "trending-up",
    tone: "neutral",
    label: (a) => (a.plan ? `Upgraded to ${a.plan}` : "Subscription upgraded"),
  },
  new_customer: {
    icon: "users",
    tone: "positive",
    label: () => "New customer",
  },
  trial_started: {
    icon: "flag",
    tone: "neutral",
    label: () => "Trial started",
  },
  cancelled: {
    icon: "x",
    tone: "negative",
    label: () => "Subscription cancelled",
  },
};

function buildItem(entry) {
  const config = ACTIVITY_TYPE[entry.type] || { icon: "grid", tone: "neutral", label: () => entry.type };

  const li = document.createElement("li");
  li.className = "activity-feed__item";

  const icon = document.createElement("span");
  icon.className = `activity-feed__icon activity-feed__icon--${config.tone}`;
  icon.innerHTML = `<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#${config.icon}"></use></svg>`;

  const content = document.createElement("span");
  content.className = "activity-feed__content";
  const primary = document.createElement("span");
  primary.className = "activity-feed__primary";
  primary.textContent = `${entry.customerName} · ${entry.company}`;
  const secondary = document.createElement("span");
  secondary.className = "activity-feed__secondary";
  secondary.textContent = config.label(entry);
  content.append(primary, secondary);

  const time = document.createElement("span");
  time.className = "activity-feed__time";
  time.textContent = formatRelativeTime(entry.date);

  li.append(icon, content, time);
  return li;
}

export function renderActivityFeed(entries) {
  const section = document.createElement("section");
  section.className = "activity-feed";
  section.setAttribute("aria-labelledby", "activity-feed-title");

  const heading = document.createElement("h2");
  heading.id = "activity-feed-title";
  heading.className = "activity-feed__title";
  heading.textContent = "Recent Activity";
  section.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "activity-feed__list";
  for (const entry of entries.slice(0, ACTIVITY_LIMIT)) {
    list.appendChild(buildItem(entry));
  }
  section.appendChild(list);

  return section;
}
