/*
  Contour — chart (M4)

  Hand-rolled SVG line/area chart. No charting library. The "topographic"
  read comes from redrawing the same horizontal gridlines a second time,
  clipped to the area shape at higher contrast — like elevation contours
  crossing shaded terrain — instead of a gradient fill.

  The SVG itself is decorative (aria-hidden): the real accessible
  equivalent is the <details> data table appended alongside it, built from
  the exact same `series` array the SVG geometry comes from, so the two
  can never drift apart. Keyboard/hover interaction is a set of real HTML
  <button> hotspots overlaid on the SVG by viewBox-fraction position — the
  same technique the M3 sparkline established for translating SVG
  coordinates onto the page — rather than trying to make SVG shapes
  themselves focusable.
*/

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 280;
const PAD_LEFT = 56;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;
const Y_TICKS = 4;
const MAX_X_LABELS = 5;
const MAX_MARKERS = 31; // beyond this (90d), individual dots would just be noise — the line speaks for itself

let clipIdCounter = 0;

function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function pickLabelIndices(n) {
  if (n <= MAX_X_LABELS) return Array.from({ length: n }, (_, i) => i);
  const step = (n - 1) / (MAX_X_LABELS - 1);
  const indices = new Set();
  for (let i = 0; i < MAX_X_LABELS; i++) indices.add(Math.round(i * step));
  return [...indices];
}

function computeDomain(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.12 || Math.abs(max || 1) * 0.05;
  return { min: min - pad, max: max + pad };
}

function yForValue(value, min, valueRange) {
  return PAD_TOP + PLOT_HEIGHT - ((value - min) / valueRange) * PLOT_HEIGHT;
}

function buildGeometry(series) {
  const { min, max } = computeDomain(series.map((p) => p.value));
  const valueRange = max - min || 1;
  const xStep = series.length > 1 ? PLOT_WIDTH / (series.length - 1) : 0;

  const points = series.map((p, i) => ({
    ...p,
    x: PAD_LEFT + (series.length > 1 ? i * xStep : PLOT_WIDTH / 2),
    y: yForValue(p.value, min, valueRange),
  }));

  const yTicks = Array.from({ length: Y_TICKS }, (_, i) => min + (i / (Y_TICKS - 1)) * valueRange);

  return { points, min, valueRange, yTicks };
}

function buildLinePath(points) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function buildAreaPath(points) {
  const baselineY = PAD_TOP + PLOT_HEIGHT;
  const first = points[0];
  const last = points[points.length - 1];
  return `${buildLinePath(points)} L${last.x.toFixed(2)},${baselineY} L${first.x.toFixed(2)},${baselineY} Z`;
}

