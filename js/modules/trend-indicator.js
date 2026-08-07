/*
  Contour — trend badge (M4)

  Extracted from M3's KPI card so the chart workspace's comparison badge
  can reuse the exact same direction icon/word logic instead of a second
  copy. One implementation — kpi-card.js and chart-workspace.js both call
  this rather than building their own delta markup.

  Direction is never color-only: an icon and a visually-hidden word
  ("Increased"/"Decreased"/"Unchanged") always accompany the +/- sign
  already present in the formatted delta text.
*/

const DIRECTION_ICON = {
  up: "arrow-up-right",
  down: "arrow-down-right",
  flat: "minus",
};

const DIRECTION_WORD = {
  up: "Increased",
  down: "Decreased",
  flat: "Unchanged",
};

export function renderTrendBadge({ direction, deltaText, periodLabel }) {
  const wrap = document.createElement("div");
  wrap.className = `trend-badge trend-badge--${direction}`;

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "icon trend-badge__icon");
  icon.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `assets/icons/sprite.svg#${DIRECTION_ICON[direction]}`);
  icon.appendChild(use);

  const text = document.createElement("span");
  text.className = "trend-badge__text tabular-nums";
  const directionWord = document.createElement("span");
  directionWord.className = "visually-hidden";
  directionWord.textContent = `${DIRECTION_WORD[direction]} `;
  text.append(directionWord, document.createTextNode(deltaText));

  const period = document.createElement("span");
  period.className = "trend-badge__period";
  period.textContent = periodLabel;

  wrap.append(icon, text, period);
  return wrap;
}
