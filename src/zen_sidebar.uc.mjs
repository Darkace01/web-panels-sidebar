// ==UserScript==
// @name           Zen Sidebar
// @description    Vivaldi/Edge-style web panel sidebar for Zen
// @include        main
// ==/UserScript==

(() => {
  if (window.ZenSidebar || !document.getElementById("browser")) return;

  const XHTML = "http://www.w3.org/1999/xhtml";
  const CFG_PATH = PathUtils.join(PathUtils.profileDir, "zen_sidebar.json");
  const DEFAULTS = {
    position: "right", // "left" | "right"
    width: 400,
    unloadAfterMin: 15, // unload idle, non-playing panels; 0 = never
    panels: [], // {id, name, url, userContextId, mobile, zoom}
    activeId: null,
  };
  const SYSTEM = () => Services.scriptSecurityManager.getSystemPrincipal();

  let cfg = structuredClone(DEFAULTS);
  const live = new Map(); // panel id -> {browser, last}
  let saveTimer;
  let menuEl;

  // ---------------------------------------------------------------- helpers

  const h = (tag, props = {}, ...kids) => {
    const el = document.createElementNS(XHTML, tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    el.append(...kids.flat().filter(k => k != null && k !== false));
    return el;
  };

  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(
      () => IOUtils.writeJSON(CFG_PATH, cfg).catch(console.error),
      300
    );
  };

  const mobileUA = () => {
    const v = Services.appinfo.platformVersion;
    return `Mozilla/5.0 (Android 14; Mobile; rv:${v}) Gecko/${v} Firefox/${v}`;
  };

  const normalizeUrl = raw => {
    let u = raw.trim();
    if (!u) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
    return /^https?:\/\//i.test(u) ? u : null;
  };

  const containers = () => [
    { id: 0, label: "No container", color: null },
    ...ContextualIdentityService.getPublicIdentities().map(i => ({
      id: i.userContextId,
      label: ContextualIdentityService.getUserContextLabel(i.userContextId),
      color: i.color,
    })),
  ];

  const byId = id => cfg.panels.find(p => p.id === id);
  const activeBrowser = () => live.get(cfg.activeId)?.browser;

  // ------------------------------------------------------------------ styles

  const STYLE = `
    #zs-root { flex: none; }
    #zs-rail { display: flex; flex-direction: column; align-items: center; gap: 6px;
      width: 46px; box-sizing: border-box; padding: 8px 0; }
    .zs-spacer { flex: 1; }
    .zs-btn { width: 34px; height: 34px; border: none; border-radius: 10px; padding: 0;
      background: transparent; color: inherit; cursor: pointer; position: relative;
      display: grid; place-items: center; box-shadow: inset 0 -2px 0 var(--zs-id, transparent); }
    .zs-btn:hover { background: color-mix(in srgb, currentColor 12%, transparent); }
    .zs-btn.active { background: color-mix(in srgb, currentColor 20%, transparent); }
    .zs-btn.loaded::after { content: ""; position: absolute; bottom: 2px; width: 4px; height: 4px;
      border-radius: 50%; background: currentColor; opacity: .55; }
    .zs-btn.dragover { outline: 2px dashed color-mix(in srgb, currentColor 40%, transparent); }
    .zs-letter { grid-area: 1/1; width: 22px; height: 22px; border-radius: 6px; display: grid;
      place-items: center; font: 600 13px system-ui; text-transform: uppercase;
      background: color-mix(in srgb, currentColor 18%, transparent); }
    .zs-btn img { grid-area: 1/1; width: 20px; height: 20px; border-radius: 4px; display: none; }
    .zs-btn.has-icon img { display: block; }
    .zs-btn.has-icon .zs-letter { visibility: hidden; }
    .zs-add { opacity: .7; font: 300 22px system-ui; }

    #zs-panel { position: relative; width: var(--zs-width, 400px); min-width: 280px; max-width: 70vw;
      margin: 6px 0; border-radius: 10px; overflow: hidden;
      background: var(--toolbar-bgcolor, Canvas); color: var(--toolbar-color, CanvasText);
      box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); }
    #zs-panel[hidden] { display: none; }
    #zs-header { display: flex; align-items: center; gap: 2px; padding: 4px 6px; font: 12px system-ui; }
    #zs-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 6px; }
    .zs-hbtn { width: 26px; height: 26px; border: none; border-radius: 6px; background: transparent;
      color: inherit; cursor: pointer; font: 15px system-ui; padding: 0; }
    .zs-hbtn:hover { background: color-mix(in srgb, currentColor 14%, transparent); }
    #zs-handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: ew-resize; z-index: 2; }
    #zs-root[data-position="right"] #zs-handle { left: 0; }
    #zs-root[data-position="left"] #zs-handle { right: 0; }
    :root[zs-resizing] #zs-body { pointer-events: none; }

    .zs-menu { position: fixed; z-index: 2147483647; min-width: 170px; padding: 4px; border-radius: 8px;
      background: var(--arrowpanel-background, Canvas); color: var(--arrowpanel-color, CanvasText);
      border: 1px solid var(--arrowpanel-border-color, color-mix(in srgb, currentColor 20%, transparent));
      box-shadow: 0 4px 16px rgba(0,0,0,.3); font: 13px system-ui; }
    .zs-item { display: block; width: 100%; text-align: start; border: none; background: transparent;
      color: inherit; padding: 6px 10px; border-radius: 5px; cursor: pointer; font: inherit; }
    .zs-item:hover { background: color-mix(in srgb, currentColor 14%, transparent); }
    .zs-sep { height: 1px; margin: 4px 2px; background: color-mix(in srgb, currentColor 20%, transparent); }

    .zs-modal { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center;
      background: rgba(0,0,0,.35); }
    .zs-dialog { width: 340px; padding: 16px; border-radius: 12px; font: 13px system-ui;
      background: var(--arrowpanel-background, Canvas); color: var(--arrowpanel-color, CanvasText);
      box-shadow: 0 8px 32px rgba(0,0,0,.4); display: flex; flex-direction: column; gap: 10px; }
    .zs-dialog h3 { margin: 0; font-size: 15px; }
    .zs-dialog label { display: flex; flex-direction: column; gap: 4px; }
    .zs-dialog label.row { flex-direction: row; align-items: center; gap: 8px; }
    .zs-dialog input[type=text], .zs-dialog select { padding: 6px 8px; border-radius: 6px; font: inherit;
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
      background: color-mix(in srgb, currentColor 6%, transparent); color: inherit; }
    .zs-err { color: #e5484d; min-height: 1em; }
    .zs-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .zs-actions button { padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer; font: inherit;
      background: color-mix(in srgb, currentColor 14%, transparent); color: inherit; }
    .zs-actions button.primary { background: var(--zen-primary-color, #3b82f6); color: #fff; }
  `;

  // --------------------------------------------------------------------- UI

  const root = document.createXULElement("hbox");
  root.id = "zs-root";
  const rail = h("div", { id: "zs-rail" });
  const panel = document.createXULElement("vbox");
  panel.id = "zs-panel";
  panel.hidden = true;
  const handle = h("div", { id: "zs-handle" });
  const title = h("div", { id: "zs-title" });
  const hbtn = (label, tip, run) =>
    h("button", { class: "zs-hbtn", title: tip, onclick: run }, label);
  const header = h(
    "div",
    { id: "zs-header" },
    hbtn("‹", "Back", () => activeBrowser()?.goBack()),
    hbtn("›", "Forward", () => activeBrowser()?.goForward()),
    hbtn("⟳", "Reload", () => activeBrowser()?.reload()),
    hbtn("⌂", "Home", () => goHome()),
    title,
    hbtn("⋯", "More", e => panelMenu(e)),
    hbtn("✕", "Close panel", () => closePanel())
  );
  const body = document.createXULElement("vbox");
  body.id = "zs-body";
  body.setAttribute("flex", "1");
  panel.append(handle, header, body);

  const layout = () => {
    root.dataset.position = cfg.position;
    const wrapper = document.getElementById("browser");
    if (cfg.position === "left") {
      root.replaceChildren(rail, panel);
      wrapper.insertBefore(root, document.getElementById("zen-tabbox-wrapper"));
    } else {
      root.replaceChildren(panel, rail);
      wrapper.append(root);
    }
    panel.style.setProperty("--zs-width", cfg.width + "px");
  };

  // ------------------------------------------------------------------ menus

  const closeMenu = () => {
    menuEl?.remove();
    menuEl = null;
  };

  const showMenu = (x, y, items) => {
    closeMenu();
    const m = h(
      "div",
      { class: "zs-menu" },
      items.map(it =>
        it === "-"
          ? h("div", { class: "zs-sep" })
          : h(
              "button",
              {
                class: "zs-item",
                onclick: () => {
                  closeMenu();
                  it.run();
                },
              },
              it.label
            )
      )
    );
    document.documentElement.append(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + "px";
    m.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + "px";
    menuEl = m;
    const away = e => {
      if (m.contains(e.target)) return;
      closeMenu();
      window.removeEventListener("mousedown", away, true);
      window.removeEventListener("blur", away, true);
    };
    window.addEventListener("mousedown", away, true);
    window.addEventListener("blur", away, true);
  };

  const panelMenu = e => {
    const p = byId(cfg.activeId);
    if (!p) return;
    const r = e.currentTarget.getBoundingClientRect();
    showMenu(r.left, r.bottom + 2, [
      { label: "Zoom in", run: () => zoom(p, 0.1) },
      { label: "Zoom out", run: () => zoom(p, -0.1) },
      { label: "Reset zoom", run: () => zoom(p, 0) },
      "-",
      { label: p.mobile ? "Switch to desktop site" : "Switch to mobile site", run: () => setMobile(p, !p.mobile) },
      { label: "Open in new tab", run: () => openInTab(p) },
      { label: "Unload panel", run: () => unload(p.id, true) },
    ]);
  };

  const railMenu = (e, p) => {
    e.preventDefault();
    showMenu(e.clientX, e.clientY, [
      { label: "Edit…", run: () => editDialog(p) },
      { label: "Reload", run: () => live.get(p.id)?.browser.reload() },
      { label: "Unload", run: () => unload(p.id, true) },
      "-",
      { label: "Move sidebar to the " + (cfg.position === "right" ? "left" : "right"), run: togglePosition },
      "-",
      { label: "Remove", run: () => removePanel(p.id) },
    ]);
  };

  const addMenu = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = cfg.position === "right" ? r.left - 170 : r.right + 4;
    const spec = gBrowser.currentURI?.spec ?? "";
    showMenu(x, r.top, [
      ...(/^https?:/.test(spec)
        ? [{
            label: "Add current page",
            run: () => addPanel({
              name: gBrowser.selectedBrowser.contentTitle || gBrowser.currentURI.host,
              url: spec,
            }),
          }]
        : []),
      { label: "Add website…", run: () => editDialog(null) },
      "-",
      { label: "Move sidebar to the " + (cfg.position === "right" ? "left" : "right"), run: togglePosition },
    ]);
  };

  // ----------------------------------------------------------------- dialog

  const editDialog = existing => {
    const p = existing ?? { name: "", url: "", userContextId: 0, mobile: false };
    const name = h("input", { type: "text", value: p.name, placeholder: "Name" });
    const url = h("input", { type: "text", value: p.url, placeholder: "https://example.com" });
    const ctr = h(
      "select",
      {},
      containers().map(c =>
        h("option", { value: c.id, selected: c.id === (p.userContextId || 0) }, c.label)
      )
    );
    const mobile = h("input", { type: "checkbox", checked: !!p.mobile });
    const err = h("div", { class: "zs-err" });
    const close = () => modal.remove();
    const submit = () => {
      const u = normalizeUrl(url.value);
      if (!u) {
        err.textContent = "Enter a valid http(s) address.";
        return;
      }
      const data = {
        name: name.value.trim() || new URL(u).host,
        url: u,
        userContextId: Number(ctr.value) || 0,
        mobile: mobile.checked,
      };
      if (existing) updatePanel(existing, data);
      else addPanel(data);
      close();
    };
    const modal = h(
      "div",
      {
        class: "zs-modal",
        onmousedown: e => e.target === modal && close(),
        onkeydown: e => {
          if (e.key === "Escape") close();
          if (e.key === "Enter") submit();
        },
      },
      h(
        "div",
        { class: "zs-dialog" },
        h("h3", {}, existing ? "Edit panel" : "Add web panel"),
        h("label", {}, "Name", name),
        h("label", {}, "Address", url),
        h("label", {}, "Container", ctr),
        h("label", { class: "row" }, mobile, "Load the mobile version of sites"),
        err,
        h(
          "div",
          { class: "zs-actions" },
          h("button", { onclick: close }, "Cancel"),
          h("button", { class: "primary", onclick: submit }, existing ? "Save" : "Add")
        )
      )
    );
    document.documentElement.append(modal);
    (existing ? name : url).focus();
  };

  // ------------------------------------------------------------ panel logic

  const renderRail = () => {
    const ctrs = new Map(containers().map(c => [c.id, c]));
    let dragId = null;
    const buttons = cfg.panels.map((p, i) => {
      const color = ctrs.get(p.userContextId)?.color;
      const icon = h("img", { src: "page-icon:" + p.url });
      const btn = h(
        "button",
        {
          class: "zs-btn" + (p.id === cfg.activeId && !panel.hidden ? " active" : "") + (live.has(p.id) ? " loaded" : ""),
          title: `${p.name}${i < 9 ? `  (Ctrl+Alt+${i + 1})` : ""}`,
          draggable: "true",
          style: color ? `--zs-id: var(--identity-icon-color-${color}, ${color})` : "",
          onclick: () => togglePanel(p.id),
          oncontextmenu: e => railMenu(e, p),
          ondragstart: e => {
            dragId = p.id;
            e.dataTransfer.setData("text/x-zs", p.id);
            e.dataTransfer.effectAllowed = "move";
          },
          ondragover: e => {
            if (!e.dataTransfer.types.includes("text/x-zs")) return;
            e.preventDefault();
            btn.classList.add("dragover");
          },
          ondragleave: () => btn.classList.remove("dragover"),
          ondrop: e => {
            e.preventDefault();
            btn.classList.remove("dragover");
            const from = cfg.panels.findIndex(x => x.id === e.dataTransfer.getData("text/x-zs"));
            if (from < 0 || from === i) return;
            cfg.panels.splice(i, 0, cfg.panels.splice(from, 1)[0]);
            save();
            renderRail();
          },
        },
        h("span", { class: "zs-letter" }, (p.name || "?").trim()[0] ?? "?"),
        icon
      );
      icon.addEventListener("load", () => btn.classList.add("has-icon"));
      icon.addEventListener("error", () => btn.classList.remove("has-icon"));
      return btn;
    });
    rail.replaceChildren(
      ...buttons,
      h("div", { class: "zs-spacer" }),
      h("button", { class: "zs-btn zs-add", title: "Add panel", onclick: addMenu }, "+")
    );
  };

  const renderHeader = () => {
    const p = byId(cfg.activeId);
    title.textContent = p ? live.get(p.id)?.browser.contentTitle || p.name : "";
  };

  const ensureBrowser = p => {
    let entry = live.get(p.id);
    if (entry) return entry;
    const b = document.createXULElement("browser");
    const attrs = {
      type: "content",
      remote: "true",
      maychangeremoteness: "true",
      flex: "1",
      disableglobalhistory: "true",
      autoscroll: "false",
    };
    for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
    if (p.userContextId) b.setAttribute("usercontextid", String(p.userContextId));
    body.append(b);
    entry = { browser: b, last: Date.now() };
    live.set(p.id, entry);
    try {
      if (p.mobile) b.browsingContext.customUserAgent = mobileUA();
      if (p.zoom) b.browsingContext.fullZoom = p.zoom;
    } catch (e) {
      console.error("ZenSidebar: could not configure panel", e);
    }
    const opts = { triggeringPrincipal: SYSTEM() };
    try {
      b.fixupAndLoadURIString(p.url, opts);
    } catch {
      b.loadURI(Services.io.newURI(p.url), opts);
    }
    b.addEventListener("pagetitlechanged", () => p.id === cfg.activeId && renderHeader());
    return entry;
  };

  const showActive = () => {
    for (const [id, e] of live) e.browser.hidden = id !== cfg.activeId || panel.hidden;
  };

  const openPanel = id => {
    const p = byId(id);
    if (!p) return;
    cfg.activeId = id;
    panel.hidden = false;
    ensureBrowser(p).last = Date.now();
    showActive();
    renderHeader();
    renderRail();
    save();
  };

  const closePanel = () => {
    panel.hidden = true;
    showActive();
    renderRail();
  };

  const togglePanel = id =>
    id === cfg.activeId && !panel.hidden ? closePanel() : openPanel(id);

  const unload = (id, force = false) => {
    const e = live.get(id);
    if (!e) return;
    e.browser.remove();
    live.delete(id);
    if (force && id === cfg.activeId && !panel.hidden) closePanel();
    renderRail();
  };

  const addPanel = data => {
    const p = { id: crypto.randomUUID(), userContextId: 0, mobile: false, ...data };
    cfg.panels.push(p);
    save();
    openPanel(p.id);
  };

  const updatePanel = (p, data) => {
    const reload = data.url !== p.url || data.userContextId !== p.userContextId || data.mobile !== p.mobile;
    Object.assign(p, data);
    if (reload) {
      const wasActive = p.id === cfg.activeId && !panel.hidden;
      unload(p.id);
      if (wasActive) openPanel(p.id);
    }
    save();
    renderRail();
    renderHeader();
  };

  const removePanel = id => {
    unload(id);
    cfg.panels = cfg.panels.filter(p => p.id !== id);
    if (cfg.activeId === id) {
      cfg.activeId = null;
      closePanel();
    }
    save();
    renderRail();
  };

  const goHome = () => {
    const p = byId(cfg.activeId);
    const b = activeBrowser();
    if (!p || !b) return;
    try {
      b.fixupAndLoadURIString(p.url, { triggeringPrincipal: SYSTEM() });
    } catch {
      b.loadURI(Services.io.newURI(p.url), { triggeringPrincipal: SYSTEM() });
    }
  };

  const openInTab = p => {
    const b = live.get(p.id)?.browser;
    const url = b?.currentURI?.spec || p.url;
    gBrowser.selectedTab = gBrowser.addTab(url, {
      triggeringPrincipal: SYSTEM(),
      userContextId: p.userContextId || 0,
    });
  };

  const zoom = (p, delta) => {
    const b = live.get(p.id)?.browser;
    if (!b) return;
    const next = delta === 0 ? 1 : Math.min(3, Math.max(0.3, (b.browsingContext.fullZoom || 1) + delta));
    b.browsingContext.fullZoom = next;
    p.zoom = next;
    save();
  };

  const setMobile = (p, on) => {
    p.mobile = on;
    const b = live.get(p.id)?.browser;
    if (b) {
      b.browsingContext.customUserAgent = on ? mobileUA() : "";
      b.reload();
    }
    save();
  };

  const togglePosition = () => {
    cfg.position = cfg.position === "right" ? "left" : "right";
    layout();
    save();
  };

  // ---------------------------------------------------------------- resize

  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    const startX = e.screenX;
    const startW = cfg.width;
    const dir = cfg.position === "right" ? -1 : 1;
    document.documentElement.setAttribute("zs-resizing", "");
    const move = ev => {
      cfg.width = Math.round(Math.max(280, Math.min(innerWidth * 0.7, startW + dir * (ev.screenX - startX))));
      panel.style.setProperty("--zs-width", cfg.width + "px");
    };
    const up = () => {
      document.documentElement.removeAttribute("zs-resizing");
      window.removeEventListener("mousemove", move, true);
      window.removeEventListener("mouseup", up, true);
      save();
    };
    window.addEventListener("mousemove", move, true);
    window.addEventListener("mouseup", up, true);
  });

  // -------------------------------------------------------------- shortcuts

  window.addEventListener("keydown", e => {
    if (!e.ctrlKey || !e.altKey || e.shiftKey || e.metaKey) return;
    if (e.code === "Digit0") {
      e.preventDefault();
      closePanel();
    } else if (/^Digit[1-9]$/.test(e.code)) {
      const p = cfg.panels[Number(e.code.slice(5)) - 1];
      if (p) {
        e.preventDefault();
        togglePanel(p.id);
      }
    } else if (e.code === "KeyB") {
      e.preventDefault();
      const id = cfg.activeId ?? cfg.panels[0]?.id;
      if (id) togglePanel(id);
    }
  });

  // ----------------------------------------------------------------- start

  const sweep = setInterval(() => {
    if (!cfg.unloadAfterMin) return;
    const limit = cfg.unloadAfterMin * 60_000;
    for (const [id, e] of live) {
      if (id === cfg.activeId && !panel.hidden) continue;
      let playing = false;
      try {
        playing = !!e.browser.browsingContext.mediaController?.isPlaying;
      } catch {}
      if (!playing && Date.now() - e.last > limit) unload(id);
    }
  }, 60_000);
  window.addEventListener("unload", () => clearInterval(sweep), { once: true });

  (async () => {
    try {
      Object.assign(cfg, await IOUtils.readJSON(CFG_PATH));
    } catch {
      // first run: keep defaults
    }
    document.documentElement.append(h("style", { id: "zs-style" }, STYLE));
    layout();
    renderRail();
    window.ZenSidebar = { cfg, open: openPanel, close: closePanel, toggle: togglePanel };
  })();
})();
