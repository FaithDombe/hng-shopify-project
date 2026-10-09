$ErrorActionPreference = "Stop"
$credentialLines = "protocol=https`nhost=github.com`n`n" | git credential fill
$credential = @{}
foreach ($line in $credentialLines) {
  if ($line -match "^([^=]+)=(.*)$") { $credential[$Matches[1]] = $Matches[2] }
}
if (-not $credential.ContainsKey("password")) { throw "No GitHub API credential is available." }
$headers = @{
  Authorization = "Bearer $($credential['password'])"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}
$payload = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json @{ref="fix/flamingo-0260-3b-update-contributors-heading"} -Compress))
Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/zedu-flamingo/zedu-fe/actions/workflows/pr-build.yml/dispatches" -Headers $headers -ContentType "application/json" -Body $payload
Write-Output "Dispatched the team fork PR build for PR #369's branch."
