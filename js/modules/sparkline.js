/*
  Contour — sparkline

  A minimal inline-SVG trend line. Stroke color is not set here — it reads
  currentColor, so the KPI card controls it via a CSS class (positive/
  negative/neutral) the same way icon-button.css already does for icons.
  Decorative only: the card's text value/delta already state the number,
  so the SVG is aria-hidden and needs no data-table fallback.
*/

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 32;
const PADDING_Y = 4;

function buildPoints(values) {
  if (values.length === 1) {
    const mid = VIEW_HEIGHT / 2;
    return [
      [0, mid],
      [VIEW_WIDTH, mid],
    ];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const usableHeight = VIEW_HEIGHT - PADDING_Y * 2;
  const step = VIEW_WIDTH / (values.length - 1);

  return values.map((value, i) => {
    const normalized = range === 0 ? 0.5 : (value - min) / range;
    const y = VIEW_HEIGHT - PADDING_Y - normalized * usableHeight;
    return [i * step, y];
  });
}

export function renderSparkline(values) {
  const points = buildPoints(values);
  const polylinePoints = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("sparkline__svg");

  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", polylinePoints);
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "currentColor");
  polyline.setAttribute("stroke-width", "2");
  polyline.setAttribute("stroke-linecap", "round");
  polyline.setAttribute("stroke-linejoin", "round");
  polyline.setAttribute("vector-effect", "non-scaling-stroke");
  svg.appendChild(polyline);

  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("cx", lastX.toFixed(2));
  dot.setAttribute("cy", lastY.toFixed(2));
  dot.setAttribute("r", "2.5");
  dot.setAttribute("fill", "currentColor");
  svg.appendChild(dot);

  return svg;
}
