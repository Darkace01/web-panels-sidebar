# Applies the sidebar UI tweaks (hide the browser's own title bar, ~1/4 width,
# sidebar on the right, tab-matching background) to a Zen profile.
# Close Zen first, restart it afterwards.
# Safe to re-run: it replaces its own block and leaves the rest of your files alone.
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

# Replaces the "zen-sidebar:begin ... zen-sidebar:end" block, or appends it.
function Set-Block($target, $source) {
    $block = (Get-Content $source -Raw).Trim()
    $existing = if (Test-Path $target) { Get-Content $target -Raw } else { '' }
    $pattern = '(?s)(/\*|//) zen-sidebar:begin.*?zen-sidebar:end( \*/)?'
    if ($existing -match $pattern) {
        $new = [regex]::Replace($existing, $pattern, { param($m) $block })
    } else {
        $new = $existing.TrimEnd() + "`r`n`r`n" + $block + "`r`n"
    }
    Set-Content $target $new.TrimStart() -Encoding UTF8
    Write-Host "Updated $target"
}

New-Item -ItemType Directory -Force (Join-Path $ProfilePath 'chrome') | Out-Null
Set-Block (Join-Path $ProfilePath 'chrome\userChrome.css') (Join-Path $src 'chrome\userChrome.css')
Set-Block (Join-Path $ProfilePath 'user.js') (Join-Path $src 'user.js')
Write-Host "Done for $ProfilePath. Start Zen again."
