# Applies the sidebar UI tweaks (hide the browser's own title bar, ~1/4 width,
# sidebar on the right) to a Zen profile. Close Zen first, restart it afterwards.
# Safe to re-run: it only appends what's missing.
# Usage: .\scripts\apply-ui-tweaks.ps1 [-ProfilePath <path>]
param([string]$ProfilePath)

$ErrorActionPreference = 'Stop'
$src = Join-Path (Split-Path -Parent $PSScriptRoot) 'dev-profile'

if (-not $ProfilePath) {
    $ProfilePath = (Get-ChildItem (Join-Path $env:APPDATA 'zen\Profiles') -Directory |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}
if (-not (Test-Path $ProfilePath)) { throw "Profile not found: $ProfilePath" }
if (Get-Process zen -ErrorAction SilentlyContinue) { throw 'Close Zen completely first.' }

function Add-Block($target, $source, $marker) {
    $existing = if (Test-Path $target) { Get-Content $target -Raw } else { '' }
    if ($existing -match [regex]::Escape($marker)) { Write-Host "Already in $target"; return }
    Add-Content $target ("`r`n" + (Get-Content $source -Raw))
    Write-Host "Updated $target"
}

New-Item -ItemType Directory -Force (Join-Path $ProfilePath 'chrome') | Out-Null
Add-Block (Join-Path $ProfilePath 'chrome\userChrome.css') (Join-Path $src 'chrome\userChrome.css') 'zen-sidebar:'
Add-Block (Join-Path $ProfilePath 'user.js') (Join-Path $src 'user.js') '// zen-sidebar'
Write-Host "Done for $ProfilePath. Start Zen again."
