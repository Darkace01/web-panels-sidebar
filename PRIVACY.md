# Privacy Policy: Web Panels Sidebar

_Last updated: 2026-11-01_

Web Panels Sidebar ("the extension", for Firefox, Zen and Chrome) does not collect, transmit or sell any personal data. The developer receives nothing from your use of it: there are no accounts, analytics, telemetry or tracking.

## What is stored, and where

Everything the extension keeps stays on your device, in the browser's local extension storage:

- your list of panels (name, address, icon address, and the per-panel options you choose: mobile view, zoom, folder, dark mode, custom CSS, notifications, keep loaded)
- your sidebar settings (rail side, idle unload time, close-on-click)

Removing the extension deletes this data. You can also export or import your panels as a file you control.

## What the extension reads, and why

The extension asks for broad browser permissions only to do its job. None of what it reads leaves your device.

| Permission | Why it is needed |
|---|---|
| Access to all websites | To load the sites you pin as panels, adjust how they are framed, and run a small script in them that reports the page address, title and unread count back to the sidebar. |
| `webRequest`, `webRequestBlocking` (Firefox) | To remove headers that stop a site loading inside the sidebar (`X-Frame-Options`, CSP `frame-ancestors`), make cookies work in a framed page, and send a mobile `User-Agent` when you choose mobile view. Only requests made by the sidebar's own panels are changed. |
| `declarativeNetRequest` (Chrome) | The Chrome equivalent of the row above. It removes the `X-Frame-Options` and `Content-Security-Policy` response headers of pages the side panel frames, and sets a mobile `User-Agent` for panels where you chose mobile view. Chrome can only remove whole headers, so the full Content-Security-Policy of a panel's top page is removed; normal tabs are never changed. |
| `sidePanel` (Chrome) | To show the panels in Chrome's side panel. |
| `tabs` | To add the current tab to the sidebar and to open a panel's page in a new tab. |
| `menus` (Firefox) / `contextMenus` (Chrome) | For the "Send to Web Panels" item in the page and link right-click menus (and the tab menu in Firefox). |
| `bookmarks`, `history` | Only to show suggestions from your bookmarks and history as you type in the sidebar's search bar. They are matched locally and never stored or sent anywhere. |
| `search` (Firefox) | To find out which search engine you use so the search bar and the first panel use it. Chrome doesn't allow this, so Google is used there. |
| `notifications` | For the optional desktop alert when a panel's unread count rises. Off by default per panel. |
| `storage` | To save your panels and settings locally. |

## Network requests

The extension itself makes no network requests to the developer or any third party. The pages you pin as panels load from their own websites, exactly as if you opened them in a tab, and are subject to those sites' own privacy policies. Panel icons are fetched from the panel's own site (or the icon the browser already has).

## Children, changes, contact

The extension is not directed at children. If this policy changes, the date above will change and the new version will ship with the extension.

Questions: contact Beere Softwares at https://github.com/Darkace01/web-panels-sidebar/issues.
