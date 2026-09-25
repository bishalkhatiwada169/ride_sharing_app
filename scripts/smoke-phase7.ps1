# Phase 7 smoke: dashboard, pricing admin, push devices, audit, support
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$base = "http://localhost:8080/api/v1"
$terminalsRoot = "$env:USERPROFILE\.cursor\projects\c-Users-bisha-OneDrive-Documents-Ride-sharing-app\terminals"

function PostJson($url, $body, $token) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers.Authorization = "Bearer $token" }
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body (($body | ConvertTo-Json -Depth 6))
}
function PutJson($url, $body, $token) {
  $headers = @{ "Content-Type" = "application/json"; Authorization = "Bearer $token" }
  return Invoke-RestMethod -Method Put -Uri $url -Headers $headers -Body (($body | ConvertTo-Json -Depth 6))
}
function GetJson($url, $token) {
  return Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $token" }
}
function RequestNoContent($url, $body) {
  Invoke-WebRequest -Method Post -Uri $url -ContentType "application/json" -Body ($body | ConvertTo-Json) -UseBasicParsing | Out-Null
}
function LoginPhone([string]$phone) {
  RequestNoContent "$base/auth/otp/request" @{ phoneE164 = $phone }
  $otp = $null
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 400
    foreach ($f in (Get-ChildItem $terminalsRoot -Filter "*.txt" -EA SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 8)) {
      $m = Select-String -Path $f.FullName -Pattern "\[MockSms\] OTP for $([regex]::Escape($phone)) => (\d+)" | Select-Object -Last 1
      if ($m) { $otp = $m.Matches[0].Groups[1].Value; break }
    }
    if ($otp) { break }
  }
  if (-not $otp) { throw "OTP missing for $phone" }
  return PostJson "$base/auth/otp/verify" @{ phoneE164 = $phone; code = $otp } $null
}

$admin = PostJson "$base/auth/admin/login" @{ email = "admin@example.com"; password = "ChangeMeNow123!" } $null
$ah = $admin.accessToken

$dash = GetJson "$base/admin/dashboard" $ah
Write-Host "dashboard live=$($dash.liveRides) online=$($dash.onlineDrivers) incidents=$($dash.openIncidents)"

$rawRules = Invoke-RestMethod -Uri "$base/pricing/admin/rules" -Headers @{ Authorization = "Bearer $ah" }
$ruleJson = (@($rawRules) | ConvertTo-Json -Depth 8)
if ($ruleJson.TrimStart().StartsWith("[")) {
  $r = ($ruleJson | ConvertFrom-Json)[0]
} else {
  $r = $ruleJson | ConvertFrom-Json
}
if (-not $r.id) { throw "Expected fare rules" }
$ruleId = "$($r.id)"
$origActive = [bool]$r.active
$bodyOff = @{
  name = "$($r.name)"; vehicleType = "$($r.vehicleType)"; cityCode = $(if ($r.cityCode) { "$($r.cityCode)" } else { $null })
  currency = "$($r.currency)"; baseFareMinor = [int64]"$($r.baseFareMinor)"; perKmMinor = [int64]"$($r.perKmMinor)"
  perMinuteMinor = [int64]"$($r.perMinuteMinor)"; bookingFeeMinor = [int64]"$($r.bookingFeeMinor)"
  minFareMinor = [int64]"$($r.minFareMinor)"; taxBps = [int]"$($r.taxBps)"; surgeMultiplier = [decimal]"$($r.surgeMultiplier)"
  active = (-not $origActive); priority = [int]"$($r.priority)"
}
$toggled = PutJson "$base/pricing/admin/rules/$ruleId" $bodyOff $ah
$bodyOn = $bodyOff.Clone(); $bodyOn.active = $origActive
PutJson "$base/pricing/admin/rules/$ruleId" $bodyOn $ah | Out-Null
Write-Host "pricing toggle ok ($origActive -> $($toggled.active) -> restored)"

$passenger = LoginPhone "+9779811177777"
PostJson "$base/notifications/me/devices" @{ platform = "android"; token = "smoke-phase7-token" } $passenger.accessToken | Out-Null
PostJson "$base/notifications/me/test-push" @{ title = "Smoke"; body = "Phase7" } $passenger.accessToken | Out-Null
Write-Host "device + test-push ok"

$ticket = PostJson "$base/support/tickets" @{
  category = "BILLING"; subject = "Smoke ticket"; description = "Phase 7"; priority = "NORMAL"
} $passenger.accessToken
$tickets = @(GetJson "$base/support/admin/tickets" $ah)
if (-not ($tickets | Where-Object { $_.id -eq $ticket.id })) { throw "Ticket not listed for admin" }
PostJson "$base/support/admin/tickets/$($ticket.id)/status" @{ status = "RESOLVED" } $ah | Out-Null
Write-Host "support ticket=$($ticket.id) resolved"

# Approve path creates audit when a pending driver exists; always read endpoint
$audit = @(GetJson "$base/admin/audit-logs" $ah)
Write-Host "audit entries=$($audit.Count)"

Write-Host "Phase 7 ops smoke OK"
