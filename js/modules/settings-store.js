/*
  Contour — settings persistence (M6)

  Same division of labor as theme.js: this module owns localStorage
  read/write and keeps state.js's `settings` slice in sync, so the
  Settings view (and anything else that cares, like Overview's attention
  list) only ever reads getState().settings — nothing outside this module
  touches localStorage directly.
*/

import { getState, setState } from "../state.js";

const STORAGE_KEY = "contour:settings";

const DEFAULT_NOTIFICATIONS = { showAttentionList: true, weeklyEmailSummary: false };

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* localStorage unavailable — the setting still applies for this session via state */
  }
}

export function loadPersistedSettings() {
  const stored = readStorage();
  const settings = {
    profile: stored.profile || null,
    notifications: { ...DEFAULT_NOTIFICATIONS, ...(stored.notifications || {}) },
  };
  setState({ settings });
  return settings;
}

export function updateProfile(patch) {
  const { settings } = getState();
  const next = { ...settings, profile: { ...(settings.profile || {}), ...patch } };
  setState({ settings: next });
  writeStorage(next);
}

export function resetProfile() {
  const { settings } = getState();
  const next = { ...settings, profile: null };
  setState({ settings: next });
  writeStorage(next);
}

export function updateNotifications(patch) {
  const { settings } = getState();
  const next = { ...settings, notifications: { ...settings.notifications, ...patch } };
  setState({ settings: next });
  writeStorage(next);
}
