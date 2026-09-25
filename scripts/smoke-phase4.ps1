# Phase 4: digital payment initiate + signed mock webhook (backend running)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$base = "http://localhost:8080/api/v1"
$terminalsRoot = "$env:USERPROFILE\.cursor\projects\c-Users-bisha-OneDrive-Documents-Ride-sharing-app\terminals"

function PostJson($url, $body, $token, $extraHeaders = @{}) {
  $headers = @{ "Content-Type" = "application/json" } + $extraHeaders
  if ($token) { $headers.Authorization = "Bearer $token" }
  $json = if ($null -eq $body) { "{}" } else { ($body | ConvertTo-Json -Depth 8 -Compress) }
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $json
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
      Sort-Object LastWriteTime -Descending | Select-Object -First 8
    foreach ($f in $files) {
      $m = Select-String -Path $f.FullName -Pattern "\[MockSms\] OTP for $([regex]::Escape($phone)) => (\d+)" |
        Select-Object -Last 1
      if ($m) { $otp = $m.Matches[0].Groups[1].Value; break }
    }
    if ($otp) { break }
  }
  if (-not $otp) { throw "OTP missing for $phone" }
  return PostJson "$base/auth/otp/verify" @{ phoneE164 = $phone; code = $otp } $null
}

Write-Host "1) Ensure driver online"
$admin = PostJson "$base/auth/admin/login" @{ email = "admin@example.com"; password = "ChangeMeNow123!" } $null
$adminToken = $admin.accessToken
$driver = LoginPhone "+9779822222222"
$dToken = $driver.accessToken
$dRefresh = $driver.refreshToken
try { PostJson "$base/drivers/me/application" @{ displayName = "Pay Driver" } $dToken | Out-Null } catch {}
$driver = PostJson "$base/auth/token/refresh" @{ refreshToken = $dRefresh } $null
$dToken = $driver.accessToken
try { PostJson "$base/drivers/me/submit" @{} $dToken | Out-Null } catch {}
try { PostJson "$base/drivers/admin/$($driver.user.id)/approve" @{} $adminToken | Out-Null } catch {}
$rawVehicles = Invoke-RestMethod -Uri "$base/vehicles/me" -Headers @{ Authorization = "Bearer $dToken" }
$vehicles = @($rawVehicles | Where-Object { $_ })
if ($vehicles.Count -eq 0) {
  $v = PostJson "$base/vehicles/me" @{ vehicleType = "ECONOMY"; make = "Honda"; model = "City"; color = "Silver"; year = 2020; plateNumber = "BA-4-PAY"; seats = 4 } $dToken
  PostJson "$base/vehicles/admin/$($v.id)/activate" @{} $adminToken | Out-Null
} elseif ($vehicles[0].status -ne "ACTIVE") {
  PostJson "$base/vehicles/admin/$($vehicles[0].id)/activate" @{} $adminToken | Out-Null
}
PostJson "$base/drivers/me/online" @{} $dToken | Out-Null
Invoke-RestMethod -Method Put -Uri "$base/drivers/me/location" -Headers @{ Authorization = "Bearer $dToken"; "Content-Type" = "application/json" } -Body '{"lat":27.7172,"lng":85.3240}' | Out-Null

Write-Host "2) Passenger digital ride"
$passenger = LoginPhone "+9779811111111"
$pToken = $passenger.accessToken
$quote = PostJson "$base/pricing/quotes" @{
  vehicleType = "ECONOMY"; pickupLat = 27.7172; pickupLng = 85.3240
  dropoffLat = 27.7000; dropoffLng = 85.3200; pickupAddress = "Thamel"; dropoffAddress = "Patan"
} $pToken
$ride = PostJson "$base/rides" @{ fareQuoteId = $quote.id; paymentMethod = "DIGITAL" } $pToken
$pin = $ride.tripPin
if ($ride.status -ne "DRIVER_ACCEPTED") { throw "Expected match, got $($ride.status)" }
PostJson "$base/rides/$($ride.id)/arriving" @{} $dToken | Out-Null
PostJson "$base/rides/$($ride.id)/arrived" @{} $dToken | Out-Null
PostJson "$base/rides/$($ride.id)/start" @{ pin = $pin } $dToken | Out-Null
$ride = PostJson "$base/rides/$($ride.id)/complete" @{} $dToken
Write-Host "   completed paymentStatus=$($ride.paymentStatus)"

Write-Host "3) Initiate digital payment"
$pay = Invoke-RestMethod -Method Post -Uri "$base/payments/rides/$($ride.id)/initiate" `
  -Headers @{ Authorization = "Bearer $pToken"; "Content-Type" = "application/json"; "Idempotency-Key" = "smoke-phase4-$([guid]::NewGuid())" } `
  -Body "{}"
Write-Host "   payment=$($pay.id) status=$($pay.status) providerId=$($pay.providerPaymentId)"

Write-Host "4) Signed mock webhook SUCCEEDED"
$signed = PostJson "$base/payments/mock/sign" @{
  eventId = "evt-smoke-$([guid]::NewGuid())"
  providerPaymentId = $pay.providerPaymentId
  status = "SUCCEEDED"
  amountMinor = $pay.amountMinor
} $adminToken
Invoke-WebRequest -Method Post -Uri "$base/payments/webhooks/mock" `
  -Headers @{ "X-Payment-Signature" = $signed.signature; "Content-Type" = "application/json" } `
  -Body $signed.body -UseBasicParsing | Out-Null

$pay2 = Invoke-RestMethod -Uri "$base/payments/rides/$($ride.id)" -Headers @{ Authorization = "Bearer $pToken" }
if ($pay2.status -ne "SUCCEEDED") { throw "Expected SUCCEEDED, got $($pay2.status)" }
Write-Host "   payment status=$($pay2.status)"

$wallet = Invoke-RestMethod -Uri "$base/wallets/me" -Headers @{ Authorization = "Bearer $dToken" }
Write-Host "   driver wallet balanceMinor=$($wallet.balanceMinor)"

Write-Host "Phase 4 payment smoke OK"
