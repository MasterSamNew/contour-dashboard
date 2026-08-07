/*
  Contour — chart controls (M4)

  Metric switcher + date-range selector for the chart workspace. Both write
  to the shared state.filters slice state.js already reserved for this
  (see its "Overview/Analytics default" comment) — not local component
  state — so a range change here also drives the M3 KPI cards, keeping one
  date-range context across the whole view instead of two disconnected ones.

  Plain toggle buttons (aria-pressed) rather than a full ARIA tablist: they
  get correct keyboard operation for free from the browser, and a segmented
  button group reads accurately either way.
*/

import { getState, setState } from "../state.js";
import { METRICS } from "./metrics.js";

function buildButtonGroup({ groupKey, legendText, options, activeId, onSelect }) {
  const group = document.createElement("div");
  group.className = "chart-controls__group";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", legendText);

  const legend = document.createElement("span");
  legend.className = "chart-controls__legend";
  legend.setAttribute("aria-hidden", "true"); // the group's own aria-label already states this to AT
  legend.textContent = legendText;
  group.appendChild(legend);

  const buttons = document.createElement("div");
  buttons.className = "chart-controls__buttons";
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chart-controls__button";
    button.textContent = option.label;
    button.setAttribute("aria-pressed", String(option.id === activeId));
    button.dataset.controlGroup = groupKey;
    button.dataset.controlValue = option.id;
    button.addEventListener("click", () => onSelect(option.id));
    buttons.appendChild(button);
  }
  group.appendChild(buttons);

  return group;
}

export function renderChartControls() {
  const { data, filters } = getState();

  const wrap = document.createElement("div");
  wrap.className = "chart-controls";

  wrap.appendChild(
    buildButtonGroup({
      groupKey: "metric",
      legendText: "Metric",
      options: METRICS.map((metric) => ({ id: metric.id, label: metric.label })),
      activeId: filters.metric,
      onSelect: (id) => setState({ filters: { ...filters, metric: id } }),
    })
  );

  wrap.appendChild(
    buildButtonGroup({
      groupKey: "range",
      legendText: "Date range",
      options: data.kpis.ranges.map((range) => ({ id: range.range, label: range.label })),
      activeId: filters.dateRange,
      onSelect: (id) => setState({ filters: { ...filters, dateRange: id } }),
    })
  );

  return wrap;
}
