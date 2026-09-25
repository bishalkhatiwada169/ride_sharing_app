# Phase 3 smoke: Redis + WS endpoint + ride status event path (backend must be running)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$base = "http://localhost:8080"

Write-Host "1) Health (incl. Redis)"
$health = Invoke-RestMethod -Uri "$base/actuator/health"
if ($health.status -ne "UP") { throw "Health not UP: $($health | ConvertTo-Json -Depth 6)" }
Write-Host "   status=$($health.status)"

Write-Host "2) SockJS info endpoint"
$info = Invoke-RestMethod -Uri "$base/ws/info"
if (-not $info.entropy) { throw "SockJS /ws/info missing entropy" }
Write-Host "   sockjs ok websocket=$($info.websocket)"

Write-Host "3) Admin login + live subscribe auth path (REST fallback)"
$admin = Invoke-RestMethod -Method Post -Uri "$base/api/v1/auth/admin/login" `
  -ContentType "application/json" `
  -Body (@{ email = "admin@example.com"; password = "ChangeMeNow123!" } | ConvertTo-Json)
$token = $admin.accessToken
$live = Invoke-RestMethod -Uri "$base/api/v1/rides/admin/live" -Headers @{ Authorization = "Bearer $token" }
Write-Host "   live rides=$($live.Count)"

Write-Host "Phase 3 smoke OK (connect admin Live page for STOMP feed)"
