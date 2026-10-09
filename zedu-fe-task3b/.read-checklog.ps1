$ErrorActionPreference = "Stop"
$credentialLines = "protocol=https`nhost=github.com`n`n" | git credential fill
$credential = @{}
foreach ($line in $credentialLines) { if ($line -match "^([^=]+)=(.*)$") { $credential[$Matches[1]] = $Matches[2] } }
$headers = @{ Authorization="Bearer $($credential['password'])"; Accept="application/vnd.github+json"; "X-GitHub-Api-Version"="2022-11-28" }
Invoke-WebRequest -Uri "https://api.github.com/repos/zedu-hng/zedu-fe/actions/jobs/112016971737/logs" -Headers $headers -OutFile ".branch-check.zip"
Expand-Archive -Path ".branch-check.zip" -DestinationPath ".branch-check-logs" -Force
Get-ChildItem ".branch-check-logs" -Filter "*.txt" | ForEach-Object { Select-String -Path $_.FullName -Pattern "::error|doesn't match|not match|pattern|HEAD_REF" -Context 1,2 | ForEach-Object { $_.Line } }
Remove-Item -LiteralPath (Join-Path (Get-Location).Path ".branch-check.zip") -Force
$rootPath = (Get-Location).Path
$logsPath = [System.IO.Path]::GetFullPath((Join-Path $rootPath ".branch-check-logs"))
if (-not $logsPath.StartsWith($rootPath + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Refusing to remove a path outside the workspace." }
Remove-Item -LiteralPath $logsPath -Recurse -Force
