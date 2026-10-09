$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot

# Use the standard Node.js install folder even if this PowerShell window has an old PATH.
$nodeFolder = Join-Path $env:ProgramFiles 'nodejs'
if ((Test-Path (Join-Path $nodeFolder 'node.exe')) -and ($env:PATH -notlike "*$nodeFolder*")) {
    $env:PATH = "$nodeFolder;$env:PATH"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js is needed to run the website.' -ForegroundColor Red
    Write-Host 'Install the LTS version from https://nodejs.org/, close this window, and open start.ps1 again.'
    Read-Host 'Press Enter to close this window'
    exit 1
}

Push-Location $project
try {
    if (-not (Test-Path 'node_modules')) {
        Write-Host 'First run: installing the website packages. Please wait...'
        npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Package installation failed. Check your internet connection and try again.' }
    }
    Write-Host ''
    Write-Host 'Starting Little List. Open http://localhost:5173 in your browser.' -ForegroundColor Green
    Write-Host 'Keep this window open while you use the app. Press Ctrl+C to stop it.'
    npm.cmd run dev -- --host 127.0.0.1
} catch {
    Write-Host "`nThe app could not start: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host 'Press Enter to close this window'
    exit 1
} finally {
    Pop-Location
}
