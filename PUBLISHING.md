# Publishing

The project builds two extensions from one codebase:

| Browser | Source | Build output | Store |
|---|---|---|---|
| Firefox and Zen | `shared/` + `firefox/` | `dist/firefox` | addons.mozilla.org (AMO) |
| Chrome, Brave, Edge | `shared/` + `chrome/` | `dist/chrome` | Chrome Web Store (Edge also has its own Add-ons store and accepts the Chrome package) |

Everything the stores ask for is in this repo:

| Need | File |
|---|---|
| Package source | `shared/`, `firefox/`, `chrome/` (built by `npm run build`) |
| PNG icons 48/96/128 | `shared/icons/` (redraw with `python scripts/make-icons.py`) |
| Listing text, categories, permission justifications, reviewer notes, screenshot list | `store/listing.md` |
| Privacy policy | `PRIVACY.md` |
| Licence | `LICENSE` |

## Before you submit (both stores)

1. Check the support link in `PRIVACY.md` (it points to the repository's issues page; swap in a support email if you prefer).
2. Check the copyright holder in `LICENSE` and the `author` in both manifests ("Beere Softwares" was assumed).
3. Take the screenshots listed in `store/listing.md` in a real browser (1280x800 PNG).
4. Test both builds in a real browser (see `CONTRIBUTING.md`). This project has not been tested in a running browser yet, so do not skip this.
5. Bump the version in **three** places: `package.json`, `firefox/manifest.json` and `chrome/manifest.json`. The build refuses to run if they differ, and stores reject a version they have seen.
6. Build the packages:
   ```bash
   npm install
   npm run lint
   npm run package
   ```
   This writes two zips into `web-ext-artifacts/`: `web_panels_sidebar_for_zen-<version>.zip` (Firefox) and `web_panels_sidebar_chrome-<version>.zip` (Chrome).

## Firefox / Zen: addons.mozilla.org

### Option A: list it publicly

1. Make an account at https://addons.mozilla.org/developers/ and turn on two-factor authentication.
2. **Submit a New Add-on**, choose **On this site**, upload the Firefox zip, and answer "No" to the source-code question (nothing is minified or bundled; the uploaded files are the source).
3. Fill the listing from `store/listing.md` (use the "Firefox / Zen" name), upload the icon and screenshots, paste the privacy policy and the reviewer notes.
4. Submit. Extensions with all-sites access and blocking `webRequest` get a manual review that can take days; answer reviewer questions with the notes in `store/listing.md`.

### Option B: sign it for yourself only (not listed)

Get an API key at https://addons.mozilla.org/developers/addon/api/key/, then:

```bash
set WEB_EXT_API_KEY=your-jwt-issuer
set WEB_EXT_API_SECRET=your-jwt-secret
npm run sign
```

The signed `.xpi` is written to `web-ext-artifacts/`; open it in Zen to install permanently, or send it to other people.

Release builds of Zen and Firefox only keep signed extensions, so one of these two options is needed for a permanent install.

## Chrome Web Store

1. Register as a developer at https://chrome.google.com/webstore/devconsole (one-time fee) and turn on two-factor authentication.
2. **Add new item** and upload the Chrome zip.
3. Fill the **Store listing** tab from `store/listing.md` (use the "Chrome" name), upload the 128px icon and the screenshots.
4. Fill the **Privacy** tab: paste the "Single purpose" and the permission justifications from the "Chrome Web Store extras" section of `store/listing.md`, certify that no user data is collected, and link the privacy policy (host `PRIVACY.md` somewhere public, such as the repository page).
5. Submit for review. Broad host access plus header removal usually means a longer review.

Microsoft Edge Add-ons accepts the same Chrome zip at https://partner.microsoft.com/dashboard/microsoftedge.

## Notes

- The Firefox extension id `zen-sidebar@beeresoftwares.com` is permanent once published; don't change it.
- Firefox uses Manifest V2 because it needs blocking `webRequest`; Firefox still supports it. Chrome requires Manifest V3, so it uses `declarativeNetRequest`, which is why the Chrome build can't rewrite cookies and removes the whole Content-Security-Policy of a panel's top page. Say so honestly in the Chrome listing (`README.md` has a table of differences).
- The Zen style tweaks (`dev-profile/`, `scripts/apply-ui-tweaks.ps1`) are not part of either package; the Firefox listing mentions them as optional.
