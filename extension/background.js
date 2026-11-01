"use strict";

const EXT = browser.runtime.getURL("");
const RV = /rv:([\d.]+)/.exec(navigator.userAgent)?.[1] ?? "140.0";
const MOBILE_UA = `Mozilla/5.0 (Android 14; Mobile; rv:${RV}) Gecko/${RV} Firefox/${RV}`;

let panels = [];
const lastUrl = new Map(); // panel id -> last top-level URL loaded in its frame

Store.get().then(s => (panels = s.panels));
browser.storage.onChanged.addListener(changes => {
  if (changes.panels) panels = changes.panels.newValue ?? [];
});

const hostOf = u => {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
};

const panelForHost = host =>
  panels.find(p => {
    const h = hostOf(p.url);
    return h && (host === h || host.endsWith("." + h));
  });

// For a request made by (or for) a panel frame, return that panel frame's
// URL, or null when the request has nothing to do with the sidebar.
const panelFrameUrl = d => {
  const anc = d.frameAncestors ?? [];
  const i = anc.findIndex(a => a.url.startsWith(EXT));
  if (i < 0) return null;
  if (i > 0) return anc[i - 1].url;
  return d.type === "sub_frame" ? d.url : d.documentUrl;
};

// Let sites load inside the sidebar: drop framing restrictions and make
// cookies usable in a cross-site frame (SameSite=None; Secure).
browser.webRequest.onHeadersReceived.addListener(
  d => {
    if (!panelFrameUrl(d)) return;
    const out = [];
    for (const h of d.responseHeaders) {
      const name = h.name.toLowerCase();
      if (name === "x-frame-options") continue;
      if (name === "content-security-policy" && h.value) {
        const value = h.value
          .split(";")
          .map(s => s.trim())
          .filter(s => s && !/^frame-ancestors\b/i.test(s))
          .join("; ");
        if (value) out.push({ name: h.name, value });
        continue;
      }
      if (name === "set-cookie" && h.value && d.url.startsWith("https:")) {
        const value = h.value.replace(/;\s*samesite=[^;]*/gi, "");
        out.push({ name: h.name, value: value + "; SameSite=None; Secure" });
        continue;
      }
      out.push(h);
    }
    return { responseHeaders: out };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "responseHeaders"]
);

// Mobile mode: send a mobile User-Agent header for that panel's requests.
browser.webRequest.onBeforeSendHeaders.addListener(
  d => {
    const frame = panelFrameUrl(d);
    if (!frame || !panelForHost(hostOf(frame))?.mobile) return;
    return {
      requestHeaders: d.requestHeaders.map(h =>
        h.name.toLowerCase() === "user-agent" ? { name: h.name, value: MOBILE_UA } : h
      ),
    };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

// Remember where each panel frame ended up, for reload and "open in tab".
browser.webRequest.onCompleted.addListener(
  d => {
    if (!d.documentUrl?.startsWith(EXT)) return;
    const p = panelForHost(hostOf(d.url));
    if (p) lastUrl.set(p.id, d.url);
  },
  { urls: ["<all_urls>"], types: ["sub_frame"] }
);

// ---- Open the sidebar on its own ------------------------------------------
// sidebarAction.open() only works inside a user action, so the first click or
// keypress in any web page after startup opens the sidebar (once per session;
// never again after it has been shown, so closing it sticks).

let autoOpenDone = false;

browser.runtime.onMessage.addListener(msg => {
  switch (msg?.type) {
    case "lastUrl":
      return Promise.resolve(lastUrl.get(msg.id) ?? null);
    case "sidebar-open":
      autoOpenDone = true;
      break;
    case "page-interaction":
      if (autoOpenDone) break;
      autoOpenDone = true;
      // Must be called synchronously, no await before it.
      browser.sidebarAction.open().catch(() => {
        autoOpenDone = false;
      });
      break;
  }
});

// ---- Add pages from outside the sidebar -----------------------------------
// sidebarAction.open() must run synchronously inside the user action.

// "tab" is the tab strip's right-click menu (needs the "menus" permission).
browser.menus.create({
  id: "add-page",
  title: "Send to Zen Sidebar",
  contexts: ["page", "link", "tab"],
});

browser.menus.onClicked.addListener(async (info, tab) => {
  browser.sidebarAction.open();
  const fromLink = !!info.linkUrl;
  await Store.addPanel({
    // Tab menu clicks carry no pageUrl; the clicked tab has the address.
    url: fromLink ? info.linkUrl : info.pageUrl || tab?.url,
    name: fromLink ? info.linkText : tab?.title,
    icon: fromLink ? "" : tab?.favIconUrl,
  });
});

browser.commands.onCommand.addListener(async command => {
  if (command !== "add-current-page") return;
  browser.sidebarAction.open();
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab) await Store.addPanel({ url: tab.url, name: tab.title, icon: tab.favIconUrl });
});
