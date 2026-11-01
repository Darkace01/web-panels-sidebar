"use strict";

// Shared by the background script and the sidebar page.
const Store = {
  DEFAULTS: {
    panels: [], // {id, name, url, icon, mobile, keepAlive, zoom}
    lastId: null,
    railPosition: "right", // "left" | "right"
    unloadAfterMin: 30, // 0 = never unload idle panels
    seeded: false, // true once the default search panel has been offered
  },

  SEARCH_HOMES: {
    google: "https://www.google.com",
    duckduckgo: "https://duckduckgo.com",
    bing: "https://www.bing.com",
    brave: "https://search.brave.com",
    startpage: "https://www.startpage.com",
    ecosia: "https://www.ecosia.org",
    qwant: "https://www.qwant.com",
    yahoo: "https://search.yahoo.com",
    kagi: "https://kagi.com",
    perplexity: "https://www.perplexity.ai",
    wikipedia: "https://www.wikipedia.org",
  },

  // Home page of the user's default search engine (DuckDuckGo if unknown).
  async searchEngineHome() {
    try {
      const engine = (await browser.search.get()).find(e => e.isDefault);
      if (engine) {
        const lower = engine.name.toLowerCase();
        const key = Object.keys(this.SEARCH_HOMES).find(k => lower.includes(k));
        let url = key ? this.SEARCH_HOMES[key] : null;
        if (!url && /^https?:/.test(engine.favIconUrl ?? "")) url = new URL(engine.favIconUrl).origin;
        if (url) {
          const icon = /^(https?:|data:image\/)/.test(engine.favIconUrl ?? "") ? engine.favIconUrl : "";
          return { name: engine.name, url, icon };
        }
      }
    } catch {
      // fall through to the default
    }
    return { name: "DuckDuckGo", url: "https://duckduckgo.com", icon: "" };
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
