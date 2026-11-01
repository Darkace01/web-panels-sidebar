"use strict";

// Reports the first real user interaction in a page so the background script
// can open the sidebar (browsers only allow that during a user action).
(() => {
  const send = () => {
    for (const type of events) removeEventListener(type, send, true);
    browser.runtime.sendMessage({ type: "page-interaction" }).catch(() => {});
  };
  const events = ["pointerdown", "keydown"];
  for (const type of events) addEventListener(type, send, { capture: true, passive: true });
})();
