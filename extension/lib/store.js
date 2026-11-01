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

  // Known search engines, matched against the default engine's name.
  SEARCH_ENGINES: {
    google: { home: "https://www.google.com", search: "https://www.google.com/search?q=%s" },
    duckduckgo: { home: "https://duckduckgo.com", search: "https://duckduckgo.com/?q=%s" },
    bing: { home: "https://www.bing.com", search: "https://www.bing.com/search?q=%s" },
    brave: { home: "https://search.brave.com", search: "https://search.brave.com/search?q=%s" },
    startpage: { home: "https://www.startpage.com", search: "https://www.startpage.com/do/search?q=%s" },
    ecosia: { home: "https://www.ecosia.org", search: "https://www.ecosia.org/search?q=%s" },
    qwant: { home: "https://www.qwant.com", search: "https://www.qwant.com/?q=%s" },
    yahoo: { home: "https://search.yahoo.com", search: "https://search.yahoo.com/search?p=%s" },
    kagi: { home: "https://kagi.com", search: "https://kagi.com/search?q=%s" },
    perplexity: { home: "https://www.perplexity.ai", search: "https://www.perplexity.ai/search?q=%s" },
    wikipedia: { home: "https://www.wikipedia.org", search: "https://www.wikipedia.org/w/index.php?search=%s" },
  },

  async defaultEngine() {
    try {
      const engine = (await browser.search.get()).find(e => e.isDefault);
      if (!engine) return null;
      const lower = engine.name.toLowerCase();
      const key = Object.keys(this.SEARCH_ENGINES).find(k => lower.includes(k)) ?? null;
      return { name: engine.name, key, favIconUrl: engine.favIconUrl ?? "" };
    } catch {
      return null;
    }
  },

  // Home page of the user's default search engine (DuckDuckGo if unknown).
  async searchEngineHome() {
    const e = await this.defaultEngine();
    if (e) {
      let url = e.key ? this.SEARCH_ENGINES[e.key].home : null;
      if (!url && /^https?:/.test(e.favIconUrl)) url = new URL(e.favIconUrl).origin;
      if (url) {
        const icon = /^(https?:|data:image\/)/.test(e.favIconUrl) ? e.favIconUrl : "";
        return { name: e.name, url, icon };
      }
    }
    return { name: "DuckDuckGo", url: this.SEARCH_ENGINES.duckduckgo.home, icon: "" };
  },

  // Turn what was typed in the search bar into an address.
  async resolveQuery(text) {
    const t = text.trim();
    if (!t) return null;
    const looksLikeAddress = !/\s/.test(t) && (/^https?:\/\//i.test(t) || /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/.test(t) || /^localhost(:\d+)?([/?#].*)?$/i.test(t));
    if (looksLikeAddress) return this.normalizeUrl(t);
    const e = await this.defaultEngine();
    const template = (e?.key && this.SEARCH_ENGINES[e.key].search) || this.SEARCH_ENGINES.duckduckgo.search;
    return template.replace("%s", encodeURIComponent(t));
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
      mobile: true, // the sidebar is phone-sized, so ask for mobile sites by default
      keepAlive: false,
      zoom: 1,
    };
    await this.set({ panels: [...s.panels, p], lastId: p.id });
    return p;
  },
};
