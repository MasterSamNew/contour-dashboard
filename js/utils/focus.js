/*
  Contour — focus preservation across a full-region re-render (M4, extended M5)

  Views rebuild their content wholesale on every relevant state change (no
  vdom/diffing — state.js's own doc comment says as much). That destroys
  whatever element currently has focus. These two functions bridge the
  gap: snapshot which control was focused before the rebuild, then refocus
  its replacement after.

  Two kinds of control:
  - "control": a button identified by data-control-group/data-control-value
    (M4 chart controls; M5 table sort/filter/pagination buttons) — matched
    by that pair after rebuild.
  - "search": a text input identified by data-search-group (M5 table
    search box) — matched by that alone, with cursor position restored
    too, since a debounced commit (table.js) rebuilds the view after the
    user has paused typing but should still be able to continue from
    where they left off.
*/

export function captureControlFocus(root) {
  const active = document.activeElement;
  if (!root.contains(active)) return null;

  if (active.dataset && active.dataset.searchGroup) {
    return {
      kind: "search",
      group: active.dataset.searchGroup,
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd,
    };
  }

  if (active.dataset && active.dataset.controlGroup) {
    return { kind: "control", group: active.dataset.controlGroup, value: active.dataset.controlValue };
  }

  return null;
}

export function restoreControlFocus(root, snapshot) {
  if (!snapshot) return;

  if (snapshot.kind === "search") {
    const el = root.querySelector(`[data-search-group="${snapshot.group}"]`);
    if (!el) return;
    el.focus();
    if (typeof snapshot.selectionStart === "number") {
      el.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    }
    return;
  }

  const selector = `[data-control-group="${snapshot.group}"][data-control-value="${snapshot.value}"]`;
  const el = root.querySelector(selector);
  if (el) el.focus();
}
