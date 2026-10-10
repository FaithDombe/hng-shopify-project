$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot 'mobile'

$nodeFolder = Join-Path $env:ProgramFiles 'nodejs'
if ((Test-Path (Join-Path $nodeFolder 'node.exe')) -and ($env:PATH -notlike "*$nodeFolder*")) {
    $env:PATH = "$nodeFolder;$env:PATH"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js is required to build the APK.' -ForegroundColor Red
    Read-Host 'Press Enter to close this window'
    exit 1
}

Push-Location $project
try {
    Write-Host '===================================================' -ForegroundColor Cyan
    Write-Host ' Everyday Market - Generate Android APK' -ForegroundColor Green
    Write-Host '===================================================' -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'This script uses Expo Application Services (EAS) to build' -ForegroundColor Yellow
    Write-Host 'a standalone .apk file for your shop mobile app in the cloud.' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'If you do not have an Expo account yet, create a free one at:' -ForegroundColor White
    Write-Host 'https://expo.dev/signup' -ForegroundColor Cyan
    Write-Host ''
    
    Write-Host 'Checking Expo login status...' -ForegroundColor Cyan
    $whoami = npx.cmd eas-cli whoami 2>&1
    if ($LASTEXITCODE -ne 0 -or $whoami -like "*Not logged in*") {
        Write-Host 'Please log in with your Expo account credentials:' -ForegroundColor Yellow
        npx.cmd eas-cli login
    } else {
        Write-Host "Logged in to Expo as: $whoami" -ForegroundColor Green
    }

    Write-Host ''
    Write-Host 'Starting Android APK build on Expo Cloud...' -ForegroundColor Cyan
    Write-Host 'Press Enter if prompted to generate a new keystore or configure project.' -ForegroundColor Yellow
    Write-Host ''
    
    npx.cmd eas-cli build -p android --profile preview

    Write-Host ''
    Write-Host '===================================================' -ForegroundColor Green
    Write-Host ' BUILD COMPLETE!' -ForegroundColor Green
    Write-Host ' 1. Click the download link printed above to get your APK.' -ForegroundColor White
    Write-Host ' 2. Upload the APK file to Google Drive.' -ForegroundColor White
    Write-Host ' 3. Set the Google Drive link to "Anyone with the link can view".' -ForegroundColor White
    Write-Host '===================================================' -ForegroundColor Green
    Read-Host 'Press Enter to close this window'
} catch {
    Write-Host "`nBuild process failed: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host 'Press Enter to close this window'
    exit 1
} finally {
    Pop-Location
}
