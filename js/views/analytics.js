/*
  Contour — Analytics view (M4)

  Promotes the chart workspace to the primary/sole content, per spec —
  same renderChartWorkspace() Overview uses below its KPI row, just without
  the row above it here. Reactive to state.filters the same way Overview
  is, via state.js's subscribe().

  The customer/transaction tables this view's original placeholder
  promised are still M5 work and stay out of this module.
*/

import { subscribe } from "../state.js";
import { renderChartWorkspace } from "../modules/chart-workspace.js";
import { captureControlFocus, restoreControlFocus } from "../utils/focus.js";

export function renderAnalyticsView(section) {
  const root = document.querySelector("#view-root");

  function render() {
    const snapshot = captureControlFocus(root);

    root.innerHTML = `<h1>${section.label}</h1>`;
    root.appendChild(renderChartWorkspace());

    restoreControlFocus(root, snapshot);
  }

  render();
  return subscribe(render);
}
