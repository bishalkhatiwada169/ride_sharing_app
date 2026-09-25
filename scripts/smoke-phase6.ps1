# Phase 6 smoke: PostGIS match still assigns with auto-accept
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$base = "http://localhost:8080/api/v1"
$terminalsRoot = "$env:USERPROFILE\.cursor\projects\c-Users-bisha-OneDrive-Documents-Ride-sharing-app\terminals"

function PostJson($url, $body, $token) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers.Authorization = "Bearer $token" }
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body (($body | ConvertTo-Json -Depth 6))
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
  if (-not $otp) { throw "OTP missing" }
  return PostJson "$base/auth/otp/verify" @{ phoneE164 = $phone; code = $otp } $null
}

$admin = PostJson "$base/auth/admin/login" @{ email = "admin@example.com"; password = "ChangeMeNow123!" } $null
$driver = LoginPhone "+9779822222222"
$dToken = $driver.accessToken
$dRefresh = $driver.refreshToken
try { PostJson "$base/drivers/me/application" @{ displayName = "Match Driver" } $dToken | Out-Null } catch {}
$driver = PostJson "$base/auth/token/refresh" @{ refreshToken = $dRefresh } $null
$dToken = $driver.accessToken
try { PostJson "$base/drivers/me/submit" @{} $dToken | Out-Null } catch {}
try { PostJson "$base/drivers/admin/$($driver.user.id)/approve" @{} $admin.accessToken | Out-Null } catch {}
$rawV = Invoke-RestMethod -Uri "$base/vehicles/me" -Headers @{ Authorization = "Bearer $dToken" }
$vs = @($rawV | Where-Object { $_ })
if ($vs.Count -eq 0) {
  $v = PostJson "$base/vehicles/me" @{ vehicleType = "ECONOMY"; make = "Hyundai"; model = "i10"; color = "Red"; year = 2021; plateNumber = "BA-6-MATCH"; seats = 4 } $dToken
  PostJson "$base/vehicles/admin/$($v.id)/activate" @{} $admin.accessToken | Out-Null
} elseif ($vs[0].status -ne "ACTIVE") {
  PostJson "$base/vehicles/admin/$($vs[0].id)/activate" @{} $admin.accessToken | Out-Null
}
PostJson "$base/drivers/me/online" @{} $dToken | Out-Null
Invoke-RestMethod -Method Put -Uri "$base/drivers/me/location" -Headers @{ Authorization = "Bearer $dToken"; "Content-Type" = "application/json" } -Body '{"lat":27.7172,"lng":85.3240}' | Out-Null

$passenger = LoginPhone "+9779811111111"
$quote = PostJson "$base/pricing/quotes" @{
  vehicleType = "ECONOMY"; pickupLat = 27.7172; pickupLng = 85.3240
  dropoffLat = 27.71; dropoffLng = 85.32; pickupAddress = "A"; dropoffAddress = "B"
} $passenger.accessToken
$ride = PostJson "$base/rides" @{ fareQuoteId = $quote.id; paymentMethod = "CASH" } $passenger.accessToken
if ($ride.status -ne "DRIVER_ACCEPTED") { throw "Expected DRIVER_ACCEPTED via PostGIS+auto-accept, got $($ride.status)" }
Write-Host "matched ride=$($ride.id) driver=$($ride.driverUserId)"
$offers = Invoke-RestMethod -Uri "$base/matching/offers/me" -Headers @{ Authorization = "Bearer $dToken" }
Write-Host "pending offers (expect 0 after auto-accept)=$($offers.Count)"
Write-Host "Phase 6 matching smoke OK"
