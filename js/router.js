/*
  Contour — hash-based SPA router

  Owns translating window.location.hash into a nav section and notifying
  a single callback when it changes. Does not render anything itself —
  app.js decides what a navigation event means for the DOM.
*/

import { getState, setState } from "./state.js";

function parseSectionId(hash) {
  return hash.replace(/^#\/?/, "") || null;
}

function resolveSection(sectionId, sections) {
  return sections.find((section) => section.id === sectionId) || sections[0];
}

let onNavigate = null;

export function initRouter(navigateCallback) {
  onNavigate = navigateCallback;
  window.addEventListener("hashchange", handleRouteChange);
  handleRouteChange();
}

function handleRouteChange() {
  const { data } = getState();
  const sections = data.nav.sections;
  const requestedId = parseSectionId(window.location.hash);
  const section = resolveSection(requestedId, sections);

  // Normalize a missing or unrecognized hash to the resolved section's real
  // route. This re-fires handleRouteChange via the hashchange it triggers.
  if (window.location.hash !== section.route) {
    window.location.hash = section.route;
    return;
  }

  setState({ activeView: section.id });
  if (onNavigate) onNavigate(section);
}
