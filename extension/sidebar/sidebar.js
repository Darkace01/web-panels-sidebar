"use strict";

const $ = id => document.getElementById(id);

let S = { ...Store.DEFAULTS };
let activeId = null;
const frames = new Map(); // panel id -> {el, last}

const byId = id => S.panels.find(p => p.id === id);

const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...kids);
  return e;
};

const originOf = u => {
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
};

// ---- menus -----------------------------------------------------------------

let menu = null;

function closeMenu() {
  menu?.remove();
  menu = null;
}

function showMenu(x, y, items) {
  closeMenu();
  menu = el(
    "div",
    { className: "menu" },
    ...items.map(it =>
      it === "-"
        ? el("hr")
        : el("button", {
            textContent: it.label,
            onclick: () => {
              closeMenu();
              it.run();
            },
          })
    )
  );
  document.body.append(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + "px";
  menu.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + "px";
}

document.addEventListener("mousedown", e => {
  if (menu && !menu.contains(e.target)) closeMenu();
});
window.addEventListener("blur", () => {
  closeMenu();
  if (!S.autoClose || !activeId) return;
  // Focus moving into a panel's own frame keeps document.hasFocus() true;
  // moving to the page (or another window) does not.
  setTimeout(() => {
    if (!document.hasFocus() && activeId && !document.querySelector("dialog[open]")) closeView();
  }, 150);
});

// ---- rail ------------------------------------------------------------------

function renderRail() {
  const rail = $("rail");
  rail.replaceChildren();

  const doneFolders = new Set();
  for (const p of S.panels) {
    // Panels in a folder share one rail button, placed where the first one is.
    if (p.folder) {
      if (!doneFolders.has(p.folder)) {
        doneFolders.add(p.folder);
        rail.append(folderButton(p.folder));
      }
      continue;
    }
    const btn = el("button", {
      className: "btn" + (p.id === activeId ? " active" : "") + (frames.has(p.id) ? " loaded" : ""),
      title: p.name,
      draggable: true,
    });
    btn.dataset.id = p.id;
    const img = el("img", { alt: "", src: p.icon || originOf(p.url) + "/favicon.ico" });
    img.onload = () => btn.classList.add("has-icon");
    img.onerror = () => btn.classList.remove("has-icon");
    btn.append(
      el("span", { className: "letter", textContent: [...(p.name || "?")][0] }),
      img,
      el("span", { className: "badge" })
    );

    // Clicking the open panel's icon closes its view; the sidebar stays.
    btn.onclick = () => (p.id === activeId ? closeView() : openPanel(p.id));
    btn.oncontextmenu = e => {
      e.preventDefault();
      showMenu(e.clientX, e.clientY, [
        { label: "Edit…", run: () => editDialog(p) },
        { label: "Reload", run: () => reloadPanel(p) },
        { label: "Back to start page", run: () => goHome(p) },
        { label: "Open in new tab", run: () => openInTab(p) },
        "-",
        { label: "Zoom in", run: () => setZoom(p, 0.1) },
        { label: "Zoom out", run: () => setZoom(p, -0.1) },
        { label: "Reset zoom", run: () => setZoom(p, 0) },
        "-",
        { label: "Unload", run: () => unloadPanel(p.id) },
        "-",
        { label: "Remove", run: () => removePanel(p.id) },
      ]);
    };
    btn.ondragstart = e => {
      e.dataTransfer.setData("text/x-zs", p.id);
      e.dataTransfer.effectAllowed = "move";
    };
    btn.ondragover = e => {
      if (!e.dataTransfer.types.includes("text/x-zs")) return;
      e.preventDefault();
      btn.classList.add("dragover");
    };
    btn.ondragleave = () => btn.classList.remove("dragover");
    btn.ondrop = e => {
      e.preventDefault();
      btn.classList.remove("dragover");
      const panels = [...S.panels];
      const from = panels.findIndex(x => x.id === e.dataTransfer.getData("text/x-zs"));
      const to = panels.findIndex(x => x.id === p.id);
      if (from < 0 || from === to) return;
      panels.splice(to, 0, panels.splice(from, 1)[0]);
      Store.set({ panels });
    };
    rail.append(btn);
  }

  rail.append(
    el("div", { className: "spacer" }),
    el("button", {
      className: "btn add",
      textContent: "+",
      title: "Add panel",
      onclick: e => {
        const r = e.currentTarget.getBoundingClientRect();
        showMenu(S.railPosition === "left" ? r.right + 4 : r.left - 184, r.top, [
          { label: "Add current page", run: addCurrentPage },
          { label: "Add website…", run: () => editDialog(null) },
          "-",
          { label: "Sidebar settings…", run: settingsDialog },
        ]);
      },
    })
  );
}

const SVG_NS = "http://www.w3.org/2000/svg";
const FOLDER_PATH =
  "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z";

function folderButton(name) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  for (const [k, v] of Object.entries({ fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linejoin": "round" })) {
    svg.setAttribute(k, v);
  }
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", FOLDER_PATH);
  svg.append(path);
  const btn = el("button", { className: "btn folder", title: name }, svg, el("span", { className: "badge" }));
  btn.dataset.folder = name;
  btn.onclick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const members = S.panels.filter(p => p.folder === name);
    showMenu(
      S.railPosition === "left" ? r.right + 4 : r.left - 184,
      r.top,
      members.map(p => ({ label: (p.id === activeId ? "● " : "") + p.name, run: () => openPanel(p.id) }))
    );
  };
  return btn;
}

function renderStage() {
  // The hint only appears when there are no panels at all.
  $("empty").classList.toggle("show", S.panels.length === 0);
  $("empty").textContent = "No panels yet. Use + on the rail to add one.";
  $("refresh").disabled = !byId(activeId);
  updateNav();
  for (const [id, f] of frames) f.el.classList.toggle("on", id === activeId);
}

// Toggle state classes in place so CSS transitions can animate them.
function refreshRail() {
  for (const btn of $("rail").querySelectorAll(".btn[data-id]")) {
    btn.classList.toggle("active", btn.dataset.id === activeId);
    btn.classList.toggle("loaded", frames.has(btn.dataset.id));
    const n = frames.get(btn.dataset.id)?.badge ?? 0;
    const badge = btn.querySelector(".badge");
    badge.textContent = n > 99 ? "99+" : String(n);
    btn.classList.toggle("has-badge", n > 0);
  }
  for (const btn of $("rail").querySelectorAll(".btn[data-folder]")) {
    const members = S.panels.filter(p => p.folder === btn.dataset.folder);
    btn.classList.toggle("active", members.some(p => p.id === activeId));
    btn.classList.toggle("loaded", members.some(p => frames.has(p.id)));
    const n = members.reduce((sum, p) => sum + (frames.get(p.id)?.badge ?? 0), 0);
    btn.querySelector(".badge").textContent = n > 99 ? "99+" : String(n);
    btn.classList.toggle("has-badge", n > 0);
  }
}

let railKey = "";
let windowId;
let railOnly = null;

// While no panel is open the sidebar title becomes "... - rail"; the
// profile's userChrome.css uses that to shrink the sidebar to the icon rail.
function syncTitle() {
  const collapsed = !byId(activeId);
  if (collapsed === railOnly) return;
  railOnly = collapsed;
  browser.sidebarAction
    .setTitle({ title: collapsed ? "Web Panels - rail" : "Web Panels", ...(windowId ? { windowId } : {}) })
    .catch(() => {});
}

function render() {
  syncTitle();
  document.body.dataset.rail = S.railPosition;
  // Rail-only mode: nothing but the icons (search stays when there are no panels yet).
  document.body.classList.toggle("collapsed", S.panels.length > 0 && !byId(activeId));
  // Only rebuild the rail when its contents change; otherwise just update it.
  const key = JSON.stringify([S.railPosition, S.panels.map(p => [p.id, p.name, p.url, p.icon, p.folder])]);
  if (key !== railKey) {
    railKey = key;
    renderRail();
  }
  refreshRail();
  renderStage();
}

// ---- panels ----------------------------------------------------------------

function ensureFrame(p) {
  let f = frames.get(p.id);
  if (f) return f;
  const iframe = el("iframe", {
    src: p.url,
    allow: "autoplay; clipboard-write; fullscreen; picture-in-picture",
    allowFullscreen: true,
  });
  iframe.style.zoom = p.zoom || 1;
  $("frames").append(iframe);
  void iframe.offsetWidth; // commit the hidden state so it can fade in
  // url/title/badge come from the page's panel-agent; hist/idx track back/forward
  f = { el: iframe, last: Date.now(), url: "", title: "", badge: 0, hist: [], idx: -1 };
  frames.set(p.id, f);
  // Each (re)load, say hello so the page's agent starts reporting to us.
  iframe.addEventListener("load", () => sendInit(p.id));
  return f;
}

function sendTo(f, msg) {
  f.el.contentWindow?.postMessage({ __zs: true, ...msg }, "*");
}

function sendInit(id) {
  const f = frames.get(id);
  const p = byId(id);
  if (f && p) sendTo(f, { type: "init", dark: !!p.dark, css: p.css || "" });
}

// Messages from page agents: only accept them from a panel's own frame.
window.addEventListener("message", e => {
  const d = e.data;
  if (!d || d.__zs !== true || d.type !== "state") return;
  for (const [id, f] of frames) {
    if (f.el.contentWindow === e.source) return onState(id, f, d);
  }
});

function onState(id, f, d) {
  if (typeof d.url !== "string" || !/^https?:/i.test(d.url)) return;
  if (d.url !== f.url) {
    // Work out whether this was a back, a forward, or a new page.
    if (f.hist[f.idx - 1] === d.url) f.idx--;
    else if (f.hist[f.idx + 1] === d.url) f.idx++;
    else {
      f.hist.splice(f.idx + 1);
      f.hist.push(d.url);
      f.idx = f.hist.length - 1;
    }
    f.url = d.url;
  }
  f.title = String(d.title ?? "").slice(0, 200);
  const badge = Math.max(0, Math.min(9999, Number(d.badge) || 0));
  if (badge !== f.badge) {
    const increased = badge > f.badge;
    f.badge = badge;
    refreshRail();
    if (increased) maybeNotify(id, badge);
  }
  if (id === activeId) updateNav();
}

// Desktop notification when a panel you aren't looking at gets more unread items.
function maybeNotify(id, count) {
  const p = byId(id);
  if (!p?.notify) return;
  const looking = id === activeId && document.hasFocus() && !document.hidden;
  if (looking) return;
  browser.notifications
    .create(`zs-${id}`, {
      type: "basic",
      title: p.name,
      message: count === 1 ? "1 unread" : `${count} unread`,
      iconUrl: browser.runtime.getURL("icons/icon.svg"),
    })
    .catch(() => {});
}

browser.notifications.onClicked.addListener(nid => {
  if (nid.startsWith("zs-")) openPanel(nid.slice(3));
});

function updateNav() {
  const f = frames.get(activeId);
  $("back").disabled = !(f && f.idx > 0);
  $("forward").disabled = !(f && f.idx >= 0 && f.idx < f.hist.length - 1);
}

function openPanel(id) {
  const p = byId(id);
  if (!p) return;
  activeId = id;
  ensureFrame(p).last = Date.now();
  render();
  if (S.lastId !== id) Store.set({ lastId: id });
}

// Hide the open panel but keep it loaded (audio keeps playing) until idle.
function closeView() {
  activeId = null;
  render();
}

function unloadPanel(id) {
  frames.get(id)?.el.remove();
  frames.delete(id);
  if (id === activeId) {
    const p = byId(id);
    if (p) ensureFrame(p);
  }
  render();
}

const currentUrl = p => frames.get(p.id)?.url || p.url;

function reloadPanel(p) {
  const f = frames.get(p.id);
  if (!f) return;
  // The agent knows the real page; fall back to the start page if it isn't there.
  if (f.url) sendTo(f, { type: "reload" });
  else f.el.src = p.url;
}

async function removePanel(id) {
  const panels = S.panels.filter(p => p.id !== id);
  await Store.set({ panels, ...(S.lastId === id ? { lastId: null } : {}) });
}

async function addCurrentPage() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !Store.normalizeUrl(tab.url)) return;
  await Store.addPanel({ url: tab.url, name: tab.title, icon: tab.favIconUrl });
}

