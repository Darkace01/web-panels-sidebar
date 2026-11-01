# CLAUDE.md

## Project

Zen Sidebar: a Firefox/Zen WebExtension (Manifest V2) that adds a Vivaldi/Edge-style web panel sidebar using `sidebar_action`. Zen 1.24b has no built-in web panels, and CSS-only mods or userChrome scripts were tried and dropped (the extension needs no loader and survives updates).

## Layout

- `extension/` - the extension (this folder is the web-ext source dir)
  - `manifest.json` - MV2; needs `webRequest`+`webRequestBlocking` so MV2 is required (Firefox still supports it)
  - `background.js` - header rewriting (frame restrictions, cookies, mobile UA), last-URL tracking, context menu + commands
  - `lib/store.js` - `Store`: storage.local access + `addPanel`/`normalizeUrl`, loaded by both background and sidebar
  - `sidebar/` - the sidebar page: `sidebar.html`, `sidebar.css`, `sidebar.js` (rail, iframes, dialogs)
- `scripts/uninstall.ps1` - one-off cleanup of the earlier fx-autoconfig install; delete once it has been run
- `package.json` - web-ext scripts only (`lint`, `build`, `start`, `sign`)

## How it works

- Each panel is a lazily created `<iframe>` in the sidebar page; hidden (not destroyed) when inactive so audio keeps playing. Idle unload via interval in `sidebar.js`.
- `background.js` `panelFrameUrl()` uses `frameAncestors` to decide whether a request belongs to a panel frame, and which one; panel is matched to config by hostname (`panelForHost`).
- State lives in `browser.storage.local` (`Store.DEFAULTS` keys); all windows' sidebars sync via `storage.onChanged`.
- `sidebarAction.open()` must be called synchronously in a user-action handler: keep it before any `await` in background handlers.

## Conventions

- Plain JS, no bundler, no frameworks; scripts are classic (non-module) and share `Store` as a global.
- Only http(s) panel URLs (`Store.normalizeUrl`).
- Never use innerHTML with user/site data; build DOM with the `el()` helper and `textContent`.
- Lint: `npm run lint`. Syntax: `node --check <file>`. Real behavior can only be checked in Zen (`npm run start`).

## Status / TODO

- Lint-clean but UNTESTED in a running Zen. Things to verify first: the sidebar shows up in Zen at all (`sidebar.revamp` is on in 1.24b), login/cookie behavior in panels, `frameAncestors` availability, mobile UA matching by hostname, `CSS zoom` on iframes.
- Known gaps: no back/forward, no containers, UA header only, hostname-based panel matching breaks across SSO redirects to other hosts.
- Ideas: settings for rail width, notification badges, import/export, per-panel custom CSS.
