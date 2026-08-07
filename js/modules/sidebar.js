/*
  Contour — sidebar module

  Owns two things that both live on the same DOM element: the nav list
  (rendered from data) and the drawer behavior that presentation takes on
  below the shell breakpoint. Desktop persistent sidebar and mobile drawer
  are the same markup — this module doesn't need to know which one is
  currently active; CSS handles that.

  Drawer open/close/inert/focus behavior itself is js/utils/drawer.js (M5)
  — shared with the customer-detail drawer rather than a second
  implementation. This module just supplies the nav-specific bits: which
  elements go inert, where focus lands on open, and the trigger's
  aria-expanded state.
*/

import { createDrawerController } from "../utils/drawer.js";

const DESKTOP_QUERY = "(min-width: 1024px)";

let sidebarEl;
let menuTriggerEl;
let closeButtonEl;
let navListEl;
let drawer;

export function renderNav(sections) {
  navListEl = document.querySelector("#nav-list");
  navListEl.innerHTML = "";

  for (const section of sections) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = section.route;
    link.className = "nav-list__link";
    link.dataset.sectionId = section.id;
    link.innerHTML = `
      <svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#${section.icon}"></use></svg>
      <span>${section.label}</span>
    `;
    li.appendChild(link);
    navListEl.appendChild(li);
  }
}

export function setActiveSection(sectionId) {
  const links = navListEl.querySelectorAll(".nav-list__link");
  for (const link of links) {
    const isActive = link.dataset.sectionId === sectionId;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

export function initDrawerBehavior() {
  sidebarEl = document.querySelector("#sidebar");
  const overlayEl = document.querySelector("#drawer-overlay");
  menuTriggerEl = document.querySelector("#menu-trigger");
  closeButtonEl = document.querySelector("#drawer-close");
  const mainEl = document.querySelector("#main-content");
  const topbarEl = document.querySelector("#topbar");

  drawer = createDrawerController({
    panelEl: sidebarEl,
    overlayEl,
    getInertTargets: () => [mainEl, topbarEl],
    focusOnOpen: () => closeButtonEl,
    onOpen: () => menuTriggerEl.setAttribute("aria-expanded", "true"),
    onClose: () => menuTriggerEl.setAttribute("aria-expanded", "false"),
  });

  menuTriggerEl.addEventListener("click", () => drawer.open(menuTriggerEl));
  closeButtonEl.addEventListener("click", () => drawer.close());

  // If the viewport crosses into the persistent-sidebar breakpoint while
  // the drawer is open, drop the open state so inert/scroll-lock don't
  // linger on a layout where they no longer apply.
  window.matchMedia(DESKTOP_QUERY).addEventListener("change", (event) => {
    if (event.matches && drawer.isOpen()) drawer.close({ returnFocus: false });
  });
}

export function closeDrawer(options) {
  drawer.close(options);
}

export function isDrawerOpen() {
  return drawer.isOpen();
}
