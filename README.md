# Web Panels Sidebar for Zen

A Vivaldi / Brave / Edge-style web panel sidebar for Zen Browser, built as a Firefox extension (`sidebar_action`). Zen no longer ships web panels, so this adds them back without any userChrome loader.

## Features

**Panels**
- Icon rail with site favicons; click an icon to open its panel, click the open one to close just that view (the sidebar stays)
- Add the current page, any website, or right-click a tab, page or link and choose **Send to Web Panels**
- Drop a link on the rail to add it, or on an icon to open it in that panel
- Drag icons to reorder; group panels into **folders** (set a folder name when editing a panel)
- Rail on the left or right
- New panels request the mobile version of sites by default (per panel)

**Browsing**
- Search bar with back, forward and reload buttons; type a search or an address (uses your default search engine; unrecognised engines fall back to DuckDuckGo)
- Suggestions from your bookmarks and history as you type
- Per-panel zoom, "back to start page" and "open in a new tab" (right-click an icon)
- Per-panel **dark mode** and **custom CSS**

**Notifications and performance**
- **Unread badges** on icons for sites that put a count in the page title, like `(3) WhatsApp`; folders show the total
- Optional desktop notification when a panel's unread count rises
- Panels load on first use; idle ones unload after 30 minutes unless marked "Keep loaded"

**Settings** (the `+` button > Sidebar settings)
- Rail position, idle unload time, "close the panel view when I click the page"
- **Export / import** your panels as a JSON file (import skips ones you already have)

**Shortcuts** (rebindable in `about:addons` > gear > Manage Extension Shortcuts)

| Keys | Action |
|---|---|
| `Alt+Shift+S` | Toggle the sidebar |
| `Alt+Shift+A` | Add the current page |
| `Alt+Shift+1` to `9` | Open panel 1 to 9 |

## Try it

```bash
npm install
npm run start
```

This opens Zen with the extension loaded in a temporary profile, using the UI tweaks in `dev-profile/`. To load it in your normal profile for a session: `about:debugging#/runtime/this-firefox` > Load Temporary Add-on > pick `extension/manifest.json` (removed when Zen restarts).

## Publish

See [PUBLISHING.md](PUBLISHING.md) for the store steps. The listing text is in [store/listing.md](store/listing.md), the privacy policy in [PRIVACY.md](PRIVACY.md), the licence in [LICENSE](LICENSE).

## Install permanently

Release builds of Zen only keep signed extensions. Sign it for yourself (free, not listed publicly) with an addons.mozilla.org API key:

```bash
set WEB_EXT_API_KEY=...
set WEB_EXT_API_SECRET=...
npm run sign
```

Then open the `.xpi` from `web-ext-artifacts/` in Zen.

## Sidebar side, width and look

The extension can't move or resize Firefox's sidebar itself; those are browser settings.

- **The "Web Panels" title bar, the side, the width and the background** are set with profile files in `dev-profile/`: a hidden `#sidebar-header`, a default width of about 25% of the window, `sidebar.position_start=false`, and a transparent sidebar so Zen's tab-area background shows through. `npm run start` uses them automatically. For your normal profile, close Zen and run `.\scripts\apply-ui-tweaks.ps1`, then restart Zen. Re-run it after pulling updates; it replaces its own block.
- With those tweaks, closing a panel's view shrinks the sidebar to just the icon rail, and opening a panel expands it again. Without them, the sidebar keeps its width.
- **Zen's compact mode:** when it is on, the sidebar is hidden and slides out when you move the pointer to the window edge where it lives (right by default), matching Zen's own tab sidebar. Turn compact mode off and it stays put again.
- The tweaks fix the width at about 25% of the window (320 to 480px), so dragging the edge won't resize it.

## Opening and mobile view

- Extensions can only open a sidebar during a user action, so the sidebar opens on your first click or keypress in a web page after Zen starts (not on Zen's own start page). It won't reopen on its own if you close it. Once opened, Zen normally restores it on restart.
- Untick "Request the mobile version" in a panel's Edit dialog for the desktop site.

## Limitations

- Sites load in iframes. The extension strips `X-Frame-Options` / CSP `frame-ancestors` and rewrites cookies to `SameSite=None; Secure` so most sites work, but some will still refuse or break.
- Panel cookies are separate from your normal tabs: log in once inside each panel.
- Mobile mode changes the `User-Agent` header only, not `navigator.userAgent`.
- Unread badges only work for sites that show a count at the start of the page title.
- Dark mode is an inversion filter, so it can look off on some sites.
- No Firefox container support for panels.
