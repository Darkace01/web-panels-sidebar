# Installs fx-autoconfig (script loader) and Zen Sidebar into Zen.
# Run from an ELEVATED PowerShell: fx-autoconfig writes into Zen's install folder.
# Re-run after Zen updates (updates can overwrite the loader files).
# Usage: .\scripts\install.ps1 [-ZenDir <path>] [-ProfilePath <path>]
param(
    [string]$ZenDir = 'C:\Program Files\Zen Browser',
    [string]$ProfilePath
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path (Join-Path $ZenDir 'application.ini'))) { throw "Zen not found at $ZenDir" }
if (-not $ProfilePath) {
    $ProfilePath = (Get-ChildItem (Join-Path $env:APPDATA 'zen\Profiles') -Directory |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}
if (-not (Test-Path $ProfilePath)) { throw "Profile not found: $ProfilePath" }
if (Get-Process zen -ErrorAction SilentlyContinue) { throw 'Close Zen completely first.' }

# 1. fx-autoconfig loader
$tmp = Join-Path $env:TEMP 'fx-autoconfig'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
git clone --depth 1 https://github.com/MrOtherGuy/fx-autoconfig $tmp
Copy-Item (Join-Path $tmp 'program\*') $ZenDir -Recurse -Force
Copy-Item (Join-Path $tmp 'profile\chrome\*') (Join-Path $ProfilePath 'chrome') -Recurse -Force

# 2. Zen Sidebar script
$js = Join-Path $ProfilePath 'chrome\JS'
New-Item -ItemType Directory -Force $js | Out-Null
Copy-Item (Join-Path $root 'src\zen_sidebar.uc.mjs') $js -Force

Write-Host "Installed. Profile: $ProfilePath"
Write-Host "Start Zen once with:  & '$ZenDir\zen.exe' -purgecaches"