function setZoom(p, delta) {
  const zoom = delta === 0 ? 1 : Math.min(3, Math.max(0.3, Math.round(((p.zoom || 1) + delta) * 10) / 10));
  Store.set({ panels: S.panels.map(x => (x.id === p.id ? { ...x, zoom } : x)) });
}

function goHome(p) {
  const f = frames.get(p.id);
  if (f) f.el.src = p.url;
}

function openInTab(p) {
  browser.tabs.create({ url: currentUrl(p) });
}

$("back").onclick = () => {
  const f = frames.get(activeId);
  if (f) sendTo(f, { type: "back" });
};
$("forward").onclick = () => {
  const f = frames.get(activeId);
  if (f) sendTo(f, { type: "forward" });
};

$("refresh").onclick = e => {
  const p = byId(activeId);
  if (!p) return;
  reloadPanel(p);
  const btn = e.currentTarget;
  btn.classList.remove("spin");
  void btn.offsetWidth;
  btn.classList.add("spin");
};

// Search bar: navigates the open panel, or makes a panel if none is open.
function navigate(url) {
  hideSuggest();
  $("q").value = "";
  $("q").blur();
  const f = frames.get(activeId);
  if (f) f.el.src = url;
  else Store.addPanel({ url });
}

$("search").onsubmit = async e => {
  e.preventDefault();
  if (sugIdx >= 0 && sugItems[sugIdx]) return navigate(sugItems[sugIdx].url);
  const url = await Store.resolveQuery($("q").value);
  if (url) navigate(url);
};

