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
$existing = Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/zedu-hng/zedu-fe/pulls?state=open&head=zedu-flamingo%3Afix%2Fflamingo-0260-3b-update-contributors-heading&base=dev" -Headers $headers
if ($existing.Count -gt 0) { throw "A PR from this team branch is already open: $($existing[0].html_url)" }
$body = @'
## Ticket

- **Ticket ID:** ZFL-00005
- **Ticket title:** Update the Zedu-Flamingo contributors page heading to “Flamingo Contributors Board”.
- **Ticket link:** [Assigned contributor task row](https://docs.google.com/spreadsheets/d/1wxe3934e0WKK1RavkVq31kUHwT7_LmdUgd2tSJxKiEs/edit?gid=659656445#gid=659656445)

## Team lead

@jenniferamanze @thesongmartins

## What changed

Updated the main heading on `/contributors/zedu-flamingo` to “Flamingo Contributors Board”.

## Why

This is the heading specified for Task 3b in the assigned contributor task.

## How to test

1. Open `/contributors/zedu-flamingo` in the fork preview.
2. Confirm the main heading reads “Flamingo Contributors Board”.

## What to expect

The page displays “Flamingo Contributors Board” as its main heading.

## Backend

Not applicable; this change does not use backend data.

## Test evidence

- Tested against: Pending the team fork build/preview.
- Tests: No automated test added; this is a copy-only heading change.

## Mandatory checks

- [x] **Atomic:** one logical change, one line.
- [x] **Database / API contract:** Not applicable; no schema or API changes.
- [ ] **Preview:** Pending the team fork build/preview.
- [x] **Protected files:** No protected files changed.

## Screenshots / recording

Pending preview; this is a text-only heading change.

## AI usage

AI coding assistance was used to make and review the one-line heading change.

## Checklist

- [x] Linked to the assigned ZFL-00005 task row above
- [x] Only intended files changed
- [x] No secrets or debug code committed
- [ ] Tests added/updated for what this ticket changed (no tests added; copy-only text change)
- [ ] Fork build triggered (will run from the registered team fork after opening)
- [ ] Team lead approved this PR
- [x] Self-reviewed (`git status` / `git diff`)
'@
$payloadJson = @{
  title = "fix(FLAMINGO-0260): update 3b flamingo contributors page heading"
  head = "zedu-flamingo:fix/flamingo-0260-3b-update-contributors-heading"
  base = "dev"
  body = $body
} | ConvertTo-Json -Depth 5
$payload = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)
$response = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/zedu-hng/zedu-fe/pulls" -Headers $headers -ContentType "application/json" -Body $payload
Write-Output (ConvertTo-Json @{number=$response.number; url=$response.html_url; state=$response.state; title=$response.title; head=$response.head.label; sha=$response.head.sha} -Compress)
