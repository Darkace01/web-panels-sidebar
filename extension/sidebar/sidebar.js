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
window.addEventListener("blur", closeMenu);

// ---- rail ------------------------------------------------------------------

function renderRail() {
  const rail = $("rail");
  rail.replaceChildren();

  for (const p of S.panels) {
    const btn = el("button", {
      className: "btn" + (p.id === activeId ? " active" : "") + (frames.has(p.id) ? " loaded" : ""),
      title: p.name,
      draggable: true,
    });
    const img = el("img", { alt: "", src: p.icon || originOf(p.url) + "/favicon.ico" });
    img.onload = () => btn.classList.add("has-icon");
    img.onerror = () => btn.classList.remove("has-icon");
    btn.append(el("span", { className: "letter", textContent: [...(p.name || "?")][0] }), img);

    // Clicking the open panel's icon closes the whole sidebar, like Vivaldi.
    btn.onclick = () => (p.id === activeId ? browser.sidebarAction.close() : openPanel(p.id));
    btn.oncontextmenu = e => {
      e.preventDefault();
      showMenu(e.clientX, e.clientY, [
        { label: "Edit…", run: () => editDialog(p) },
        { label: "Reload", run: () => reloadPanel(p) },
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

function renderStage() {
  const p = byId(activeId);
  $("title").textContent = p?.name ?? "";
  $("bar").hidden = !p;
  $("empty").hidden = S.panels.length > 0;
  for (const [id, f] of frames) f.el.hidden = id !== activeId;
}

function render() {
  document.body.dataset.rail = S.railPosition;
  renderRail();
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
  f = { el: iframe, last: Date.now() };
  frames.set(p.id, f);
  return f;
}

function openPanel(id) {
  const p = byId(id);
  if (!p) return;
  activeId = id;
  ensureFrame(p).last = Date.now();
  render();
  if (S.lastId !== id) Store.set({ lastId: id });
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

async function currentUrl(p) {
  try {
    return (await browser.runtime.sendMessage({ type: "lastUrl", id: p.id })) || p.url;
  } catch {
    return p.url;
  }
}

async function reloadPanel(p) {
  const f = frames.get(p.id);
  if (!f) return;
  f.el.src = await currentUrl(p);
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

function setZoom(delta) {
  const p = byId(activeId);
  const f = frames.get(activeId);
  if (!p || !f) return;
  const zoom = delta === 0 ? 1 : Math.min(3, Math.max(0.3, Math.round(((p.zoom || 1) + delta) * 10) / 10));
  Store.set({ panels: S.panels.map(x => (x.id === p.id ? { ...x, zoom } : x)) });
}

$("reload").onclick = () => {
  const p = byId(activeId);
  if (p) reloadPanel(p);
};
$("home").onclick = () => {
  const f = frames.get(activeId);
  if (f) f.el.src = byId(activeId).url;
};
$("zoom-out").onclick = () => setZoom(-0.1);
$("zoom-in").onclick = () => setZoom(0.1);
$("open-tab").onclick = async () => {
  const p = byId(activeId);
  if (p) browser.tabs.create({ url: await currentUrl(p) });
};

// ---- dialogs ---------------------------------------------------------------

let editing = null;

function editDialog(p) {
  editing = p;
  $("edit-heading").textContent = p ? "Edit panel" : "Add web panel";
  $("f-name").value = p?.name ?? "";
  $("f-url").value = p?.url ?? "";
  $("f-mobile").checked = !!p?.mobile;
  $("f-keep").checked = !!p?.keepAlive;
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
  $("settings-dialog").showModal();
}

$("settings-cancel").onclick = () => $("settings-dialog").close();
$("settings-form").onsubmit = e => {
  e.preventDefault();
  Store.set({
    railPosition: $("s-rail").value === "right" ? "right" : "left",
    unloadAfterMin: Math.max(0, Number($("s-unload").value) || 0),
  });
  $("settings-dialog").close();
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
    }
  }
  if (activeId && !byId(activeId)) activeId = null;
}

browser.storage.onChanged.addListener(changes => {
  for (const key of Object.keys(Store.DEFAULTS)) {
    if (changes[key]) S[key] = changes[key].newValue ?? Store.DEFAULTS[key];
  }
  if (changes.panels) syncFrames(changes.panels.oldValue ?? []);
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
  S = await Store.get();
  const first = byId(S.lastId) ?? S.panels[0];
  if (first) openPanel(first.id);
  else render();
})();
