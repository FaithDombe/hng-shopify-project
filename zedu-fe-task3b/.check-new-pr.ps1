$ErrorActionPreference = "Stop"
$credentialLines = "protocol=https`nhost=github.com`n`n" | git credential fill
$credential = @{}
foreach ($line in $credentialLines) { if ($line -match "^([^=]+)=(.*)$") { $credential[$Matches[1]] = $Matches[2] } }
$headers = @{ Authorization="Bearer $($credential['password'])"; Accept="application/vnd.github+json"; "X-GitHub-Api-Version"="2022-11-28" }
$pr = Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/zedu-hng/zedu-fe/pulls/369" -Headers $headers
$checks = Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/zedu-hng/zedu-fe/commits/$($pr.head.sha)/check-runs?per_page=100" -Headers $headers
$latest = @($checks.check_runs | Sort-Object { [datetime]$_.started_at } -Descending | Select-Object -First 30 | ForEach-Object { [PSCustomObject]@{name=$_.name; status=$_.status; conclusion=$_.conclusion; details_url=$_.details_url} })
Write-Output (ConvertTo-Json @{number=$pr.number; state=$pr.state; title=$pr.title; head_ref=$pr.head.ref; head_repo=$pr.head.repo.full_name; sha=$pr.head.sha; requested_reviewers=@($pr.requested_reviewers | ForEach-Object {$_.login}); checks=$latest} -Depth 8 -Compress)
