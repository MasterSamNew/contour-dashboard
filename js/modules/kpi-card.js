/*
  Contour — KPI card

  Renders one headline metric card (value, prior-period delta, trend
  direction, sparkline) from a plain config object. One module, reused four
  times by js/views/overview.js, so the metrics differ only in their data —
  never in markup.

  The delta/direction badge itself is trend-indicator.js (M4) — shared with
  the chart workspace's comparison badge rather than built twice.
*/

import { renderSparkline } from "./sparkline.js";
import { renderTrendBadge } from "./trend-indicator.js";

export function renderKpiCard({ id, label, value, deltaText, direction, periodLabel, sparklineValues }) {
  const article = document.createElement("article");
  article.className = "kpi-card";
  article.setAttribute("aria-labelledby", `kpi-${id}-label`);

  const labelEl = document.createElement("h3");
  labelEl.className = "kpi-card__label";
  labelEl.id = `kpi-${id}-label`;
  labelEl.textContent = label;

  const valueEl = document.createElement("p");
  valueEl.className = "kpi-card__value tabular-nums";
  valueEl.textContent = value;

  const badge = renderTrendBadge({ direction, deltaText, periodLabel });

  const sparklineWrap = document.createElement("div");
  sparklineWrap.className = `kpi-card__sparkline kpi-card__sparkline--${direction}`;
  sparklineWrap.appendChild(renderSparkline(sparklineValues));

  article.append(labelEl, valueEl, badge, sparklineWrap);
  return article;
}
