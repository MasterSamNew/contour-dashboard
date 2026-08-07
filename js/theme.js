/*
  Contour — theme bootstrap

  This module owns theme detection, persistence, and application so that
  whichever UI builds a toggle control just calls setTheme() rather than
  re-implementing storage or system-preference logic. setTheme() also
  dispatches a "contour:theme" window event — M2 has two toggle buttons
  (sidebar footer + mobile topbar) that both need to reflect whichever one
  was actually clicked; see js/modules/theme-toggle.js.

  M6 adds a genuine third mode: "system" isn't just "whatever the OS
  happened to prefer at load time" — while active, an OS theme change
  updates the app live (see attachSystemListener). Settings (M6) is the
  only UI that exposes this three-way choice; theme-toggle.js's binary
  sun/moon button is unchanged and still just flips explicit light/dark,
  which continues to work correctly in every mode since it reads
  getPreferredTheme() (the currently *effective* theme) either way.

  Note: index.html also inlines a copy of the read-only detection logic in
  a blocking <head> script, so the correct theme applies before first paint
  (module scripts execute after HTML parsing, which would otherwise cause a
  flash of the wrong theme for dark-mode users). Keep STORAGE_KEY in sync
  with that inline snippet if it changes.
*/

const STORAGE_KEY = "contour:theme";
const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
let systemListenerAttached = false;

function systemTheme() {
  return systemQuery.matches ? "dark" : "light";
}

function handleSystemChange(event) {
  const theme = event.matches ? "dark" : "light";
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("contour:theme", { detail: { theme } }));
}

function attachSystemListener() {
  if (systemListenerAttached) return;
  systemQuery.addEventListener("change", handleSystemChange);
  systemListenerAttached = true;
}

function detachSystemListener() {
  if (!systemListenerAttached) return;
  systemQuery.removeEventListener("change", handleSystemChange);
  systemListenerAttached = false;
}

export function getPreferredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return systemTheme();
}

// "light" | "dark" | "system" — distinct from getPreferredTheme(), which
// only ever returns the two *effective* theme values. Settings' three-way
// control needs to know which of the three the user actually chose.
export function getThemeMode() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme) {
  detachSystemListener();
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("contour:theme", { detail: { theme } }));
}

export function setThemeMode(mode) {
  if (mode !== "system") {
    setTheme(mode);
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  attachSystemListener();
  const theme = systemTheme();
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("contour:theme", { detail: { theme } }));
}

export function initTheme() {
  if (getThemeMode() === "system") attachSystemListener();
  const theme = getPreferredTheme();
  applyTheme(theme);
  return theme;
}
