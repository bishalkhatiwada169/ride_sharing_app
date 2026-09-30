# Local APK drop folder for LAN installs

Place a **release** build here (or run `.\scripts\publish-apks.ps1` from the repo root).

The product is **one Android app** with passenger and driver roles inside.

| File | App |
|------|-----|
| `passenger.apk` | Unified Ride app (passenger + driver) |

`driver.apk` is legacy and is no longer listed on the public downloads page.

The backend serves the install at `/downloads/apk/passenger.apk`.
Public page: `/downloads` (QR code, no login).

Do not commit APK binaries.
