/*
  Contour — central state store

  A single plain-object store with a minimal subscribe/notify mechanism.
  No virtual DOM, no framework: each view module (added from M2 onward)
  subscribes and re-renders only the DOM region it owns when a relevant
  state slice changes. This module owns the shape of state and how it's
  read/written — it does not know about any specific view.
*/

const DATA_ENDPOINTS = {
  kpis: "data/kpis.json",
  timeseries: "data/timeseries.json",
  customers: "data/customers.json",
  transactions: "data/transactions.json",
  activity: "data/activity.json",
  nav: "data/nav.json",
};

const state = {
  theme: "light",
  activeView: null, // set by router.js in M2
  filters: {
    dateRange: "30d", // Overview/Analytics default — see M1 report for rationale
    metric: "revenue",
  },
  // Customers and Transactions each get their own search/filter/sort/page
  // slice (M5) rather than one shared shape — their columns/filters differ,
  // and a search typed into one table has no business clearing the other's.
  tables: {
    customers: { search: "", status: "all", sortKey: "name", sortDir: "asc", page: 1 },
    transactions: { search: "", status: "all", sortKey: "date", sortDir: "desc", page: 1 },
  },
  // Settings (M6). `profile: null` means "use kpis.json's workspace values
  // unmodified" — Settings only overrides what the user actually edits.
  // Populated for real at boot from localStorage by settings-store.js, same
  // persistence pattern theme.js already uses; this is just the shape.
  settings: {
    profile: null,
    notifications: { showAttentionList: true, weeklyEmailSummary: false },
  },
  data: {
    kpis: null,
    timeseries: null,
    customers: null,
    transactions: null,
    activity: null,
    nav: null,
  },
  status: {
    dataLoaded: false,
    dataError: null,
  },
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const listener of listeners) listener(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadData() {
  try {
    const entries = await Promise.all(
      Object.entries(DATA_ENDPOINTS).map(async ([key, url]) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load ${url} (HTTP ${response.status})`);
        }
        return [key, await response.json()];
      })
    );
    const data = Object.fromEntries(entries);
    setState({ data, status: { dataLoaded: true, dataError: null } });
    return data;
  } catch (error) {
    setState({ status: { dataLoaded: false, dataError: error.message } });
    throw error;
  }
}
