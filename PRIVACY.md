# Privacy Policy: Web Panels Sidebar for Zen

_Last updated: 2026-11-01_

Web Panels Sidebar for Zen ("the extension") does not collect, transmit or sell any personal data. The developer receives nothing from your use of it: there are no accounts, analytics, telemetry or tracking.

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
| `webRequest`, `webRequestBlocking` | To remove headers that stop a site loading inside the sidebar (`X-Frame-Options`, CSP `frame-ancestors`), make cookies work in a framed page, and send a mobile `User-Agent` when you choose mobile view. Only requests made by the sidebar's own panels are changed. |
| `tabs` | To add the current tab to the sidebar and to open a panel's page in a new tab. |
| `menus` | For the "Send to Web Panels" item in the tab, page and link right-click menus. |
| `bookmarks`, `history` | Only to show suggestions from your bookmarks and history as you type in the sidebar's search bar. They are matched locally and never stored or sent anywhere. |
| `search` | To find out which search engine you use so the search bar and the first panel use it. |
| `notifications` | For the optional desktop alert when a panel's unread count rises. Off by default per panel. |
| `storage` | To save your panels and settings locally. |

## Network requests

The extension itself makes no network requests to the developer or any third party. The pages you pin as panels load from their own websites, exactly as if you opened them in a tab, and are subject to those sites' own privacy policies. Panel icons are fetched from the panel's own site (or the icon the browser already has).

## Children, changes, contact

The extension is not directed at children. If this policy changes, the date above will change and the new version will ship with the extension.

Questions: contact Beere Softwares at SUPPORT_CONTACT (replace with your support email or issue-tracker URL before publishing).
