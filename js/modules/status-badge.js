/*
  Contour — status badge (M5)

  Generic tone-based pill, shared by the Customers and Transactions tables
  (and the attention list) so "active"/"paid"/"past_due"/etc. don't each
  get their own bespoke markup. The status word itself is always the
  visible text content — color is a supplementary cue layered on top of
  it, never the only signal.
*/

export function renderStatusBadge({ tone, label }) {
  const span = document.createElement("span");
  span.className = `status-badge status-badge--${tone}`;
  span.textContent = label;
  return span;
}
