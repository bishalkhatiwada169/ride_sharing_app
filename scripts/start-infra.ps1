# Start local infrastructure (PostGIS + Redis)
# Requires Docker Desktop running.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$compose = Join-Path $PSScriptRoot "..\infrastructure\docker\docker-compose.yml"
Write-Host "Starting db + redis via $compose"
docker compose -f $compose up -d db redis
docker compose -f $compose ps
