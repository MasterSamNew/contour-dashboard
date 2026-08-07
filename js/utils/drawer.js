/*
  Contour — generic drawer controller (M5)

  Extracted from M2's nav-sidebar drawer (js/modules/sidebar.js) so the M5
  customer-detail drawer reuses the exact same open/close/inert/focus
  behavior instead of a second hand-rolled implementation. The nav sidebar
  itself was refactored to call this too — same behavior, not a rewrite.

  Focus containment reuses M2's approach: everything outside the drawer is
  marked `inert`, so focus simply cannot leave it — no manual Tab-trap loop
  needed. Escape and overlay-click are wired once per controller instance.
*/

export function createDrawerController({ panelEl, overlayEl, getInertTargets, focusOnOpen, onOpen, onClose }) {
  let isOpen = false;
  let triggerEl = null;

  function open(trigger) {
    if (isOpen) return;
    isOpen = true;
    triggerEl = trigger || document.activeElement;
    panelEl.classList.add("is-open");
    if (overlayEl) overlayEl.hidden = false;
    for (const el of getInertTargets()) el.inert = true;
    document.body.style.overflow = "hidden";
    if (onOpen) onOpen();
    const focusTarget = focusOnOpen ? focusOnOpen() : panelEl;
    if (focusTarget) focusTarget.focus();
  }

  function close({ returnFocus = true } = {}) {
    if (!isOpen) return;
    isOpen = false;
    panelEl.classList.remove("is-open");
    if (overlayEl) overlayEl.hidden = true;
    for (const el of getInertTargets()) el.inert = false;
    document.body.style.overflow = "";
    if (onClose) onClose();
    if (returnFocus && triggerEl) triggerEl.focus();
    triggerEl = null;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) close();
  });

  if (overlayEl) overlayEl.addEventListener("click", () => close());

  return { open, close, isOpen: () => isOpen };
}