function buildSvg({ points, min, valueRange, yTicks, areaPath, linePath, metric, clipId }) {
  const svg = svgEl("svg", {
    viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`,
    preserveAspectRatio: "none",
    "aria-hidden": "true",
    focusable: "false",
    class: "chart__svg",
  });

  const defs = svgEl("defs", {});
  const clipPath = svgEl("clipPath", { id: clipId });
  clipPath.appendChild(svgEl("path", { d: areaPath }));
  defs.appendChild(clipPath);
  svg.appendChild(defs);

  const gridGroup = svgEl("g", { class: "chart__grid" });
  for (const tick of yTicks) {
    const y = yForValue(tick, min, valueRange);
    gridGroup.appendChild(
      svgEl("line", { x1: PAD_LEFT, x2: VIEW_WIDTH - PAD_RIGHT, y1: y.toFixed(2), y2: y.toFixed(2), class: "chart__gridline" })
    );
    const label = svgEl("text", { x: PAD_LEFT - 8, y: (y + 3).toFixed(2), class: "chart__axis-label chart__axis-label--y", "text-anchor": "end" });
    label.textContent = metric.formatValue(tick);
    gridGroup.appendChild(label);
  }
  svg.appendChild(gridGroup);

  svg.appendChild(svgEl("path", { d: areaPath, class: "chart__area" }));

  // Same y-ticks again, clipped to the area shape, at higher contrast —
  // reads as elevation contours crossing shaded terrain rather than a flat fill.
  const contourGroup = svgEl("g", { class: "chart__contours", "clip-path": `url(#${clipId})` });
  for (const tick of yTicks) {
    const y = yForValue(tick, min, valueRange);
    contourGroup.appendChild(
      svgEl("line", { x1: PAD_LEFT, x2: VIEW_WIDTH - PAD_RIGHT, y1: y.toFixed(2), y2: y.toFixed(2), class: "chart__contour-line" })
    );
  }
  svg.appendChild(contourGroup);

  const xLabelGroup = svgEl("g", { class: "chart__x-labels" });
  const labelIndices = new Set(pickLabelIndices(points.length));
  points.forEach((p, i) => {
    if (!labelIndices.has(i)) return;
    const anchor = i === 0 ? "start" : i === points.length - 1 ? "end" : "middle";
    const label = svgEl("text", { x: p.x.toFixed(2), y: VIEW_HEIGHT - 8, class: "chart__axis-label chart__axis-label--x", "text-anchor": anchor });
    label.textContent = p.label;
    xLabelGroup.appendChild(label);
  });
  svg.appendChild(xLabelGroup);

  const linePathEl = svgEl("path", { d: linePath, class: "chart__line" });
  svg.appendChild(linePathEl);

  if (points.length <= MAX_MARKERS) {
    const markerGroup = svgEl("g", { class: "chart__markers" });
    for (const p of points) {
      markerGroup.appendChild(svgEl("circle", { cx: p.x.toFixed(2), cy: p.y.toFixed(2), r: 3, class: "chart__marker" }));
    }
    svg.appendChild(markerGroup);
  }

  return { svg, linePathEl };
}

// One-shot stroke draw-in. Not gated behind an extra media query: base.css
// already forces every transition-duration to ~0 under prefers-reduced-
// motion, so this collapses to an instant, non-repeating appearance there
// with no special-casing needed here.
function animateLineDrawIn(linePathEl) {
  requestAnimationFrame(() => {
    const length = linePathEl.getTotalLength();
    linePathEl.style.strokeDasharray = `${length}`;
    linePathEl.style.strokeDashoffset = `${length}`;
    requestAnimationFrame(() => {
      linePathEl.style.strokeDashoffset = "0";
    });
  });
}

function buildInteractionLayer(points, metric) {
  const wrap = document.createElement("div");
  wrap.className = "chart__svg-wrap";

  const tooltip = document.createElement("div");
  tooltip.className = "chart__tooltip";
  tooltip.setAttribute("aria-hidden", "true");
  tooltip.hidden = true;

  const showTooltip = (point) => {
    tooltip.textContent = `${point.label}: ${metric.formatValue(point.value)}`;
    tooltip.style.left = `${(point.x / VIEW_WIDTH) * 100}%`;
    tooltip.style.top = `${(point.y / VIEW_HEIGHT) * 100}%`;
    tooltip.hidden = false;
  };
  const hideTooltip = () => {
    tooltip.hidden = true;
  };

  // Audit fix (A2/A1): at 90 points the same 640-unit width gives each
  // hotspot ~5px of center-to-center spacing against a 24px hit target —
  // measured overlap of ~4 neighboring hotspots each direction, both for
  // mouse (unpredictable which point actually triggers) and keyboard (90
  // sequential, largely redundant Tab stops before reaching anything
  // past the chart). Gated behind the same MAX_MARKERS threshold already
  // used to suppress the visual dots for the same reason — the line plus
  // the always-present accessible data table remain fully sufficient.
  const hotspots = [];
  if (points.length <= MAX_MARKERS) {
    for (const p of points) {
      const hotspot = document.createElement("button");
      hotspot.type = "button";
      hotspot.className = "chart__hotspot";
      hotspot.style.left = `${(p.x / VIEW_WIDTH) * 100}%`;
      hotspot.style.top = `${(p.y / VIEW_HEIGHT) * 100}%`;
      hotspot.setAttribute("aria-label", `${p.label}: ${metric.formatValue(p.value)}`);
      hotspot.addEventListener("mouseenter", () => showTooltip(p));
      hotspot.addEventListener("focus", () => showTooltip(p));
      hotspot.addEventListener("mouseleave", hideTooltip);
      hotspot.addEventListener("blur", hideTooltip);
      hotspots.push(hotspot);
    }
  }

  return { wrap, tooltip, hotspots };
}

function buildDataTable(points, metric, range) {
  const details = document.createElement("details");
  details.className = "chart__details";

  const summary = document.createElement("summary");
  summary.textContent = "View data table";
  details.appendChild(summary);

  const table = document.createElement("table");
  table.className = "chart__table";
  const rowsHtml = points
    .map((p) => `<tr><th scope="row">${p.label}</th><td class="tabular-nums">${metric.formatValue(p.value)}</td></tr>`)
    .join("");
  table.innerHTML = `
    <caption class="visually-hidden">${metric.label} by data point, ${range.label}</caption>
    <thead><tr><th scope="col">Date</th><th scope="col">${metric.label}</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  `;
  details.appendChild(table);

  return details;
}

export function renderChartFigure({ metric, range, series }) {
  clipIdCounter += 1;
  const clipId = `chart-area-clip-${clipIdCounter}`;

  const { points, min, valueRange, yTicks } = buildGeometry(series);
  const linePath = buildLinePath(points);
  const areaPath = buildAreaPath(points);

  const { svg, linePathEl } = buildSvg({ points, min, valueRange, yTicks, areaPath, linePath, metric, clipId });
  animateLineDrawIn(linePathEl);

  const { wrap, tooltip, hotspots } = buildInteractionLayer(points, metric);
  wrap.appendChild(svg);
  wrap.appendChild(tooltip);
  for (const hotspot of hotspots) wrap.appendChild(hotspot);

  const figure = document.createElement("figure");
  figure.className = "chart__figure";
  figure.appendChild(wrap);
  figure.appendChild(buildDataTable(points, metric, range));

  return figure;
}
