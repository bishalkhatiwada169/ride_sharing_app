# Start backend with local bootstrap admin (PowerShell)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root "backend"
Set-Location $backend

$envFile = Join-Path $backend ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
      $parts = $line.Split("=", 2)
      $name = $parts[0].Trim()
      $value = $parts[1].Trim()
      Set-Item -Path "Env:$name" -Value $value
    }
  }
  Write-Host "Loaded $envFile"
}

if (-not $env:BOOTSTRAP_SUPERADMIN_EMAIL) {
  $env:BOOTSTRAP_SUPERADMIN_EMAIL = "admin@example.com"
}
if (-not $env:BOOTSTRAP_SUPERADMIN_PASSWORD) {
  $env:BOOTSTRAP_SUPERADMIN_PASSWORD = "ChangeMeNow123!"
}
if (-not $env:JWT_SECRET) {
  $env:JWT_SECRET = "local_dev_only_change_me_to_long_random_secret_32chars"
}
if (-not $env:SPRING_PROFILES_ACTIVE) {
  $env:SPRING_PROFILES_ACTIVE = "local"
}

Write-Host "Starting Ride Platform backend (profile=$env:SPRING_PROFILES_ACTIVE)..."
.\gradlew.bat bootRun