// ---- suggestions from bookmarks and history --------------------------------

let sugItems = [];
let sugIdx = -1;
let sugTimer = 0;

function hideSuggest() {
  sugItems = [];
  sugIdx = -1;
  $("suggest").hidden = true;
  $("suggest").replaceChildren();
}

function highlightSuggest() {
  [...$("suggest").children].forEach((c, i) => c.classList.toggle("sel", i === sugIdx));
}

async function updateSuggest() {
  const text = $("q").value.trim();
  if (!text) return hideSuggest();
  const [marks, past] = await Promise.all([
    browser.bookmarks.search(text).catch(() => []),
    browser.history.search({ text, maxResults: 10 }).catch(() => []),
  ]);
  if ($("q").value.trim() !== text) return; // typed on meanwhile
  const seen = new Set();
  const items = [];
  const add = (kind, url, title) => {
    if (!/^https?:/i.test(url ?? "") || seen.has(url)) return;
    seen.add(url);
    items.push({ kind, url, title: title || url });
  };
  marks.forEach(b => add("★", b.url, b.title));
  past.forEach(h => add("↺", h.url, h.title));
  sugItems = items.slice(0, 6);
  sugIdx = -1;
  const box = $("suggest");
  box.replaceChildren(
    ...sugItems.map(it =>
      el(
        "button",
        {
          type: "button",
          className: "sug",
          // mousedown, not click: the input's blur would hide the list first
          onmousedown: e => {
            e.preventDefault();
            navigate(it.url);
          },
        },
        el("span", { className: "kind", textContent: it.kind }),
        el("span", { className: "t", textContent: it.title }),
        el("span", { className: "u", textContent: it.url.replace(/^https?:\/\/(www\.)?/, "") })
      )
    )
  );
  box.hidden = sugItems.length === 0;
}

