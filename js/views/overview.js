/*
  Contour — Overview view

  M3 built the KPI row; M4 added the chart workspace below it. M5 completes
  the page per the original layout — KPI row -> chart workspace -> Recent
  Activity -> Customers needing attention — using data/activity.json and
  the same customer-derivation + detail-drawer machinery the Customers
  view (M5) uses, not a second implementation of either.

  Reactive to state.filters (M4) via state.js's subscribe(); the activity
  feed and attention list don't have their own filter state, so they only
  change when the underlying data changes (never, for this static fixture)
  — they still live inside the same render() so a single subscription
  covers the whole page.

  M6: the attention list's visibility is gated by
  state.settings.notifications.showAttentionList (Settings) — the one
  notification toggle with a real, observable effect rather than just
  persisting inertly.
*/

import { getState, subscribe } from "../state.js";
import { renderKpiCard } from "../modules/kpi-card.js";
import { renderChartWorkspace } from "../modules/chart-workspace.js";
import { renderActivityFeed } from "../modules/activity-feed.js";
import { renderAttentionList } from "../modules/attention-list.js";
import { METRICS, direction, periodLabel, seriesFor } from "../modules/metrics.js";
import { openCustomerDrawer, closeCustomerDrawer } from "../modules/customer-drawer.js";
import { captureControlFocus, restoreControlFocus } from "../utils/focus.js";

function buildCardConfigs(range, timeseries) {
  return METRICS.map((metric) => ({
    id: metric.id,
    label: metric.label,
    value: metric.formatValue(range[metric.kpiField].current),
    deltaText: metric.formatDelta(range),
    direction: direction(metric.getDelta(range)),
    periodLabel: periodLabel(range),
    sparklineValues: seriesFor(metric, range, timeseries).map((point) => point.value),
  }));
}

export function renderOverviewView(section) {
  const root = document.querySelector("#view-root");

  function render() {
    const snapshot = captureControlFocus(root);
    const { data, filters, settings } = getState();
    const range = data.kpis.ranges.find((r) => r.range === filters.dateRange) || data.kpis.ranges[0];

    root.innerHTML = `<h1>${section.label}</h1>`;

    const grid = document.createElement("section");
    grid.className = "kpi-grid";
    grid.setAttribute("aria-labelledby", "kpi-grid-title");
    const gridTitle = document.createElement("h2");
    gridTitle.id = "kpi-grid-title";
    gridTitle.className = "visually-hidden";
    gridTitle.textContent = "Key metrics";
    grid.appendChild(gridTitle);
    for (const config of buildCardConfigs(range, data.timeseries)) {
      grid.appendChild(renderKpiCard(config));
    }
    root.appendChild(grid);
    root.appendChild(renderChartWorkspace());
    root.appendChild(renderActivityFeed(data.activity.rows));
    if (settings.notifications.showAttentionList) {
      root.appendChild(
        renderAttentionList(data.customers.rows, (customer, triggerEl) =>
          openCustomerDrawer(customer, data.transactions.rows, triggerEl)
        )
      );
    }

    restoreControlFocus(root, snapshot);
  }

  render();
  const unsubscribe = subscribe(render);
  return () => {
    unsubscribe();
    closeCustomerDrawer();
  };
}
