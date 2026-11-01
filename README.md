# Zen Sidebar

A Vivaldi / Brave / Edge-style web panel sidebar for Zen Browser, built as a Firefox extension (`sidebar_action`). Zen no longer ships web panels, so this adds them back without any userChrome loader.

## Features

- Icon rail with site favicons; click an icon to open its panel, click the open one to close just that view (the sidebar stays)
- Add the current page, any website, or right-click a tab, page or link and choose **Send to Zen Sidebar**
- Search bar at the top: type a search or an address and the open panel navigates there (uses your default search engine; unrecognised engines fall back to DuckDuckGo)
- Right-click a rail icon for reload, start page, zoom, open in a new tab, edit, remove
- Mobile-site mode per panel
- Drag icons to reorder; rail on the left or right
- Panels load on first use; idle ones unload after 30 minutes unless marked "Keep loaded"
- Shortcuts: `Alt+Shift+S` toggle the sidebar, `Alt+Shift+A` add the current page (rebindable in `about:addons` > gear > Manage Extension Shortcuts)

## Try it

```bash
npm install
npm run start
```

This opens Zen with the extension loaded in a temporary profile. To load it in your normal profile for a session: `about:debugging#/runtime/this-firefox` > Load Temporary Add-on > pick `extension/manifest.json` (removed when Zen restarts).

## Install permanently

Release builds of Zen only keep signed extensions. Sign it for yourself (free, not listed publicly) with an addons.mozilla.org API key:

```bash
set WEB_EXT_API_KEY=...
set WEB_EXT_API_SECRET=...
npm run sign
```

Then open the `.xpi` from `web-ext-artifacts/` in Zen.

## Sidebar side and width

The extension can't move or resize Firefox's sidebar itself; those are browser settings.

- **The "Zen Sidebar" title bar, the side, and the width** all belong to the browser, so they're set with profile files in `dev-profile/` (a hidden `#sidebar-header`, a default width of about 25% of the window, and `sidebar.position_start=false`). `npm run start` uses them automatically. For your normal profile, close Zen and run `.\scripts\apply-ui-tweaks.ps1`, then restart Zen.
- With those tweaks applied, closing a panel's view (click its icon again) shrinks the sidebar to just the icon rail, and opening a panel expands it again. Without them, the sidebar keeps its width and shows a hint instead.
- The tweaks fix the width at about 25% of the window (320 to 480px), so dragging the edge won't resize it.
- The icon rail itself defaults to the right edge of the sidebar. Dragging the sidebar's edge overrides the default width.

On first run the sidebar opens with one panel: the home page of your default search engine.

## Opening and mobile view

- Extensions can only open a sidebar during a user action, so the sidebar opens on your first click or keypress in a web page after Zen starts (not on Zen's own start page). It won't reopen on its own if you close it. Once opened, Zen normally restores it on restart.
- New panels request the mobile version of sites by default; untick it in a panel's Edit dialog.

## Limitations

- Sites load in iframes. The extension strips `X-Frame-Options` / CSP `frame-ancestors` and rewrites cookies to `SameSite=None; Secure` so most sites work, but some will still refuse or break.
- Panel cookies are separate from your normal tabs: log in once inside each panel.
- Mobile mode changes the `User-Agent` header only, not `navigator.userAgent`.
- No back/forward buttons (cross-origin frames can't be driven); use the site's own navigation or `Alt+Left`.
- No Firefox container support for panels.
