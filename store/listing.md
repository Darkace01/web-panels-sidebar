# Store listing

Copy each block into the matching field when you submit. Firefox (addons.mozilla.org) and the Chrome Web Store use the same text unless a section says otherwise.

## Name (max 50 characters)

Firefox / Zen:

```
Web Panels Sidebar for Zen
```

Chrome (the manifest uses this name):

```
Web Panels Sidebar
```

## Summary (max 250 characters)

```
Pin your favourite sites to an icon rail and open them in a panel beside the page, like Vivaldi and Edge web panels. Mobile view, unread badges, folders, search with bookmark suggestions and per-site dark mode.
```

## Description

```
Web Panels Sidebar for Zen brings Vivaldi / Edge / Brave-style web panels to Zen Browser. Keep chat, music, email, notes or any website one click away in a panel next to the page you are reading.

PANELS
• An icon rail of your pinned sites: click to open, click again to close the view
• Add the current page, any address, or right-click a tab, page or link and choose "Send to Web Panels"
• Drag icons to reorder, drop a link on the rail to add it, group panels into folders
• Mobile version of sites by default, per-panel zoom, optional "keep loaded"

BROWSING
• Search bar with back, forward and reload
• Uses your default search engine and suggests bookmarks and history as you type
• Per-panel dark mode and custom CSS

STAY ON TOP OF THINGS
• Unread badges on icons for sites that show a count in the page title, e.g. "(3) WhatsApp"
• Optional desktop notifications when a panel's unread count rises

SPEED AND CONTROL
• Panels load only when first used; idle ones unload automatically
• Alt+Shift+S opens the sidebar, Alt+Shift+A adds the current page, Alt+Shift+1 to 9 open panels 1 to 9 (Chrome: 1 and 2 are preset, assign the rest in the shortcuts page)
• Export and import your panels

PRIVACY
Everything stays on your device. No accounts, no analytics, no tracking.

OPTIONAL (Zen): a few small CSS tweaks for Zen (sidebar width, hide the title bar, tuck away in compact mode) are provided in the project's repository.

Note: sites load in frames. The extension removes the headers that block framing, so most sites work, but a few (for example some banking and login pages) may still refuse to load. Panel logins are separate from your normal tabs: sign in once inside each panel.
```

## Categories

- Tabs (primary)
- Productivity (or Other)

## Tags

`sidebar`, `web panels`, `zen`, `productivity`, `tabs`, `side panel`

## Support, links and licence

- Support email / site: your own (also used in `PRIVACY.md`)
- Homepage / source: https://github.com/Darkace01/web-panels-sidebar
- Support / issues: https://github.com/Darkace01/web-panels-sidebar/issues
- Licence: MIT (see `LICENSE`)
- Privacy policy: paste the contents of `PRIVACY.md`

## Release notes (version 0.1.0)

```
First release: icon rail, panels, mobile view, back/forward/reload, search with bookmark and history suggestions, unread badges and notifications, folders, dark mode and custom CSS, keyboard shortcuts, import/export.
```

## Notes to reviewer

```
Why the broad permissions:
- <all_urls> + webRequest + webRequestBlocking: the extension shows websites chosen by the user inside its own sidebar page (as iframes). It removes X-Frame-Options and CSP frame-ancestors response headers, rewrites Set-Cookie to SameSite=None; Secure, and (only when the user turns on mobile view for a panel) replaces the User-Agent request header. These changes are applied only to requests that originate from the extension's own sidebar page (identified through webRequest frameAncestors) and never to normal tabs.
- Content scripts: content/panel-agent.js runs in frames but does nothing until the extension's own sidebar page (a direct parent frame with a moz-extension:// origin) posts an "init" message; it then reports the frame's URL, title and unread count back to that page and can apply user-defined dark mode / CSS. content/opener.js only reports a first click or keypress so the sidebar can be opened (sidebarAction.open requires a user action).
- bookmarks/history: read-only, used for suggestions in the sidebar search bar.
- search: reads the default search engine name.
- notifications: optional alerts when an unread count rises.
- tabs/menus: adding the current tab and the "Send to Web Panels" context-menu item.

No data leaves the device. No remote code is loaded. The source is not minified or bundled: the uploaded files are the source files.
```

## Chrome Web Store extras

Single purpose:

```
Show websites the user chooses as web panels in the browser's side panel, next to the current page.
```

Permission justifications (one per field the dashboard asks for):

- **sidePanel**: displays the web panels in Chrome's side panel.
- **declarativeNetRequest + host permission (all sites)**: the panels are websites chosen by the user, shown in frames inside the side panel. Rules remove the X-Frame-Options and Content-Security-Policy response headers of pages framed by the extension's own side panel (rule condition: sub_frame requests initiated by the extension), and set a mobile User-Agent for panels where the user turned on mobile view. Normal tabs are not touched.
- **Host permission / content script**: a small script runs in frames and stays silent until the extension's own side panel page sends it a message; it then reports the frame's address, title and unread count back to the side panel and applies the user's dark-mode / CSS choices.
- **tabs**: add the current tab as a panel and open a panel's page in a new tab.
- **contextMenus**: "Send to Web Panels" in the page and link menus.
- **bookmarks, history**: read-only suggestions in the side panel's search bar.
- **notifications**: optional alerts when a panel's unread count rises.
- **storage**: saves the user's panels and settings locally.

Remote code: none. Data use: nothing is collected or transmitted; tick the "does not collect user data" certifications and link the privacy policy (`PRIVACY.md`).

## Screenshots to capture (1280x800 or similar, PNG)

Take these in your real Zen window with a few panels added, and upload with captions:

1. The sidebar open on the right with a panel showing (caption: "Web panels beside your page")
2. The icon rail with an unread badge and a folder (caption: "Icon rail with unread badges and folders")
3. The search bar with bookmark suggestions showing (caption: "Search with bookmark and history suggestions")
4. A panel's Edit dialog (caption: "Mobile view, dark mode, notifications and more per panel")
