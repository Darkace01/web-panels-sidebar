"use strict";

// Shared by the background script and the sidebar page.
const Store = {
  DEFAULTS: {
    panels: [], // {id, name, url, icon, mobile, keepAlive, zoom}
    lastId: null,
    railPosition: "left", // "left" | "right"
    unloadAfterMin: 30, // 0 = never unload idle panels
  },

  async get() {
    const saved = await browser.storage.local.get(Object.keys(this.DEFAULTS));
    return { ...this.DEFAULTS, ...saved };
  },

  set(values) {
    return browser.storage.local.set(values);
  },

  // Only http(s) panels are allowed.
  normalizeUrl(raw) {
    let u = String(raw ?? "").trim();
    if (!u) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
    try {
      const parsed = new URL(u);
      return /^https?:$/.test(parsed.protocol) ? parsed.href : null;
    } catch {
      return null;
    }
  },

  async addPanel({ name, url, icon }) {
    const u = this.normalizeUrl(url);
    if (!u) return null;
    const s = await this.get();
    const existing = s.panels.find(p => p.url === u);
    if (existing) {
      await this.set({ lastId: existing.id });
      return existing;
    }
    const p = {
      id: crypto.randomUUID(),
      name: (name || "").trim() || new URL(u).hostname,
      url: u,
      icon: icon || "",
      mobile: false,
      keepAlive: false,
      zoom: 1,
    };
    await this.set({ panels: [...s.panels, p], lastId: p.id });
    return p;
  },
};
