/*
  Contour — toast (M6)

  A single persistent, lazily-built region (same one-instance-reused
  approach as M5's customer-drawer.js) for brief confirmations — "247 rows
  exported" and the like. role="status" + aria-live="polite" means
  screen-reader users hear it without focus ever having to move, which
  matters here since the triggering button (an export button) stays right
  where the user's focus already is.
*/

let toastEl = null;
let hideTimer = null;

function ensureBuilt() {
  if (toastEl) return;
  toastEl = document.createElement("div");
  toastEl.className = "toast";
  toastEl.setAttribute("role", "status");
  toastEl.setAttribute("aria-live", "polite");
  toastEl.hidden = true;
  document.body.appendChild(toastEl);
}

export function showToast(message, { duration = 3000 } = {}) {
  ensureBuilt();
  clearTimeout(hideTimer);
  toastEl.textContent = message;
  toastEl.hidden = false;
  // Force a reflow so re-triggering the same message while already visible
  // still restarts the transition instead of no-op'ing on an unchanged class.
  void toastEl.offsetWidth;
  toastEl.classList.add("is-visible");
  hideTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
    toastEl.hidden = true;
  }, duration);
}
