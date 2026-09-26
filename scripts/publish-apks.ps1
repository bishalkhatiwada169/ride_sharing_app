# Publish passenger + driver release APKs (JS bundled) for LAN install.
# Debug APKs need Metro; these release builds run standalone on a phone.
#
# Usage (from repo root):
#   .\scripts\publish-apks.ps1
#   .\scripts\publish-apks.ps1 -ApiHost 192.168.18.6
#   .\scripts\publish-apks.ps1 -SkipBuild
#
# Builds from C:\r\<app> to avoid Windows MAX_PATH/CMake failures.

param(
  [switch]$SkipBuild,
  [string]$ApiHost = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root "artifacts\apks"
$shortRoot = "C:\r"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

if (-not $env:ANDROID_HOME -and (Test-Path "$env:LOCALAPPDATA\Android\Sdk")) {
  $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}
if (-not $env:ANDROID_SDK_ROOT -and $env:ANDROID_HOME) {
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

function Get-LanIpv4 {
  $candidates = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*"
    } |
    Select-Object -ExpandProperty IPAddress)
  $preferred = $candidates | Where-Object { $_ -like "192.168.*" } | Select-Object -First 1
  if ($preferred) { return $preferred }
  $ten = $candidates | Where-Object { $_ -like "10.*" } | Select-Object -First 1
  if ($ten) { return $ten }
  return ($candidates | Select-Object -First 1)
}

if (-not $ApiHost) {
  if ($env:APK_PUBLIC_BASE_URL -match "https?://([^/:]+)") {
    $ApiHost = $Matches[1]
  } elseif ($env:RIDE_API_HOST) {
    $ApiHost = $env:RIDE_API_HOST
  } else {
    $ApiHost = Get-LanIpv4
  }
}
if (-not $ApiHost) {
  throw "Could not detect LAN IP. Pass -ApiHost 192.168.x.x"
}

$apiBase = "http://${ApiHost}:8080/api/v1"
$wsBase = "ws://${ApiHost}:8080/ws"
Write-Host "APKs will call API at $apiBase"

function Write-PassengerEnv([string]$path) {
  @(
    "export const Env = {"
    "  apiBaseUrl: '$apiBase',"
    "  wsBaseUrl: '$wsBase',"
    "  environment: 'local' as 'local' | 'staging' | 'production',"
    "  brandName: 'Ride',"
    "};"
  ) | Set-Content -Path $path -Encoding utf8
}

function Write-DriverEnv([string]$path) {
  @(
    "export const Env = {"
    "  apiBaseUrl: `"$apiBase`","
    "  wsBaseUrl: `"$wsBase`","
    "  environment: `"local`" as `"local`" | `"staging`" | `"production`","
    "};"
  ) | Set-Content -Path $path -Encoding utf8
}

$apps = @(
  @{ Name = "passenger"; AppDir = Join-Path $root "apps\passenger-mobile"; Dest = Join-Path $outDir "passenger.apk" },
  @{ Name = "driver"; AppDir = Join-Path $root "apps\driver-mobile"; Dest = Join-Path $outDir "driver.apk" }
)

foreach ($app in $apps) {
  $builtInPlace = Join-Path $app.AppDir "android\app\build\outputs\apk\release\app-release.apk"
  $shortApp = Join-Path $shortRoot $app.Name
  $builtShort = Join-Path $shortApp "android\app\build\outputs\apk\release\app-release.apk"
  $envTs = Join-Path $shortApp "src\config\env.ts"

  if (-not $SkipBuild) {
    if (-not (Test-Path (Join-Path $app.AppDir "node_modules"))) {
      Write-Host "npm install ($($app.Name))..."
      Push-Location $app.AppDir
      try { npm install --silent } finally { Pop-Location }
    }

    $wrapperJar = Join-Path $app.AppDir "android\gradle\wrapper\gradle-wrapper.jar"
    if (-not (Test-Path $wrapperJar)) {
      Write-Host "Downloading gradle-wrapper.jar for $($app.Name)..."
      Invoke-WebRequest -Uri "https://github.com/gradle/gradle/raw/v8.12.0/gradle/wrapper/gradle-wrapper.jar" -OutFile $wrapperJar
    }

    Write-Host "Preparing short build path $shortApp ..."
    New-Item -ItemType Directory -Force -Path $shortRoot | Out-Null
    if (Test-Path $shortApp) {
      Remove-Item $shortApp -Recurse -Force -ErrorAction SilentlyContinue
    }
    robocopy $app.AppDir $shortApp /E /XD android\.cxx android\app\build android\.gradle /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    if ($LASTEXITCODE -ge 8) {
      throw "robocopy failed for $($app.Name) (exit $LASTEXITCODE)"
    }

    # Point packaged JS at this machine LAN API (short-copy only; repo sources unchanged)
    if ($app.Name -eq "passenger") {
      Write-PassengerEnv $envTs
    } else {
      Write-DriverEnv $envTs
    }

    if ($env:ANDROID_HOME) {
      $sdkProp = $env:ANDROID_HOME.Replace("\", "\\")
      "sdk.dir=$sdkProp" | Set-Content (Join-Path $shortApp "android\local.properties") -Encoding ASCII
    }

    Write-Host "Building $($app.Name) release APK (bundled JS, arm64-v8a)..."
    Push-Location (Join-Path $shortApp "android")
    try {
      .\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a"
    } finally {
      Pop-Location
    }

    if (-not (Test-Path $builtShort)) {
      throw "APK not found after build: $builtShort"
    }
    Copy-Item -Force $builtShort $app.Dest
  } else {
    $source = $null
    if (Test-Path $builtShort) { $source = $builtShort }
    elseif (Test-Path $builtInPlace) { $source = $builtInPlace }
    elseif (Test-Path $app.Dest) { $source = $app.Dest }
    if (-not $source) {
      throw "APK not found for $($app.Name). Run without -SkipBuild first."
    }
    if ($source -ne $app.Dest) {
      Copy-Item -Force $source $app.Dest
    }
  }

  $sizeMb = [math]::Round((Get-Item $app.Dest).Length / 1MB, 2)
  Write-Host "Published $($app.Dest) ($sizeMb MB)"
}

Write-Host ""
Write-Host "Done. Reinstall from http://localhost:8080/downloads (uninstall old debug APKs first if needed)."
Write-Host "These release builds include the JS bundle - Metro is not required."
Write-Host "API host baked in: $ApiHost"
