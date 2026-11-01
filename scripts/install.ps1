# Installs the mod locally into a Zen profile for testing.
# Usage: .\scripts\install.ps1 [-ProfilePath <path>]
param([string]$ProfilePath)

$root = Split-Path -Parent $PSScriptRoot
$theme = Get-Content (Join-Path $root 'theme.json') -Raw | ConvertFrom-Json

if (-not $ProfilePath) {
    $profiles = Join-Path $env:APPDATA 'zen\Profiles'
    $ProfilePath = (Get-ChildItem $profiles -Directory |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}
if (-not (Test-Path $ProfilePath)) { throw "Profile not found: $ProfilePath" }

$dest = Join-Path $ProfilePath "chrome\zen-themes\$($theme.id)"
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item (Join-Path $root 'chrome.css') $dest -Force
Copy-Item (Join-Path $root 'preferences.json') $dest -Force

$registryPath = Join-Path $ProfilePath 'zen-themes.json'
$registry = if (Test-Path $registryPath) {
    Get-Content $registryPath -Raw | ConvertFrom-Json -AsHashtable
} else { @{} }

$registry[$theme.id] = @{
    id          = $theme.id
    name        = $theme.name
    description = $theme.description
    author      = $theme.author
    version     = $theme.version
    enabled     = $true
    isLocal     = $true
    preferences = $false
}
$registry | ConvertTo-Json -Depth 5 | Set-Content $registryPath -Encoding UTF8

Write-Host "Installed to $dest"
Write-Host "Close Zen fully and reopen it. If the mod doesn't show in Settings > Mods, check CLAUDE.md."
