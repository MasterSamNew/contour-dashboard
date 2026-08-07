/*
  Contour — chart workspace (M4)

  Combines the metric/date-range controls, the headline value + comparison
  badge, and the chart figure into one section. Reused as-is by both
  Overview (below the M3 KPI row) and Analytics (as the sole primary
  content) — same component, different placement, per the spec's "KPI row
  -> main chart workspace" / "Analytics promotes the chart into its
  primary workspace" split.
*/

import { getState } from "../state.js";
import { getMetric, direction, periodLabel, seriesFor } from "./metrics.js";
import { renderChartFigure } from "./chart.js";
import { renderChartControls } from "./chart-controls.js";
import { renderTrendBadge } from "./trend-indicator.js";

export function renderChartWorkspace() {
  const { data, filters } = getState();
  const metric = getMetric(filters.metric);
  const range = data.kpis.ranges.find((r) => r.range === filters.dateRange) || data.kpis.ranges[0];
  const series = seriesFor(metric, range, data.timeseries);
  const deltaDirection = direction(metric.getDelta(range));

  const section = document.createElement("section");
  section.className = "chart-workspace";
  section.setAttribute("aria-labelledby", "chart-title");
  section.setAttribute("aria-describedby", "chart-desc");

  const header = document.createElement("div");
  header.className = "chart-header";

  const heading = document.createElement("div");
  const title = document.createElement("h2");
  title.id = "chart-title";
  title.className = "chart-header__title";
  title.textContent = `${metric.label} — ${range.label}`;
  const value = document.createElement("p");
  value.className = "chart-header__value tabular-nums";
  value.textContent = metric.formatValue(range[metric.kpiField].current);
  heading.append(title, value);

  const badge = renderTrendBadge({
    direction: deltaDirection,
    deltaText: metric.formatDelta(range),
    periodLabel: periodLabel(range),
  });

  header.append(heading, badge);

  const description = document.createElement("p");
  description.id = "chart-desc";
  description.className = "visually-hidden";
  const directionWord = deltaDirection === "up" ? "up" : deltaDirection === "down" ? "down" : "unchanged";
  description.textContent =
    `Line chart of ${metric.label.toLowerCase()} for ${range.label.toLowerCase()}, from ${series[0].label} to ` +
    `${series[series.length - 1].label}. Current value ${metric.formatValue(range[metric.kpiField].current)}, ` +
    `${directionWord} ${metric.formatDelta(range)} ${periodLabel(range)}. A full data table follows the chart.`;

  section.append(header, description, renderChartControls(), renderChartFigure({ metric, range, series }));

  return section;
}
