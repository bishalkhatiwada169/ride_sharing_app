# Smoke-test Phase 1 auth endpoints (backend must be running)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$base = "http://localhost:8080"

Write-Host "GET $base/"
Invoke-RestMethod "$base/" | ConvertTo-Json

Write-Host "GET $base/actuator/health"
Invoke-RestMethod "$base/actuator/health" | ConvertTo-Json

$phone = "+9779800000001"
Write-Host "POST OTP request for $phone"
Invoke-RestMethod -Method Post -Uri "$base/api/v1/auth/otp/request" `
  -ContentType "application/json" `
  -Body (@{ phoneE164 = $phone } | ConvertTo-Json) | Out-Null
Write-Host "OTP sent (check backend logs for MockSms code)"

Write-Host "POST admin login"
$login = Invoke-RestMethod -Method Post -Uri "$base/api/v1/auth/admin/login" `
  -ContentType "application/json" `
  -Body (@{ email = "admin@example.com"; password = "ChangeMeNow123!" } | ConvertTo-Json)

Write-Host "Access token acquired for $($login.user.email) roles=$($login.user.roles -join ',')"

$headers = @{ Authorization = "Bearer $($login.accessToken)" }
$me = Invoke-RestMethod -Uri "$base/api/v1/auth/me" -Headers $headers
Write-Host "GET /auth/me => $($me.displayName) [$($me.status)]"
Write-Host "Smoke OK"
