/*
  Contour — app bootstrap (M2)

  Boot sequence: apply theme -> load data -> build the shell (nav + drawer
  + theme toggles) from that data -> start the router. A data-load failure
  is a real scenario for a fetch()-based static app (wrong path, missing
  file, server misconfigured), so it gets a real retry-capable error state
  rather than a silent console-only failure.
*/

import { initTheme } from "./theme.js";
import { loadData, getState, subscribe } from "./state.js";
import { loadPersistedSettings } from "./modules/settings-store.js";
import { initRouter } from "./router.js";
import { renderNav, setActiveSection, initDrawerBehavior, closeDrawer, isDrawerOpen } from "./modules/sidebar.js";
import { initThemeToggles } from "./modules/theme-toggle.js";
import { renderOverviewView } from "./views/overview.js";
import { renderAnalyticsView } from "./views/analytics.js";
import { renderCustomersView } from "./views/customers.js";
import { renderTransactionsView } from "./views/transactions.js";
import { renderReportsView } from "./views/reports.js";
import { renderSettingsView } from "./views/settings.js";

const VIEW_RENDERERS = {
  overview: renderOverviewView,
  analytics: renderAnalyticsView,
  customers: renderCustomersView,
  transactions: renderTransactionsView,
  reports: renderReportsView,
  settings: renderSettingsView,
};

// Every nav.json section has a real view as of M6 — this only fires if a
// future section is added to the data without a matching renderer yet.
function renderFallbackView(section) {
  document.querySelector("#view-root").innerHTML = `<h1>${section.label}</h1>`;
}

// Real views (unlike the placeholder) subscribe to state.js so a metric/
// date-range change re-renders them without a navigation event. That
// subscription has to be torn down when the user navigates away, or it
// keeps firing (and rebuilding DOM no one can see) for every view they've
// ever visited. Each real view's render function returns its own
// unsubscribe; this just remembers the current one and calls it first.
let currentViewCleanup = null;

// Audit fix (A2): the router fires handleNavigate once during boot as well
// as on every subsequent in-app navigation. Focusing #main-content after
// every call — including that first boot call — meant a keyboard user's
// very first Tab press landed inside the page content, silently skipping
// the skip link and the entire nav (confirmed via Shift+Tab: they're still
// in the DOM/tab order, just unreachable going forward). Moving focus to
// main content is the right call for a real navigation the user triggered;
// it's wrong for the page's first paint, where standard Tab-from-the-top
// behavior (skip link first) is what a keyboard user expects.
let isFirstNavigation = true;

function renderLoading() {
  document.querySelector("#view-root").innerHTML = `<p role="status">Loading Contour…</p>`;
}

function renderError(message) {
  const root = document.querySelector("#view-root");
  root.innerHTML = `
    <div class="error-state">
      <h1>Something went wrong</h1>
      <p role="alert">${message}</p>
      <button type="button" id="retry-load">Try again</button>
    </div>
  `;
  document.querySelector("#retry-load").addEventListener("click", boot);
}

function initials(name) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function renderAccountBadges() {
  const { data, settings } = getState();
  const workspace = data.kpis.workspace;
  const owner = (settings.profile && settings.profile.name) || workspace.owner;
  const role = (settings.profile && settings.profile.role) || workspace.role;
  const mark = initials(owner);
  document.querySelector("#avatar-mobile").textContent = mark;
  document.querySelector("#avatar-desktop").textContent = mark;
  document.querySelector("#account-name").textContent = owner;
  document.querySelector("#account-role").textContent = `${role} · ${workspace.name}`;
}

function handleNavigate(section) {
  setActiveSection(section.id);
  document.querySelector("#topbar-title").textContent = section.label;
  document.title = `${section.label} · Contour`;
  if (currentViewCleanup) {
    currentViewCleanup();
    currentViewCleanup = null;
  }

  const renderView = VIEW_RENDERERS[section.id] || renderFallbackView;
  currentViewCleanup = renderView(section) || null;

  if (isDrawerOpen()) closeDrawer();
  if (!isFirstNavigation) document.querySelector("#main-content").focus();
  isFirstNavigation = false;
}

async function boot() {
  initTheme();
  renderLoading();

  try {
    await loadData();
  } catch (error) {
    renderError(`Data failed to load: ${error.message}`);
    return;
  }

  loadPersistedSettings();

  const { data } = getState();
  renderNav(data.nav.sections);
  renderAccountBadges();
  subscribe(renderAccountBadges); // profile edits on Settings (M6) reflect here live
  initDrawerBehavior();
  initThemeToggles();
  initRouter(handleNavigate);
}

boot();
