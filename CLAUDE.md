# CLAUDE.md

## Project

Web Panels Sidebar (repo `zen-sidebar`): a web-panel sidebar (Vivaldi/Edge style) for Zen/Firefox (Manifest V2, `sidebar_action`) and Chrome/Chromium (Manifest V3, `sidePanel`). One shared codebase, two thin per-browser wrappers. Zen 1.24b has no built-in web panels; CSS-only mods and userChrome scripts were tried and dropped.

## Layout

- `shared/` - used by both browsers (copied into each build)
  - `lib/compat.js` - `browser` alias for Chrome + the `Platform` object: every browser difference the shared code needs (`canShrink`, `fallbackEngine`, `setRailOnly`, notification icon)
  - `lib/store.js` - `Store`: storage.local access, defaults, search-engine helpers, `normalizeUrl`, `addPanel`
  - `sidebar/` - the sidebar page: `sidebar.html`, `sidebar.css`, `sidebar.js` (rail, iframes, dialogs, search, folders, badges, import/export)
  - `content/panel-agent.js` - runs in every frame; silent until the sidebar page (a direct parent with an extension origin) sends `init`, then reports URL/title/unread count by `postMessage` and handles back/forward/reload, dark mode, custom CSS
  - `content/opener.js` - Firefox only (excluded from the Chrome build): first click/keypress asks the background to open the sidebar
  - `icons/` - PNG icons (redraw with `scripts/make-icons.py`) and `icon.svg` (Firefox toolbar icon)
- `firefox/` - `manifest.json` (MV2) and `background.js` (blocking `webRequest`: strips framing headers, rewrites cookies, mobile UA; tab/page/link menu; commands; one-time auto-open)
- `chrome/` - `manifest.json` (MV3) and `background.js` (service worker: `declarativeNetRequest` rules rebuilt from storage, menu, commands, side panel open)
- `scripts/build.mjs` - builds `dist/firefox` and `dist/chrome` (shared + browser folder; browser files win); refuses to build if manifest versions differ from `package.json`
- `scripts/apply-ui-tweaks.ps1`, `dev-profile/` - optional Zen userChrome tweaks (title bar, width, rail-only, compact mode); the script replaces the `zen-sidebar:begin/end` block in a profile
- `scripts/uninstall.ps1` - one-off cleanup of the earlier fx-autoconfig install; delete once it has been run
- `store/listing.md`, `PRIVACY.md`, `LICENSE`, `PUBLISHING.md` - store material; `README.md`, `CONTRIBUTING.md`, `.github/` - docs and templates

## How it works

- Each panel is a lazily created `<iframe>` in the sidebar page, hidden (not destroyed) when inactive so audio keeps playing; idle unload by interval in `sidebar.js`.
- Sidebar <-> agent protocol: messages are `{__zs: true, type, ...}`. The sidebar only trusts `state` messages whose `event.source` is one of its own panel iframes; the agent only trusts messages from its parent whose origin is an extension origin. Back/forward state is rebuilt in the sidebar from reported URLs (`onState`).
- Firefox: `panelFrameUrl()` in `firefox/background.js` uses `frameAncestors` to decide whether a request belongs to a panel; panels are matched to config by hostname.
- Chrome: dynamic DNR rules (`syncRules`): one rule removes `x-frame-options` and `content-security-policy` for sub_frame requests with `initiatorDomains: [extension id]`; per mobile panel host a rule sets `user-agent` (`tabIds: [-1]`). Cookies cannot be rewritten in Chrome.
- Rail-only (Firefox): the sidebar title becomes `Web Panels - rail`, which `dev-profile/chrome/userChrome.css` matches to shrink `#sidebar-box`. Chrome can't shrink, so `Platform.canShrink` is false and a hint shows instead.
- State is in `storage.local` (`Store.DEFAULTS`); all windows stay in sync via `storage.onChanged`; shortcuts use the `openRequest` key.
- `sidebarAction.open()` / `sidePanel.open()` must be called synchronously in a user action: keep them before any `await`.
- Chrome's service worker can stop anytime: no state in variables.

## Conventions

- Plain JS, no bundler or frameworks; scripts are classic (non-module) and share `Store` and `Platform` as globals. Load order: `compat.js`, then `store.js`.
- Browser differences go through `Platform`, not ad-hoc checks. Shared features go in `shared/`.
- Only http(s) panel URLs (`Store.normalizeUrl`).
- Never use innerHTML with user or site data; build DOM with `el()` and `textContent`.
- Lint: `npm run lint` (builds Firefox and lints it). Syntax: `node --check <file>`. Behaviour can only be checked in a real browser.
- Commits: one per change, plain messages, no Claude co-author trailer (user preference).

## Status / TODO

- Lint-clean but UNTESTED in a running Zen/Firefox or Chrome. First things to verify: sidebar shows in Zen; header stripping works; `initiatorDomains: [extension id]` and `tabIds: [-1]` DNR conditions actually match side-panel requests in Chrome; tab context menu; export via anchor download; `document.hasFocus()` auto-close; the Zen CSS (transparent background, compact mode, rail-only).
- Known gaps: no containers; mobile mode is header-only; hostname-based mobile matching breaks across SSO redirects (Firefox); badges parse only a leading count in the title; Chrome cannot rewrite cookies, edit CSP (it removes it), read the default search engine, auto-open, or shrink the panel.
