/*
  Contour — theme toggle sync

  There are two toggle buttons in the shell (sidebar footer, mobile
  topbar) because they're never visible at the same time — but both exist
  in the DOM simultaneously, so both need their icon/label kept in sync
  regardless of which one the user actually clicked.
*/

import { getPreferredTheme, setTheme } from "../theme.js";

function updateButtons(theme) {
  const isDark = theme === "dark";
  const iconId = isDark ? "moon" : "sun";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    button.setAttribute("aria-label", label);
    const use = button.querySelector("use");
    if (use) use.setAttribute("href", `assets/icons/sprite.svg#${iconId}`);
  }
}

function handleClick() {
  const next = getPreferredTheme() === "dark" ? "light" : "dark";
  setTheme(next);
}

export function initThemeToggles() {
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    button.addEventListener("click", handleClick);
  }
  updateButtons(getPreferredTheme());
  window.addEventListener("contour:theme", (event) => updateButtons(event.detail.theme));
}
