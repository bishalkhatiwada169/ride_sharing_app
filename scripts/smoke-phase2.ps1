# Phase 2 end-to-end smoke (backend must be running against Docker PostGIS)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$base = "http://localhost:8080/api/v1"
$terminalsRoot = "$env:USERPROFILE\.cursor\projects\c-Users-bisha-OneDrive-Documents-Ride-sharing-app\terminals"

function PostJson($url, $body, $token) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers.Authorization = "Bearer $token" }
  $json = if ($null -eq $body) { "{}" } else { ($body | ConvertTo-Json -Depth 8) }
  try {
    return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $json
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
      Write-Host "POST $url => $($sr.ReadToEnd())"
    }
    throw
  }
}

function PutJson($url, $body, $token) {
  $headers = @{ "Content-Type" = "application/json"; Authorization = "Bearer $token" }
  return Invoke-RestMethod -Method Put -Uri $url -Headers $headers -Body ($body | ConvertTo-Json -Depth 6)
}

function RequestNoContent($url, $body) {
  Invoke-WebRequest -Method Post -Uri $url -ContentType "application/json" -Body ($body | ConvertTo-Json) -UseBasicParsing | Out-Null
}

function LoginPhone([string]$phone) {
  RequestNoContent "$base/auth/otp/request" @{ phoneE164 = $phone }
  $otp = $null
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 500
    $files = Get-ChildItem $terminalsRoot -Filter "*.txt" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 8
    foreach ($f in $files) {
      $m = Select-String -Path $f.FullName -Pattern "\[MockSms\] OTP for $([regex]::Escape($phone)) => (\d+)" |
        Select-Object -Last 1
      if ($m) {
        $otp = $m.Matches[0].Groups[1].Value
        break
      }
    }
    if ($otp) { break }
  }
  if (-not $otp) { throw "Could not read OTP for $phone from backend logs" }
  return PostJson "$base/auth/otp/verify" @{ phoneE164 = $phone; code = $otp } $null
}

Write-Host "1) Admin login"
$admin = PostJson "$base/auth/admin/login" @{ email = "admin@example.com"; password = "ChangeMeNow123!" } $null
$adminToken = $admin.accessToken
Write-Host "   ok"

Write-Host "2) Driver OTP login + onboard"
$driver = LoginPhone "+9779822222222"
$driverToken = $driver.accessToken
$driverRefresh = $driver.refreshToken
PostJson "$base/drivers/me/application" @{ displayName = "Smoke Driver" } $driverToken | Out-Null
$driver = PostJson "$base/auth/token/refresh" @{ refreshToken = $driverRefresh } $null
$driverToken = $driver.accessToken
PostJson "$base/drivers/me/submit" @{} $driverToken | Out-Null
$driverUserId = $driver.user.id
PostJson "$base/drivers/admin/$driverUserId/approve" @{} $adminToken | Out-Null

$rawVehicles = Invoke-RestMethod -Uri "$base/vehicles/me" -Headers @{ Authorization = "Bearer $driverToken" }
$vehicles = @($rawVehicles | Where-Object { $_ -ne $null })
if ($vehicles.Count -eq 0) {
  $vehicle = PostJson "$base/vehicles/me" @{
    vehicleType = "ECONOMY"
    make = "Toyota"
    model = "Vitz"
    color = "White"
    year = 2018
    plateNumber = "BA-1-SMOKE"
    seats = 4
  } $driverToken
} else {
  $vehicle = $vehicles[0]
}
if ($vehicle.status -ne "ACTIVE") {
  PostJson "$base/vehicles/admin/$($vehicle.id)/activate" @{} $adminToken | Out-Null
}
PostJson "$base/drivers/me/online" @{} $driverToken | Out-Null
PutJson "$base/drivers/me/location" @{ lat = 27.7172; lng = 85.3240 } $driverToken | Out-Null
Write-Host "   driver approved + online vehicle=$($vehicle.id)"

Write-Host "3) Passenger quote + book"
$passenger = LoginPhone "+9779811111111"
$pToken = $passenger.accessToken
$quote = PostJson "$base/pricing/quotes" @{
  vehicleType = "ECONOMY"
  pickupLat = 27.7172
  pickupLng = 85.3240
  dropoffLat = 27.7000
  dropoffLng = 85.3200
  pickupAddress = "Thamel"
  dropoffAddress = "Patan"
} $pToken
Write-Host "   quote=$($quote.id) totalMinor=$($quote.totalMinor)"
$ride = PostJson "$base/rides" @{ fareQuoteId = $quote.id; paymentMethod = "CASH" } $pToken
$pin = $ride.tripPin
Write-Host "   ride=$($ride.id) status=$($ride.status) pin=$pin"
if ($ride.status -ne "DRIVER_ACCEPTED") {
  throw "Expected DRIVER_ACCEPTED after match, got $($ride.status)"
}

Write-Host "4) Driver trip lifecycle"
PostJson "$base/rides/$($ride.id)/arriving" @{} $driverToken | Out-Null
PostJson "$base/rides/$($ride.id)/arrived" @{} $driverToken | Out-Null
$ride = PostJson "$base/rides/$($ride.id)/start" @{ pin = $pin } $driverToken
if ($ride.status -ne "RIDE_STARTED") { throw "Expected RIDE_STARTED, got $($ride.status)" }
$ride = PostJson "$base/rides/$($ride.id)/complete" @{} $driverToken
if ($ride.status -ne "RIDE_COMPLETED") { throw "Expected RIDE_COMPLETED, got $($ride.status)" }
Write-Host "   completed status=$($ride.status)"

Write-Host "5) Admin live rides"
$live = Invoke-RestMethod -Uri "$base/rides/admin/live" -Headers @{ Authorization = "Bearer $adminToken" }
$drivers = Invoke-RestMethod -Uri "$base/drivers/admin" -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "   live=$($live.Count) drivers=$($drivers.Count)"

Write-Host "Phase 2 full ride smoke OK"
