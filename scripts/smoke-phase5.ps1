# Phase 5 smoke: contacts, SOS, rating, trip share
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$base = "http://localhost:8080/api/v1"
$terminalsRoot = "$env:USERPROFILE\.cursor\projects\c-Users-bisha-OneDrive-Documents-Ride-sharing-app\terminals"

function PostJson($url, $body, $token) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers.Authorization = "Bearer $token" }
  $json = if ($null -eq $body) { "{}" } else { ($body | ConvertTo-Json -Depth 8) }
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $json
}
function PutJson($url, $body, $token) {
  $headers = @{ "Content-Type" = "application/json"; Authorization = "Bearer $token" }
  return Invoke-RestMethod -Method Put -Uri $url -Headers $headers -Body ($body | ConvertTo-Json -Depth 8)
}
function RequestNoContent($url, $body) {
  Invoke-WebRequest -Method Post -Uri $url -ContentType "application/json" -Body ($body | ConvertTo-Json) -UseBasicParsing | Out-Null
}
function LoginPhone([string]$phone) {
  RequestNoContent "$base/auth/otp/request" @{ phoneE164 = $phone }
  $otp = $null
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 500
    foreach ($f in (Get-ChildItem $terminalsRoot -Filter "*.txt" -EA SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 8)) {
      $m = Select-String -Path $f.FullName -Pattern "\[MockSms\] OTP for $([regex]::Escape($phone)) => (\d+)" | Select-Object -Last 1
      if ($m) { $otp = $m.Matches[0].Groups[1].Value; break }
    }
    if ($otp) { break }
  }
  if (-not $otp) { throw "OTP missing for $phone" }
  return PostJson "$base/auth/otp/verify" @{ phoneE164 = $phone; code = $otp } $null
}

Write-Host "1) Driver online"
$admin = PostJson "$base/auth/admin/login" @{ email = "admin@example.com"; password = "ChangeMeNow123!" } $null
$adminToken = $admin.accessToken
$driver = LoginPhone "+9779822222222"
$dToken = $driver.accessToken
$dRefresh = $driver.refreshToken
try { PostJson "$base/drivers/me/application" @{ displayName = "Safety Driver" } $dToken | Out-Null } catch {}
$driver = PostJson "$base/auth/token/refresh" @{ refreshToken = $dRefresh } $null
$dToken = $driver.accessToken
try { PostJson "$base/drivers/me/submit" @{} $dToken | Out-Null } catch {}
try { PostJson "$base/drivers/admin/$($driver.user.id)/approve" @{} $adminToken | Out-Null } catch {}
$rawV = Invoke-RestMethod -Uri "$base/vehicles/me" -Headers @{ Authorization = "Bearer $dToken" }
$vs = @($rawV | Where-Object { $_ })
if ($vs.Count -eq 0) {
  $v = PostJson "$base/vehicles/me" @{ vehicleType = "ECONOMY"; make = "Kia"; model = "Rio"; color = "Blue"; year = 2019; plateNumber = "BA-5-SAFE"; seats = 4 } $dToken
  PostJson "$base/vehicles/admin/$($v.id)/activate" @{} $adminToken | Out-Null
} elseif ($vs[0].status -ne "ACTIVE") {
  PostJson "$base/vehicles/admin/$($vs[0].id)/activate" @{} $adminToken | Out-Null
}
PostJson "$base/drivers/me/online" @{} $dToken | Out-Null
Invoke-RestMethod -Method Put -Uri "$base/drivers/me/location" -Headers @{ Authorization = "Bearer $dToken"; "Content-Type" = "application/json" } -Body '{"lat":27.7172,"lng":85.3240}' | Out-Null

Write-Host "2) Passenger contacts + ride"
$passenger = LoginPhone "+9779811111111"
$pToken = $passenger.accessToken
PutJson "$base/safety/emergency-contacts" @{
  contacts = @(@{ name = "Mom"; phoneE164 = "+9779800000001"; relationship = "family" })
} $pToken | Out-Null
$quote = PostJson "$base/pricing/quotes" @{
  vehicleType = "ECONOMY"; pickupLat = 27.7172; pickupLng = 85.3240
  dropoffLat = 27.7050; dropoffLng = 85.3200; pickupAddress = "Thamel"; dropoffAddress = "Durbar"
} $pToken
$ride = PostJson "$base/rides" @{ fareQuoteId = $quote.id; paymentMethod = "CASH" } $pToken
$pin = $ride.tripPin
if ($ride.status -ne "DRIVER_ACCEPTED") { throw "Expected DRIVER_ACCEPTED" }

Write-Host "3) SOS"
$sos = PostJson "$base/safety/rides/$($ride.id)/sos" @{ lat = 27.7172; lng = 85.3240; notes = "Smoke SOS" } $pToken
if ($sos.type -ne "SOS") { throw "SOS failed" }
Write-Host "   incident=$($sos.id)"

Write-Host "4) Trip share"
$share = PostJson "$base/safety/rides/$($ride.id)/share" @{} $pToken
$view = Invoke-RestMethod -Uri "$base/safety/share/$($share.token)"
Write-Host "   share status=$($view.status)"

Write-Host "5) Complete + rate"
PostJson "$base/rides/$($ride.id)/arriving" @{} $dToken | Out-Null
PostJson "$base/rides/$($ride.id)/arrived" @{} $dToken | Out-Null
PostJson "$base/rides/$($ride.id)/start" @{ pin = $pin } $dToken | Out-Null
PostJson "$base/rides/$($ride.id)/complete" @{} $dToken | Out-Null
$rating = PostJson "$base/ratings/rides/$($ride.id)" @{ score = 5; comment = "Great" } $pToken
Write-Host "   rating=$($rating.score)"

$incidents = Invoke-RestMethod -Uri "$base/safety/admin/incidents" -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "   admin incidents=$($incidents.Count)"
Write-Host "Phase 5 smoke OK"
