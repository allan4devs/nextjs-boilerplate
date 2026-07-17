#Requires -Version 5.1
<#
.SYNOPSIS
  Move this Next.js repo off OneDrive to a local folder for faster dev.

.DESCRIPTION
  Copies the working tree (including .git and .env*) to a local path,
  skips heavy/cache dirs, runs npm install, and prints next steps.

  Does NOT delete or modify the OneDrive copy. Safe to re-run only with
  -Force (overwrites destination).

.PARAMETER Destination
  Target folder. Default: C:\dev\nextjs-boilerplate

.PARAMETER Force
  If destination exists, remove it and copy again.

.PARAMETER SkipInstall
  Copy only; do not run npm install.

.EXAMPLE
  .\scripts\migrate-off-onedrive.ps1

.EXAMPLE
  .\scripts\migrate-off-onedrive.ps1 -Destination C:\dev\xtreme-gym -Force
#>
[CmdletBinding()]
param(
  [string]$Destination = "C:\dev\nextjs-boilerplate",
  [switch]$Force,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "    $Message" -ForegroundColor Green
}

function Write-WarnMsg([string]$Message) {
  Write-Host "    $Message" -ForegroundColor Yellow
}

# Resolve source = repo root (parent of scripts/)
$Source = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Test-Path (Join-Path $Source "package.json"))) {
  throw "No package.json at source: $Source"
}

$sourceNorm = $Source.TrimEnd('\', '/').ToLowerInvariant()
$destNorm = $Destination.TrimEnd('\', '/').ToLowerInvariant()
if ($sourceNorm -eq $destNorm) {
  throw "Destination cannot be the same as the source folder."
}

if ($Destination -match '(?i)OneDrive') {
  throw "Destination still looks like OneDrive: $Destination. Pick a local path (e.g. C:\dev\...)."
}

Write-Host ""
Write-Host "Migrate Next.js repo off OneDrive" -ForegroundColor White
Write-Host "  From: $Source"
Write-Host "  To:   $Destination"
Write-Host ""

# Env files present at source (these usually are not in git)
$envFiles = @(Get-ChildItem -Path $Source -Force -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^\.env' })
if ($envFiles.Count -gt 0) {
  Write-Ok ("Env files to copy: " + ($envFiles.Name -join ", "))
} else {
  Write-WarnMsg "No .env* files found at source. You may need to recreate env vars later."
}

if (Test-Path $Destination) {
  $existing = @(Get-ChildItem -Path $Destination -Force -ErrorAction SilentlyContinue)
  if ($existing.Count -gt 0 -and -not $Force) {
    throw "Destination already exists: $Destination`nRe-run with -Force to replace it, or pick another -Destination."
  }
  if ($Force) {
    Write-Step "Removing existing destination (-Force)"
    Remove-Item -LiteralPath $Destination -Recurse -Force
    Write-Ok "Removed $Destination"
  }
}

$parent = Split-Path -Parent $Destination
if ($parent -and -not (Test-Path $parent)) {
  Write-Step "Creating parent folder: $parent"
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

Write-Step "Copying project (excluding node_modules, .next, caches)"
# /E  subdirs including empty
# /XD exclude directories
# /R:2 /W:2 retries for locked OneDrive files
$excludeDirs = @(
  "node_modules",
  ".next",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "out",
  ".cache"
)

$robolog = Join-Path $env:TEMP ("migrate-onedrive-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$roboArgs = @(
  $Source,
  $Destination,
  "/E",
  "/COPY:DAT",
  "/R:2",
  "/W:2",
  "/XD"
) + $excludeDirs + @(
  "/NFL",
  "/NDL",
  "/NP",
  "/TEE",
  "/LOG:$robolog"
)

# robocopy exit codes 0-7 are success (with various copy stats)
$robo = Start-Process -FilePath "robocopy.exe" -ArgumentList $roboArgs -Wait -PassThru -NoNewWindow
if ($robo.ExitCode -ge 8) {
  throw "robocopy failed with exit code $($robo.ExitCode). See log: $robolog"
}
Write-Ok "Copy finished (robocopy code $($robo.ExitCode)). Log: $robolog"

# Double-check env landed
foreach ($f in $envFiles) {
  $destEnv = Join-Path $Destination $f.Name
  if (Test-Path $destEnv) {
    Write-Ok "Copied $($f.Name)"
  } else {
    Write-WarnMsg "Missing after copy: $($f.Name) - copying manually"
    Copy-Item -LiteralPath $f.FullName -Destination $destEnv -Force
  }
}

if (-not $SkipInstall) {
  Write-Step "npm install at destination"
  Push-Location $Destination
  try {
    if (Test-Path (Join-Path $Destination "package-lock.json")) {
      & npm ci
      if ($LASTEXITCODE -ne 0) {
        Write-WarnMsg "npm ci failed; falling back to npm install"
        & npm install
      }
    } else {
      & npm install
    }
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE"
    }
    Write-Ok "Dependencies installed"
  } finally {
    Pop-Location
  }
} else {
  Write-WarnMsg "Skipped npm install (-SkipInstall). Run npm install in $Destination"
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Open the new folder in your editor:"
Write-Host "       code `"$Destination`""
Write-Host "     or Cursor / Grok from that path."
Write-Host "  2. Start dev yourself (do not leave servers running in agents):"
Write-Host "       cd `"$Destination`""
Write-Host "       npm run dev"
Write-Host "  3. Confirm the OneDrive warning is gone."
Write-Host "  4. Optional - free space on the old copy:"
Write-Host "       - Keep the OneDrive folder as backup for a few days, then delete"
Write-Host "         node_modules and .next there, or the whole clone once you trust the new path."
Write-Host "       - Point all terminals/shortcuts at $Destination from now on."
Write-Host "  5. Git remote is unchanged; push/pull still go to the same GitHub repo."
Write-Host ""
Write-Host "Old (OneDrive) path left untouched:"
Write-Host "  $Source"
Write-Host ""
