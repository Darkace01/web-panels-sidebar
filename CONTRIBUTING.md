# Contributing

Thanks for wanting to help! This project is a small web-panel sidebar for Zen/Firefox and Chrome. You don't need to be an expert: reporting a bug, testing in a browser you use, or improving the docs is just as valuable as code.

Please be kind and constructive in issues and pull requests.

## Ways to help

- **Test it.** The extension has not been run in every browser yet. Install it, use it for a day, and report what breaks. This is the most useful thing right now.
- **Report a bug** or suggest a feature by opening an issue (templates are provided).
- **Fix something.** Look for issues, or pick from the ideas below.
- **Improve the docs**, translations of the listing, or the icons.

Good first ideas: sites that need a better unread-count detector, a nicer default for unrecognised search engines, a way to resize panels in Chrome, support for more browsers, tests.

## Reporting a bug

Open an issue and include:

1. Browser and version (for example "Zen 1.24b" or "Chrome 130"), and your operating system.
2. Which build you used (`dist/firefox` or `dist/chrome`) and the extension version.
3. What you did, what you expected, and what happened. Screenshots help.
4. Errors from the console:
   - **Sidebar page:** right-click inside the sidebar, **Inspect**, then the **Console** tab.
   - **Background script:** Firefox `about:debugging` > this extension > **Inspect**; Chrome `chrome://extensions` > **service worker**.
5. The site involved, if one panel misbehaves (and whether it works in a normal tab).

## Setting up

You need [Node.js](https://nodejs.org) 20+ (the build uses only Node itself) and, to redraw icons, Python with Pillow.

```bash
git clone <your fork>
cd web-panels-sidebar
npm install
npm run build        # builds dist/firefox and dist/chrome
npm run lint         # builds the Firefox version and lints it
```

Run it:

- **Firefox / Zen:** `npm run start:firefox` (opens Zen in a throwaway profile; edit the path in `package.json` if Zen is elsewhere), or load `dist/firefox/manifest.json` from `about:debugging`.
- **Chrome:** open `chrome://extensions`, turn on Developer mode, **Load unpacked**, pick `dist/chrome`. After each rebuild press the reload arrow on the extension.

After changing a file in `shared/`, `firefox/` or `chrome/`, run `npm run build` again. Never edit `dist/` by hand: it is generated and git-ignored.

## How the code is organised

```
shared/lib/compat.js       `browser` alias for Chrome + the Platform object (every browser difference)
shared/lib/store.js        Store: saved panels/settings, search-engine helpers, URL checks
shared/sidebar/            the sidebar page: sidebar.html, sidebar.css, sidebar.js
shared/content/panel-agent.js   runs inside panel frames (reports address/title/unread count, dark mode, CSS)
shared/content/opener.js        Firefox only: first click opens the sidebar
shared/icons/              icons (redraw PNGs with scripts/make-icons.py)
firefox/                   manifest.json (MV2) + background.js (blocking webRequest)
chrome/                    manifest.json (MV3) + background.js (service worker, declarativeNetRequest)
scripts/build.mjs          assembles dist/<browser>
dev-profile/               optional Zen look tweaks
```

Key ideas:

- **One shared sidebar page.** Put new features in `shared/` so both browsers get them. If something only works in one browser, put the difference behind `Platform` in `compat.js` rather than checking the browser elsewhere.
- **Panels are iframes.** The background script removes the headers that block framing. Firefox edits headers with blocking `webRequest`; Chrome must use `declarativeNetRequest` rules, which can only remove or set whole headers.
- **Sidebar and page agent talk with `postMessage`.** Messages look like `{__zs: true, type, ...}`. The sidebar only trusts messages whose `event.source` is one of its own panel frames; the agent only trusts its parent when the parent's origin is the extension. Keep this two-way check when you touch it, since panels hold arbitrary websites.
- **State lives in `storage.local`.** Keys and defaults are in `Store.DEFAULTS`; every sidebar window stays in sync through `storage.onChanged`.
- **User actions.** `sidebarAction.open()` / `sidePanel.open()` only work inside a user action, so call them before any `await` in a handler.
- **Chrome's service worker can stop at any moment.** Don't keep state in variables there.

## Making a change

1. Fork the repo and create a branch with a short descriptive name (`fix-badge-parsing`, `add-panel-reorder-keys`).
2. Keep the change focused: one fix or feature per pull request.
3. Follow the existing style: plain JavaScript, no frameworks or bundlers, two-space indentation, double quotes, small functions with a short comment where the reason isn't obvious. Build DOM with the `el()` helper and `textContent`; **never** put page or user data in `innerHTML`.
4. Run `npm run lint` and `node --check <file>` on files you changed. Fix any warnings.
5. Test in a real browser (see the checklist below). Say in the pull request which browsers you tried.
6. If you add a permission, say why in the pull request, and update [PRIVACY.md](PRIVACY.md) and [`store/listing.md`](store/listing.md).
7. Update the README or this file if behaviour or setup changes.
8. Commit with a clear message in the imperative ("Fix unread count for titles like `[3]`"), then open a pull request using the template.

### Manual test checklist

- [ ] Add a panel with `+` (current page and by address); it opens and shows the site
- [ ] Mobile view on/off changes the site layout
- [ ] Back, forward and reload work after navigating inside a panel
- [ ] Closing a panel's view and reopening it works; reordering by drag works
- [ ] Right-click menu on an icon: edit, reload, zoom, remove
- [ ] Search bar: a search and an address both navigate; suggestions appear
- [ ] Folders, export and import round-trip your panels
- [ ] No red errors in the sidebar console or background console

## Pull request review

A maintainer will review when they can. Expect questions, especially on anything touching permissions, headers or `postMessage`. Small, well-explained changes get merged fastest.

## Releasing (maintainers)

Bump `version` in `package.json`, `firefox/manifest.json` and `chrome/manifest.json` (the build refuses mismatched versions), run `npm run package`, and follow [PUBLISHING.md](PUBLISHING.md).

## Licence

By contributing you agree that your work is released under the project's [MIT licence](LICENSE).
