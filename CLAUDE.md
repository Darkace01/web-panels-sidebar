# CLAUDE.md

## Project

Zen Sidebar: a Zen Browser mod (CSS-only, Firefox-based) that styles Zen's web panels into a Vivaldi/Brave/Edge-style icon rail + side panel.

## Layout

- `chrome.css` - the mod's styles (loaded as userChrome by Zen's mod system)
- `preferences.json` - user-facing settings shown in Zen's Mods settings
- `theme.json` - mod metadata for the Zen theme store (replace `OWNER` in URLs once the GitHub repo exists)
- `scripts/install.ps1` - copies the mod into a local Zen profile for testing
- `README.md` - required by the store; keep valid and user-facing
- `screenshot.png` - store image, must be PNG, 600x400 (not yet created)

## Conventions

- Pure CSS only; no JS. Zen mods can't ship scripts.
- Prefix all custom properties with `--zs-`; prefix pref names `mod.zen-sidebar.`.
- Read prefs in CSS with `@media -moz-pref("pref.name", "value")`.
- Mod name < 25 chars, description < 100 chars (store limits).
- Store URLs in `theme.json` must be raw GitHub URLs, not relative paths; README filename uppercase issues have broken store tooling, so keep `README.md` as is and linked via raw URL.

## Testing locally

1. `.\scripts\install.ps1` (optionally `-ProfilePath`), then fully quit and reopen Zen.
2. Enable `toolkit.legacyUserProfileCustomizations.stylesheets` in `about:config` if styles don't apply.
3. Inspect Zen's UI with the Browser Toolbox (`Ctrl+Shift+Alt+I`, enable chrome debugging in devtools settings) to find current element IDs.

## Known risks / TODO

- The selectors in `chrome.css` (`#zen-sidebar-web-panel`, `#zen-sidebar-web-panel-sites`, `.zen-sidebar-panel-button`, ...) are best-guess from Zen's built-in web panels and are UNVERIFIED against the installed Zen version. Verify with the Browser Toolbox first.
- The local registry format written by `install.ps1` (`zen-themes.json`) follows community notes; confirm against a mod installed through the UI.
- Zen already ships web panels; this mod restyles them rather than adding new functionality. Behavior changes (e.g. auto-hide rail) would need Zen-side support.
- Submission: open an issue in zen-browser/theme-store using the "create-theme" template.
