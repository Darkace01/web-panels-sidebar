"use strict";

// Loaded first by every extension page and by the background script.
// Chrome only has `chrome.*` (promise-based in Manifest V3); Firefox has both.
if (typeof globalThis.browser === "undefined") globalThis.browser = globalThis.chrome;

// Everything that differs between the Firefox/Zen build and the Chrome build
// lives here, so the shared sidebar code never checks the browser itself.
const Platform = {
  // Chrome and other Chromium browsers use the sidePanel API.
  hasSidePanel: !!globalThis.chrome?.sidePanel,

  // Firefox: the sidebar can be shrunk to just the icon rail (with the optional
  // userChrome tweaks). Chrome's side panel can't be resized by an extension.
  get canShrink() {
    return !this.hasSidePanel;
  },

  // Search engine used when the browser's default can't be read.
  get fallbackEngine() {
    return this.hasSidePanel ? "google" : "duckduckgo";
  },

  notificationIcon: "icons/icon-128.png",

  // Tells the userChrome CSS (Firefox only) that only the rail should show.
  setRailOnly(railOnly, windowId) {
    if (this.hasSidePanel) return;
    browser.sidebarAction
      .setTitle({ title: railOnly ? "Web Panels - rail" : "Web Panels", ...(windowId ? { windowId } : {}) })
      .catch(() => {});
  },
};
