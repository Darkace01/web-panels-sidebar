# Web Panels Sidebar

Keep your favourite sites one click away in a sidebar, like the web panels in Vivaldi and Edge. Pin chat, music, email, notes or any website to an icon rail and open it in a panel next to the page you are reading.

Built for **Zen Browser** and **Firefox**, with a separate build for **Chrome** and other Chromium browsers (Brave, Edge). It is free and open source (MIT), and everything stays on your device: no accounts, no analytics.

> **Status:** early version (0.1.0). It builds and lints cleanly but has not yet been tested in a running browser, so expect rough edges. See [Known limitations](#known-limitations) and please report what you find ([CONTRIBUTING.md](CONTRIBUTING.md)).

## What it does

**Panels**
- An icon rail with each site's icon. Click an icon to open its panel, click it again to close that view.
- Add the current page, any address, or right-click a page or link and choose **Send to Web Panels** (Firefox/Zen also adds it to the tab right-click menu).
- Drag icons to reorder them, drop a link on the rail to add it, group panels into **folders**.
- Sites load in their **mobile version** by default, which suits a narrow panel (switch it off per panel).

**Browsing**
- A search bar with back, forward and reload buttons. Type a search or an address.
- Suggestions from your bookmarks and history as you type.
- Per-panel zoom, "back to start page", "open in a new tab", **dark mode** and **custom CSS**.

**Stay on top of things**
- **Unread badges** on icons for sites that show a count in the page title, such as `(3) WhatsApp`. Folders show the total.
- Optional desktop notifications when a panel's unread count goes up.

**Speed and control**
- Panels load on first use, and idle ones unload after a while (you choose how long, or keep chosen ones loaded).
- Keyboard shortcuts (see below), export and import of your panels.

## Install

There is no store release yet. Until there is, build it from source (about two minutes). You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/Darkace01/web-panels-sidebar.git
cd web-panels-sidebar
npm install
npm run build
```

This creates two ready-to-load extensions: `dist/firefox` and `dist/chrome`.

### Zen Browser and Firefox

Firefox and Zen only keep **signed** extensions permanently. Pick one:

- **Try it (temporary, easiest):** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and choose `dist/firefox/manifest.json`. It is removed when the browser closes.
- **Try it in a clean Zen window:** `npm run start:firefox` opens Zen in a temporary profile with the extension and the optional look tweaks below already applied. (It expects Zen in `C:\Program Files\Zen Browser`; edit `package.json` if yours is elsewhere.)
- **Keep it:** sign it for yourself for free (it stays private) with an [addons.mozilla.org](https://addons.mozilla.org/developers/addon/api/key/) API key, then install the `.xpi` it produces. Steps are in [PUBLISHING.md](PUBLISHING.md).

Optional but recommended on Zen, see [Make it look right in Zen](#make-it-look-right-in-zen).

### Chrome, Brave, Edge

1. Run `npm run build`.
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and choose the `dist/chrome` folder.
4. Click the extension's toolbar icon to open the side panel. Choose the left or right side in the browser's own settings.

## Using it

| Do this | To |
|---|---|
| Click `+` on the rail | Add the current page, or add a website by address |
| Click an icon | Open that panel; click it again to close the view |
| Right-click an icon | Edit, reload, back to start page, open in a tab, zoom, unload, remove |
| Right-click a page or link | **Send to Web Panels** |
| Drag an icon | Reorder |
| Drop a link on the rail | Add it as a panel (or open it in the icon you drop it on) |
| `+` > Sidebar settings | Rail side, idle unload time, export and import |

In the **Edit** dialog of a panel you can set its name and address, a folder, mobile view, dark mode, custom CSS, desktop notifications and "keep loaded".

### Keyboard shortcuts

| Keys | Action | Firefox/Zen | Chrome |
|---|---|---|---|
| `Alt+Shift+S` | Open or toggle the sidebar | yes | opens the panel |
| `Alt+Shift+A` | Add the current page | yes | yes |
| `Alt+Shift+1` to `9` | Open panel 1 to 9 | yes | 1 and 2 preset; 3 to 9 can be assigned in `chrome://extensions/shortcuts` |

Change them in `about:addons` (gear icon, **Manage Extension Shortcuts**) on Firefox/Zen, or `chrome://extensions/shortcuts` on Chrome.

## Make it look right in Zen

An extension can't change the browser's own window, so a few things are done with a small style file for Zen. It is optional; without it the extension still works, it just looks plainer.

What it does: hides the browser's own title bar above the sidebar, makes the sidebar about a quarter of the window wide, puts it on the right, lets Zen's tab-area background show through, **shrinks the sidebar to just the icon rail when no panel is open**, and **hides it in Zen's compact mode** (move the pointer to the window edge to slide it out).

Apply it to your Zen profile (close Zen first, restart after):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\apply-ui-tweaks.ps1
```

Run it again after updating this project; it replaces its own block and leaves the rest of your profile files alone. The files it applies are in [`dev-profile/`](dev-profile).

## Known limitations

- **Sites load in frames.** The extension removes the headers that stop sites loading in a frame, so most work, but some (banks, some login pages) may still refuse.
- **Panel logins are separate** from your normal tabs: sign in once inside each panel. In Chrome, logins may not stick at all (see below).
- **Mobile view** changes the request headers only, not what a page's scripts see.
- **Unread badges** only work for sites that put a count at the start of the page title.
- **Dark mode** is an inversion filter, so some sites look off.
- **Not tested yet** in a running browser: see the status note at the top.

### What differs between the builds

| Feature | Firefox / Zen | Chrome / Chromium |
|---|---|---|
| Where it lives | The browser's sidebar | The browser's side panel (left or right set in browser settings) |
| Opens by itself | On your first click or keypress in a page | No, use the toolbar icon or a shortcut |
| Shrink to rail only, hide title bar, compact mode, tab-matching background | Yes, with the Zen style file | No (Chrome gives extensions no access to its own window) |
| Tab right-click menu item | Yes | No (page and link menus only) |
| Uses your default search engine | Yes | No, Google is used |
| Logins inside panels | Cookies are adjusted so most sites stay signed in | Can't adjust cookies, so some sites won't stay signed in |
| Security note | Only the framing headers are removed | The whole `Content-Security-Policy` of a panel's top page is removed (Chrome can't edit it), which weakens that site's protection inside the panel |

## Project layout

```
shared/    code used by both browsers: sidebar page, content scripts, icons, storage
firefox/   Firefox and Zen: manifest.json (Manifest V2) and background.js
chrome/    Chrome: manifest.json (Manifest V3) and service worker background.js
scripts/   build.mjs, make-icons.py, apply-ui-tweaks.ps1
dev-profile/  optional Zen style tweaks (userChrome.css, user.js)
store/     store listing text
dist/      build output (git-ignored)
```

`npm run build` copies `shared/` plus the browser's folder into `dist/<browser>`. More detail for developers is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

Bug reports, ideas and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and open issues at https://github.com/Darkace01/web-panels-sidebar/issues.

## Privacy

Nothing leaves your device. See [PRIVACY.md](PRIVACY.md) for what is stored and why each permission is needed.

## Licence

[MIT](LICENSE)
