# Install / repair Android SDK packages for Ride Platform mobile apps
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$sdkmanager = Join-Path $sdk "cmdline-tools\latest\bin\sdkmanager.bat"

if (-not (Test-Path $sdkmanager)) {
  throw "sdkmanager not found at $sdkmanager. Re-run Android cmdline-tools setup first."
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$javaHome = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty FullName
if ($javaHome) { $env:JAVA_HOME = $javaHome }

Write-Host "Accepting licenses..."
$yes = ("y`n" * 80)
$yes | & $sdkmanager --sdk_root=$sdk --licenses | Out-Null

Write-Host "Installing platform-tools, platforms;android-35, build-tools;35.0.0 ..."
& $sdkmanager --sdk_root=$sdk --install `
  "platform-tools" `
  "platforms;android-35" `
  "build-tools;35.0.0"

Write-Host "Done. SDK contents:"
Get-ChildItem $sdk | Select-Object Name
