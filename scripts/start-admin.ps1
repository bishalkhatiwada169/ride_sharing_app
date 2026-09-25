# Start admin web
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location (Join-Path $root "apps\admin-web")

if (-not (Test-Path "node_modules")) {
  npm install
}

npm run dev
