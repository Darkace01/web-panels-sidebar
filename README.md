# Zen Sidebar

A Vivaldi / Brave / Edge-style web panel sidebar for Zen Browser, built as a Firefox extension (`sidebar_action`). Zen no longer ships web panels, so this adds them back without any userChrome loader.

## Features

- Icon rail with site favicons; click an icon to open its panel, click the open one to close the sidebar
- Add the current page, any website, or right-click a page/link and choose **Add to Zen Sidebar**
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

- **Right side:** the icon rail defaults to the right edge of the sidebar, and `npm run start` launches Zen with `sidebar.position_start=false`. In your normal profile, set `sidebar.position_start` to `false` in `about:config`.
- **Width:** drag the sidebar's edge once and Zen remembers it. To force roughly a quarter of the window, add this to `chrome/userChrome.css` in your profile (needs `toolkit.legacyUserProfileCustomizations.stylesheets` = `true` in `about:config`):

```css
#sidebar-box { width: 25vw !important; min-width: 320px; max-width: 480px; }
```

On first run the sidebar opens with one panel: the home page of your default search engine.

## Limitations

- Sites load in iframes. The extension strips `X-Frame-Options` / CSP `frame-ancestors` and rewrites cookies to `SameSite=None; Secure` so most sites work, but some will still refuse or break.
- Panel cookies are separate from your normal tabs: log in once inside each panel.
- Mobile mode changes the `User-Agent` header only, not `navigator.userAgent`.
- No back/forward buttons (cross-origin frames can't be driven); use the site's own navigation or `Alt+Left`.
- No Firefox container support for panels.
