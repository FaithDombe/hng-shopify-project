$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot 'mobile'

$nodeFolder = Join-Path $env:ProgramFiles 'nodejs'
if ((Test-Path (Join-Path $nodeFolder 'node.exe')) -and ($env:PATH -notlike "*$nodeFolder*")) {
    $env:PATH = "$nodeFolder;$env:PATH"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js is needed to run the mobile app.' -ForegroundColor Red
    Write-Host 'Install Node.js LTS from https://nodejs.org/, close this window, and try again.'
    Read-Host 'Press Enter to close this window'
    exit 1
}

Push-Location $project
try {
    Write-Host '===================================================' -ForegroundColor Cyan
    Write-Host ' Everyday Market - Mobile App (Tunnel Mode)' -ForegroundColor Green
    Write-Host ' Use this if your phone is on cellular data or another Wi-Fi.' -ForegroundColor Yellow
    Write-Host '===================================================' -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'Starting Expo in tunnel mode...' -ForegroundColor Cyan
    Write-Host ''
    npx.cmd expo start --tunnel -c
} catch {
    Write-Host "`nThe mobile app could not start: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host 'Press Enter to close this window'
    exit 1
} finally {
    Pop-Location
}
