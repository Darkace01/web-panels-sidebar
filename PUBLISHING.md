# Publishing

The extension is `extension/`. Everything the store asks for is in this repo:

| Need | File |
|---|---|
| Extension package source | `extension/` (manifest, scripts, icons) |
| PNG icons 48/96/128 | `extension/icons/` (regenerate with `python scripts/make-icons.py`) |
| Listing text, categories, reviewer notes, screenshot list | `store/listing.md` |
| Privacy policy | `PRIVACY.md` |
| Licence | `LICENSE` |

## Before you submit

1. Replace `SUPPORT_CONTACT` in `PRIVACY.md` with your support email or issue-tracker URL.
2. Check the copyright holder in `LICENSE` and the `author` in `extension/manifest.json` ("Beere Softwares" was assumed).
3. Take the screenshots listed in `store/listing.md` in a real Zen window.
4. Run it once in Zen (`npm run start`) and fix anything broken; this project has not yet been tested in a running Zen.
5. Bump `version` in `extension/manifest.json` (and `package.json`) for every upload; the store rejects a version it has seen.

## Option A: list it publicly on addons.mozilla.org

1. Make an account at https://addons.mozilla.org/developers/ and turn on two-factor authentication.
2. Build the package:
   ```bash
   npm install
   npm run lint
   npm run build
   ```
   This writes a `.zip` into `web-ext-artifacts/`.
3. In the developer hub choose **Submit a New Add-on**, pick **On this site**, upload the `.zip`, and answer "No" to the source-code question (nothing is minified or bundled).
4. Fill the listing from `store/listing.md`, upload the icon and screenshots, paste the privacy policy and reviewer notes.
5. Submit. Extensions with `<all_urls>` and `webRequestBlocking` get a manual review, which can take days; reply to reviewer questions with the notes in `store/listing.md`.

## Option B: sign it for yourself only (not listed)

Get an API key at https://addons.mozilla.org/developers/addon/api/key/, then:

```bash
set WEB_EXT_API_KEY=your-jwt-issuer
set WEB_EXT_API_SECRET=your-jwt-secret
npm run sign
```

The signed `.xpi` lands in `web-ext-artifacts/`; open it in Zen to install permanently. Share it with others by sending the `.xpi`.

## Notes

- Release builds of Zen (and Firefox) only keep signed extensions, so either option is needed for a permanent install.
- The extension id `zen-sidebar@beeresoftwares.com` is permanent once published; don't change it.
- Manifest V2 is used because blocking `webRequest` is needed; Firefox still supports it.
- The optional Zen CSS tweaks (`dev-profile/`, `scripts/apply-ui-tweaks.ps1`) are not part of the extension package; mention them in the listing as optional, as `store/listing.md` does.
