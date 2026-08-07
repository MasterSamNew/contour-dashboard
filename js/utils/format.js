/*
  Contour — formatting utilities
  Pure functions, no DOM/state access, so every view/module formats
  numbers, currency, dates, and percentages identically.
*/

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

export function formatCurrency(value) {
  return currencyFormatter.format(value);
}

export function formatNumber(value) {
  return numberFormatter.format(value);
}

export function formatPercent(value, { signed = false, decimals = 1 } = {}) {
  const rounded = value.toFixed(decimals);
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

export function formatPoints(value, { signed = true, decimals = 2 } = {}) {
  const rounded = Math.abs(value).toFixed(decimals);
  const sign = signed ? (value >= 0 ? "+" : "-") : "";
  return `${sign}${rounded}pt`;
}

export function formatDate(isoDateString) {
  return dateFormatter.format(new Date(`${isoDateString}T00:00:00Z`));
}

export function formatMonth(isoMonthString) {
  return monthFormatter.format(new Date(`${isoMonthString}-01T00:00:00Z`));
}

export function formatRelativeTime(isoDateString, now = new Date()) {
  const then = new Date(`${isoDateString}T00:00:00Z`);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)}w ago`;
  return formatDate(isoDateString);
}
