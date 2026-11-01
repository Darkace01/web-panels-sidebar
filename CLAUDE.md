# CLAUDE.md

## Project

Zen Sidebar: a userChrome script (`.uc.mjs`, loaded by fx-autoconfig) that adds a Vivaldi/Edge-style web panel sidebar to Zen Browser. Zen 1.24b (Firefox-based) has no built-in web panels, so this builds the UI and panel browsers itself.

History: this started as a CSS-only Zen mod restyling web panels; that was dropped because the panels don't exist in current Zen.

## Layout

- `src/zen_sidebar.uc.mjs` - the whole mod: UI, panel logic, styles (inline string), config persistence. Single file on purpose (no import-path risk under the loader).
- `scripts/install.ps1` - installs fx-autoconfig into Zen's install dir (needs admin) and copies the script into the profile's `chrome/JS/`.
- `README.md` - user-facing docs.

## How it works

- Root `#zs-root` (XUL hbox) is inserted into Zen's `#browser`: appended for right, before `#zen-tabbox-wrapper` for left.
- Each panel is a `<browser type="content" remote="true">` created lazily; `usercontextid` gives container support; mobile mode sets `browsingContext.customUserAgent`.
- Config is JSON at `<profile>/zen_sidebar.json` (`IOUtils`), saved debounced.
- Panels are plain DOM built with the `h()` helper; no framework, no build step.

## Conventions

- Plain JS, no dependencies, no build. Keep it in one file unless it gets unwieldy.
- Only http(s) URLs are accepted for panels (`normalizeUrl`).
- CSS ids/classes prefixed `zs-`.
- Syntax check: `node --check src/zen_sidebar.uc.mjs` (this only catches syntax; the browser APIs can't be run outside Zen).

## Testing

1. Close Zen, run `.\scripts\install.ps1` as admin, start Zen with `-purgecaches`.
2. Debug via the Browser Console (`Ctrl+Shift+J`); script errors appear there. `window.ZenSidebar` exposes `cfg`, `open`, `close`, `toggle` in the browser window.
3. Changing the script: copy it to `<profile>\chrome\JS\` again and restart Zen (or purge caches).

## Status / TODO

- UNTESTED in a real Zen: written from knowledge of Firefox chrome APIs, only syntax-checked. First real run will likely need fixes (suspects: `browser.browsingContext` availability right after append, `fixupAndLoadURIString`, `page-icon:` favicons, Zen layout/theme variables, insertion point in `#browser`).
- fx-autoconfig repo layout (`program/`, `profile/chrome/`) assumed in install.ps1; verify.
- Multiple windows each keep their own state and the last write wins.
- Ideas: overlay (float over page) mode, auto-hide rail, per-panel width, import/export, notification badges, settings UI.
