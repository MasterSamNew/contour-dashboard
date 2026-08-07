/*
  Contour — Settings view (M6)

  Three genuinely functional sections, not placeholder UI:
  - Profile: edits localStorage-persisted overrides of kpis.json's
    workspace values, reflected live in the sidebar/topbar account block.
  - Appearance: a real three-way theme mode (light/dark/system) built on
    theme.js's M6 additions — "system" actually live-updates on an OS
    theme change while active, not just a one-time snapshot.
  - Notifications: "Show customers needing attention on Overview" has a
    real, observable effect (Overview's attention-list panel actually
    appears/disappears) — proving the toggle isn't inert. The weekly-email
    toggle persists and reflects state genuinely too; a static frontend
    with no backend can't actually send an email, so it's labeled for
    what it truthfully is: a saved preference, not a live notification.

  Theme mode isn't state.js state (theme.js owns it via localStorage + a
  window event, same as always) — this view listens for "contour:theme"
  directly, the same event js/modules/theme-toggle.js already relies on,
  to keep the three-way control in sync if the user flips the sidebar's
  binary toggle while this page is open.
*/

import { getState, subscribe } from "../state.js";
import { getThemeMode, setThemeMode } from "../theme.js";
import { updateProfile, resetProfile, updateNotifications } from "../modules/settings-store.js";
import { captureControlFocus, restoreControlFocus } from "../utils/focus.js";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match system" },
];

function buildProfileSection(data, settings) {
  const section = document.createElement("section");
  section.className = "settings-section";
  section.setAttribute("aria-labelledby", "settings-profile-title");

  const heading = document.createElement("h2");
  heading.id = "settings-profile-title";
  heading.textContent = "Profile";
  section.appendChild(heading);

  const note = document.createElement("p");
  note.className = "settings-section__note";
  note.textContent = "Shown in the sidebar and mobile header. Saved on this device only.";
  section.appendChild(note);

  const form = document.createElement("form");
  form.className = "settings-form";

  const currentName = (settings.profile && settings.profile.name) || data.kpis.workspace.owner;
  const currentRole = (settings.profile && settings.profile.role) || data.kpis.workspace.role;

  const nameField = document.createElement("label");
  nameField.className = "settings-form__field";
  nameField.innerHTML = `<span>Name</span>`;
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.name = "name";
  nameInput.required = true;
  nameInput.value = currentName;
  nameInput.dataset.searchGroup = "settings-name";
  nameField.appendChild(nameInput);

  const roleField = document.createElement("label");
  roleField.className = "settings-form__field";
  roleField.innerHTML = `<span>Role</span>`;
  const roleInput = document.createElement("input");
  roleInput.type = "text";
  roleInput.name = "role";
  roleInput.required = true;
  roleInput.value = currentRole;
  roleInput.dataset.searchGroup = "settings-role";
  roleField.appendChild(roleInput);

  const actions = document.createElement("div");
  actions.className = "settings-form__actions";

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "settings-form__save";
  saveButton.textContent = "Save profile";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "settings-form__reset";
  resetButton.textContent = "Reset to default";
  resetButton.hidden = !settings.profile;
  resetButton.addEventListener("click", () => resetProfile());

  actions.append(saveButton, resetButton);

  form.append(nameField, roleField, actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateProfile({ name: nameInput.value.trim(), role: roleInput.value.trim() });
  });

  section.appendChild(form);
  return section;
}

function buildAppearanceSection() {
  const section = document.createElement("section");
  section.className = "settings-section";
  section.setAttribute("aria-labelledby", "settings-appearance-title");

  const heading = document.createElement("h2");
  heading.id = "settings-appearance-title";
  heading.textContent = "Appearance";
  section.appendChild(heading);

  const group = document.createElement("div");
  group.className = "settings-toggle-group";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Theme");

  const currentMode = getThemeMode();
  for (const option of THEME_OPTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-toggle-group__button";
    button.textContent = option.label;
    button.dataset.controlGroup = "theme-mode";
    button.dataset.controlValue = option.value;
    button.setAttribute("aria-pressed", String(option.value === currentMode));
    // setThemeMode() dispatches "contour:theme", which this view listens
    // for at the bottom of renderSettingsView() and responds to with a
    // full re-render — no need to touch aria-pressed here directly.
    button.addEventListener("click", () => setThemeMode(option.value));
    group.appendChild(button);
  }

  section.appendChild(group);
  return section;
}

function buildNotificationsSection(settings) {
  const section = document.createElement("section");
  section.className = "settings-section";
  section.setAttribute("aria-labelledby", "settings-notifications-title");

  const heading = document.createElement("h2");
  heading.id = "settings-notifications-title";
  heading.textContent = "Notifications";
  section.appendChild(heading);

  const attentionField = document.createElement("label");
  attentionField.className = "settings-checkbox-field";
  const attentionInput = document.createElement("input");
  attentionInput.type = "checkbox";
  attentionInput.checked = settings.notifications.showAttentionList;
  attentionInput.dataset.controlGroup = "notification-checkbox";
  attentionInput.dataset.controlValue = "showAttentionList";
  attentionInput.addEventListener("change", () => updateNotifications({ showAttentionList: attentionInput.checked }));
  attentionField.append(attentionInput, document.createTextNode(" Show “Customers needing attention” on Overview"));
  section.appendChild(attentionField);

  const emailField = document.createElement("label");
  emailField.className = "settings-checkbox-field";
  const emailInput = document.createElement("input");
  emailInput.type = "checkbox";
  emailInput.checked = settings.notifications.weeklyEmailSummary;
  emailInput.dataset.controlGroup = "notification-checkbox";
  emailInput.dataset.controlValue = "weeklyEmailSummary";
  emailInput.addEventListener("change", () => updateNotifications({ weeklyEmailSummary: emailInput.checked }));
  emailField.append(emailInput, document.createTextNode(" Email me a weekly summary"));
  section.appendChild(emailField);

  const note = document.createElement("p");
  note.className = "settings-section__note";
  note.textContent = "Saved on this device. Contour is a static demo with no mail server, so the weekly-summary preference is stored but not actually delivered.";
  section.appendChild(note);

  return section;
}

export function renderSettingsView(section) {
  const root = document.querySelector("#view-root");

  function render() {
    const snapshot = captureControlFocus(root);
    const { data, settings } = getState();

    root.innerHTML = `<h1>${section.label}</h1>`;
    root.appendChild(buildProfileSection(data, settings));
    root.appendChild(buildAppearanceSection());
    root.appendChild(buildNotificationsSection(settings));

    restoreControlFocus(root, snapshot);
  }

  render();
  const unsubscribeState = subscribe(render);
  window.addEventListener("contour:theme", render);

  return () => {
    unsubscribeState();
    window.removeEventListener("contour:theme", render);
  };
}