$("q").addEventListener("input", () => {
  clearTimeout(sugTimer);
  sugTimer = setTimeout(updateSuggest, 120);
});
$("q").addEventListener("keydown", e => {
  if (e.key === "Escape") return hideSuggest();
  if (!sugItems.length || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
  e.preventDefault();
  const n = sugItems.length;
  sugIdx = e.key === "ArrowDown" ? (sugIdx + 1) % n : (sugIdx - 1 + n) % n;
  highlightSuggest();
});
$("q").addEventListener("blur", () => setTimeout(hideSuggest, 120));

// ---- dropping a link on the rail -------------------------------------------
// Drop on an icon to open the link in that panel, anywhere else to add a panel.

const isUrlDrag = e =>
  !e.dataTransfer.types.includes("text/x-zs") &&
  (e.dataTransfer.types.includes("text/uri-list") || e.dataTransfer.types.includes("text/plain"));

$("rail").addEventListener("dragover", e => {
  if (isUrlDrag(e)) e.preventDefault();
});
$("rail").addEventListener("drop", e => {
  if (!isUrlDrag(e)) return;
  e.preventDefault();
  const raw = (e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain"))
    .split("\n")
    .find(line => line.trim() && !line.startsWith("#"));
  const url = Store.normalizeUrl(raw);
  if (!url) return;
  const btn = e.target.closest(".btn[data-id]");
  const p = btn && byId(btn.dataset.id);
  if (p) {
    openPanel(p.id);
    const f = frames.get(p.id);
    if (f) f.el.src = url;
  } else {
    Store.addPanel({ url });
  }
});

// ---- dialogs ---------------------------------------------------------------

let editing = null;

function editDialog(p) {
  editing = p;
  $("edit-heading").textContent = p ? "Edit panel" : "Add web panel";
  $("f-name").value = p?.name ?? "";
  $("f-url").value = p?.url ?? "";
  $("f-mobile").checked = p ? !!p.mobile : true;
  $("f-keep").checked = !!p?.keepAlive;
  $("f-notify").checked = !!p?.notify;
  $("f-folder").value = p?.folder ?? "";
  $("f-dark").checked = !!p?.dark;
  $("f-css").value = p?.css ?? "";
  $("folders").replaceChildren(
    ...[...new Set(S.panels.map(x => x.folder).filter(Boolean))].map(name => el("option", { value: name }))
  );
  $("edit-error").textContent = "";
  $("edit-dialog").showModal();
  (p ? $("f-name") : $("f-url")).focus();
}

$("edit-cancel").onclick = () => $("edit-dialog").close();
$("edit-form").onsubmit = async e => {
  e.preventDefault();
  const url = Store.normalizeUrl($("f-url").value);
  if (!url) {
    $("edit-error").textContent = "Enter a valid http(s) address.";
    return;
  }
  const values = {
    name: $("f-name").value.trim() || new URL(url).hostname,
    url,
    mobile: $("f-mobile").checked,
    keepAlive: $("f-keep").checked,
    notify: $("f-notify").checked,
    folder: $("f-folder").value.trim().slice(0, 40),
    dark: $("f-dark").checked,
    css: $("f-css").value.slice(0, 5000),
  };
  $("edit-dialog").close();
  if (editing) {
    await Store.set({ panels: S.panels.map(x => (x.id === editing.id ? { ...x, ...values } : x)) });
  } else {
    const id = crypto.randomUUID();
    await Store.set({
      panels: [...S.panels, { id, icon: "", zoom: 1, ...values }],
      lastId: id,
    });
  }
};

function settingsDialog() {
  $("s-rail").value = S.railPosition;
  $("s-unload").value = S.unloadAfterMin;
  $("s-autoclose").checked = S.autoClose;
  $("s-msg").textContent = "";
  $("settings-dialog").showModal();
}

$("settings-cancel").onclick = () => $("settings-dialog").close();
$("settings-form").onsubmit = e => {
  e.preventDefault();
  Store.set({
    railPosition: $("s-rail").value === "right" ? "right" : "left",
    unloadAfterMin: Math.max(0, Number($("s-unload").value) || 0),
    autoClose: $("s-autoclose").checked,
  });
  $("settings-dialog").close();
};

// ---- import / export -------------------------------------------------------

$("s-export").onclick = () => {
  const panels = S.panels.map(({ id, ...rest }) => rest);
  const blob = new Blob([JSON.stringify({ zenSidebar: 1, panels }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  el("a", { href: url, download: "zen-sidebar-panels.json" }).click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  $("s-msg").textContent = `Exported ${panels.length} panel${panels.length === 1 ? "" : "s"}.`;
};

$("s-import").onclick = () => $("s-file").click();

// Accepts only what we understand; anything else in the file is ignored.
function cleanImported(raw) {
  const url = Store.normalizeUrl(raw?.url);
  if (!url) return null;
  const icon = typeof raw.icon === "string" && /^(https?:|data:image\/)/.test(raw.icon) ? raw.icon : "";
  return {
    id: crypto.randomUUID(),
    name: String(raw.name ?? "").trim().slice(0, 80) || new URL(url).hostname,
    url,
    icon,
    mobile: raw.mobile !== false,
    keepAlive: !!raw.keepAlive,
    notify: !!raw.notify,
    dark: !!raw.dark,
    css: typeof raw.css === "string" ? raw.css.slice(0, 5000) : "",
    folder: typeof raw.folder === "string" ? raw.folder.trim().slice(0, 40) : "",
    zoom: Math.min(3, Math.max(0.3, Number(raw.zoom) || 1)),
  };
}

$("s-file").onchange = async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const incoming = (Array.isArray(data) ? data : data.panels ?? []).map(cleanImported).filter(Boolean);
    const known = new Set(S.panels.map(p => p.url));
    const fresh = incoming.filter(p => !known.has(p.url) && known.add(p.url));
    if (fresh.length) await Store.set({ panels: [...S.panels, ...fresh] });
    $("s-msg").textContent = `Imported ${fresh.length}, skipped ${incoming.length - fresh.length} already present.`;
  } catch {
    $("s-msg").textContent = "That file isn't a valid panel export.";
  }
};

// ---- storage sync ----------------------------------------------------------

// Frames whose address or UA mode changed must be recreated; others only
// need their zoom refreshed.
function syncFrames(oldPanels) {
  for (const [id, f] of [...frames]) {
    const now = byId(id);
    const before = oldPanels.find(p => p.id === id);
    if (!now || (before && (before.url !== now.url || before.mobile !== now.mobile))) {
      f.el.remove();
      frames.delete(id);
      if (now && id === activeId) ensureFrame(now);
    } else {
      f.el.style.zoom = now.zoom || 1;
      if (before && (!!before.dark !== !!now.dark || (before.css || "") !== (now.css || ""))) sendInit(id);
    }
  }
  if (activeId && !byId(activeId)) activeId = null;
}

browser.storage.onChanged.addListener(changes => {
  for (const key of Object.keys(Store.DEFAULTS)) {
    if (changes[key]) S[key] = changes[key].newValue ?? Store.DEFAULTS[key];
  }
  if (changes.panels) syncFrames(changes.panels.oldValue ?? []);
  const req = changes.openRequest?.newValue;
  if (req && byId(req.id)) {
    openPanel(req.id); // from a keyboard shortcut
    return;
  }
  if (changes.lastId && S.lastId && S.lastId !== activeId && byId(S.lastId)) {
    openPanel(S.lastId);
  } else {
    render();
  }
});

// ---- idle unloading --------------------------------------------------------

setInterval(() => {
  if (!S.unloadAfterMin) return;
  const limit = S.unloadAfterMin * 60_000;
  let changed = false;
  for (const [id, f] of [...frames]) {
    if (id === activeId) {
      f.last = Date.now();
      continue;
    }
    if (byId(id)?.keepAlive || Date.now() - f.last < limit) continue;
    f.el.remove();
    frames.delete(id);
    changed = true;
  }
  if (changed) render();
}, 60_000);

// ---- start -----------------------------------------------------------------

(async () => {
  // Tell the background the sidebar is open, so it doesn't auto-open it again
  // (and doesn't fight a user who closes it).
  browser.runtime.sendMessage({ type: "sidebar-open" }).catch(() => {});
  windowId = (await browser.windows.getCurrent()).id;
  S = await Store.get();
  if (!S.seeded) {
    // Claim first so a second window doesn't seed again.
    await Store.set({ seeded: true });
    if (!S.panels.length) await Store.addPanel(await Store.searchEngineHome());
    S = await Store.get();
  }
  const first = byId(S.lastId) ?? S.panels[0];
  if (first) openPanel(first.id);
  else render();
})();
