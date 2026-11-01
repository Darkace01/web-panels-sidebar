"use strict";

// Chrome (Manifest V3) service worker. It can be stopped and restarted at any
// time, so nothing important is kept in variables: state lives in storage and
// the network rules are rebuilt from it.
importScripts("lib/compat.js", "lib/store.js");

const EXT_ID = chrome.runtime.id;
const FRAME_RULE_ID = 1;
const MOBILE_RULE_BASE = 1000;

const RV = /Chrome\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? "130.0.0.0";
const MOBILE_UA = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${RV} Mobile Safari/537.36`;

const hostOf = u => {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
};

// ---- Network rules ---------------------------------------------------------
// Blocking webRequest is gone in Manifest V3, so declarativeNetRequest does the
// work. Chrome can only remove whole headers, not edit them: framing headers go
// (including the whole Content-Security-Policy of a panel's top frame), and
// cookies can't be rewritten, so some logins inside panels may not stick.

async function syncRules() {
  const { panels } = await Store.get();

  const rules = [
    {
      id: FRAME_RULE_ID,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "x-frame-options", operation: "remove" },
          { header: "content-security-policy", operation: "remove" },
        ],
      },
      // Only pages the sidebar itself frames; normal tabs are untouched.
      condition: { resourceTypes: ["sub_frame"], initiatorDomains: [EXT_ID] },
    },
  ];

  // Mobile view: a mobile User-Agent for requests that aren't tied to a tab
  // (the side panel's frames), limited to that panel's site.
  const mobileHosts = [...new Set(panels.filter(p => p.mobile).map(p => hostOf(p.url)).filter(Boolean))];
  mobileHosts.forEach((host, i) => {
    rules.push({
      id: MOBILE_RULE_BASE + i,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [{ header: "user-agent", operation: "set", value: MOBILE_UA }],
      },
      condition: { requestDomains: [host], tabIds: [-1] },
    });
  });

  const old = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map(r => r.id),
    addRules: rules,
  });
}

chrome.runtime.onInstalled.addListener(() => {
  syncRules().catch(console.error);
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  chrome.contextMenus.create({
    id: "add-page",
    title: "Send to Web Panels",
    contexts: ["page", "link"],
  });
});
chrome.runtime.onStartup.addListener(() => syncRules().catch(console.error));
chrome.storage.onChanged.addListener(changes => {
  if (changes.panels) syncRules().catch(console.error);
});

// ---- Add pages and open panels from outside the side panel -----------------
// sidePanel.open() must be called synchronously inside the user action.

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (tab?.windowId != null) chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
  const fromLink = !!info.linkUrl;
  await Store.addPanel({
    url: fromLink ? info.linkUrl : info.pageUrl || tab?.url,
    name: fromLink ? info.linkText : tab?.title,
    icon: fromLink ? "" : tab?.favIconUrl,
  });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (tab?.windowId != null) chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});

  const slot = /^open-panel-([1-9])$/.exec(command);
  if (slot) {
    const { panels } = await Store.get();
    const p = panels[Number(slot[1]) - 1];
    if (p) await Store.set({ lastId: p.id, openRequest: { id: p.id, t: Date.now() } });
  } else if (command === "add-current-page" && tab) {
    await Store.addPanel({ url: tab.url, name: tab.title, icon: tab.favIconUrl });
  }
});
