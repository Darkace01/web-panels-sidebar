# CLAUDE.md

## Project

Zen Sidebar: a Firefox/Zen WebExtension (Manifest V2) that adds a Vivaldi/Edge-style web panel sidebar using `sidebar_action`. Zen 1.24b has no built-in web panels, and CSS-only mods or userChrome scripts were tried and dropped (the extension needs no loader and survives updates).

## Layout

- `extension/` - the extension (this folder is the web-ext source dir)
  - `manifest.json` - MV2; needs `webRequest`+`webRequestBlocking` so MV2 is required (Firefox still supports it)
  - `background.js` - header rewriting (frame restrictions, cookies, mobile UA), tab/page/link menu, keyboard commands, one-time auto-open
  - `content/panel-agent.js` - runs in every frame; silent until the sidebar page (a `moz-extension://` direct parent) sends `init`, then reports URL/title/unread count by `postMessage` and handles back/forward/reload, dark mode, custom CSS
  - `content/opener.js` - first click/keypress in a page asks the background to open the sidebar (`sidebarAction.open()` needs a user action)
  - `lib/store.js` - `Store`: storage.local access + `addPanel`/`normalizeUrl`, loaded by both background and sidebar
  - `sidebar/` - the sidebar page: `sidebar.html`, `sidebar.css`, `sidebar.js` (rail, iframes, dialogs)
- `scripts/uninstall.ps1` - one-off cleanup of the earlier fx-autoconfig install; delete once it has been run
- `package.json` - web-ext scripts only (`lint`, `build`, `start`, `sign`)

## How it works

- Each panel is a lazily created `<iframe>` in the sidebar page; hidden (not destroyed) when inactive so audio keeps playing. Idle unload via interval in `sidebar.js`.
- Sidebar <-> agent protocol: messages are `{__zs: true, type, ...}`. The sidebar only trusts `state` messages whose `event.source` is one of its own panel iframes; the agent only trusts messages whose source is its parent and whose origin starts with `moz-extension://`. Back/forward state is rebuilt in the sidebar from the URLs the agent reports (`onState`).
- `dev-profile/` (userChrome.css + user.js) styles Zen's own `#sidebar-box`; the extension signals "rail only" by setting its sidebar title to `Zen Sidebar - rail`, which the CSS matches. `scripts/apply-ui-tweaks.ps1` replaces the `zen-sidebar:begin/end` block in a real profile.
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
- Also unverified in Zen: the tab context menu item, bookmark/history suggestions, notifications, file export via anchor download, auto-close via `document.hasFocus()`, the transparent-background CSS.
- Known gaps: no containers, UA header only, hostname-based panel matching (mobile UA) breaks across SSO redirects to other hosts, badges only parse a leading count in the page title.
- Commits: one per change, no Claude co-author trailer (user preference).
