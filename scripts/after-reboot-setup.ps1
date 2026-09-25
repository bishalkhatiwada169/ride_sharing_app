# Run ONCE after Windows reboot (Administrator PowerShell recommended)
# Completes Docker engine + PostGIS/Redis for Ride Platform.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;$env:Path"

Write-Host "==> Checking WSL..."
wsl --status

$dd = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dd) {
  Write-Host "==> Starting Docker Desktop..."
  Start-Process $dd
} else {
  throw "Docker Desktop not found"
}

Write-Host "==> Waiting for Docker engine (up to 5 minutes)..."
$deadline = (Get-Date).AddMinutes(5)
$ready = $false
while ((Get-Date) -lt $deadline) {
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 5
  Write-Host "  still waiting..."
}
if (-not $ready) { throw "Docker engine did not become ready. Open Docker Desktop UI and retry." }

$root = Split-Path $PSScriptRoot -Parent
$compose = Join-Path $root "infrastructure\docker\docker-compose.yml"
Write-Host "==> Starting PostGIS + Redis..."
docker compose -f $compose up -d db redis
docker compose -f $compose ps

Write-Host @"

Docker infra is up.

Next (new terminal):
  `$env:DB_EMBEDDED = 'false'
  `$env:FLYWAY_LOCATIONS = 'classpath:db/migration,classpath:db/migration-postgis'
  .\scripts\start-backend.ps1
  .\scripts\start-admin.ps1

"@
