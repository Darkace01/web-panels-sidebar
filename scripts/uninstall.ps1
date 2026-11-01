# Removes the old Zen Sidebar script and the fx-autoconfig loader from Zen.
# Run from an ELEVATED PowerShell with Zen closed.
# Usage: .\scripts\uninstall.ps1 [-ZenDir <path>] [-ProfilePath <path>] [-KeepLoader]
param(
    [string]$ZenDir = 'C:\Program Files\Zen Browser',
    [string]$ProfilePath,
    [switch]$KeepLoader # remove only the sidebar, keep fx-autoconfig for other scripts
)

$ErrorActionPreference = 'Stop'
if (-not $ProfilePath) {
    $ProfilePath = (Get-ChildItem (Join-Path $env:APPDATA 'zen\Profiles') -Directory |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}
if (Get-Process zen -ErrorAction SilentlyContinue) { throw 'Close Zen completely first.' }

$chrome = Join-Path $ProfilePath 'chrome'
Remove-Item (Join-Path $chrome 'JS\zen_sidebar.uc.mjs') -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $ProfilePath 'zen_sidebar.json') -Force -ErrorAction SilentlyContinue

if (-not $KeepLoader) {
    Remove-Item (Join-Path $ZenDir 'config.js') -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $ZenDir 'defaults\pref\config-prefs.js') -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $chrome 'utils') -Recurse -Force -ErrorAction SilentlyContinue
    # fx-autoconfig's folders: only remove if nothing else is in them
    foreach ($d in 'JS', 'CSS', 'resources') {
        $path = Join-Path $chrome $d
        if ((Test-Path $path) -and -not (Get-ChildItem $path -Recurse -File)) {
            Remove-Item $path -Recurse -Force
        }
    }
}

Write-Host "Removed. Start Zen once with:  & '$ZenDir\zen.exe' -purgecaches"
