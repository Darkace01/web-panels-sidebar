# Zen Sidebar

A Vivaldi / Brave / Edge-style sidebar for Zen Browser: a slim icon rail of web panels that open beside the page.

Zen no longer ships web panels (none in 1.24b), and CSS-only mods can't add one, so this is a userChrome script loaded with [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig).

## Features

- Icon rail with site favicons; click to open a panel, click again to close
- Add the current page or any website; right-click a rail icon to edit, reload, unload, remove
- Per-panel Firefox container, with a colored underline on the icon
- Mobile-site mode per panel
- Per-panel zoom, back/forward/reload/home, open in a new tab
- Drag icons to reorder; drag the panel edge to resize
- Rail on the left or right
- Panels load lazily and idle ones unload after 15 minutes (never while playing media)
- Shortcuts: `Ctrl+Alt+1..9` toggle a panel, `Ctrl+Alt+0` close, `Ctrl+Alt+B` toggle last panel

## Install (Windows)

Close Zen, then in an **administrator** PowerShell:

```powershell
.\scripts\install.ps1
```

Start Zen once with `-purgecaches` (the script prints the exact command). Re-run the script after Zen updates.

Settings live in `zen_sidebar.json` in your profile folder.
