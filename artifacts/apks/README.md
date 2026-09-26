# Local APK drop folder for LAN installs

Place **release** builds here (or run `.\scripts\publish-apks.ps1` from the repo root).
Debug APKs need Metro; the publish script builds release APKs with the JS bundle
and points the API at your LAN IP.

| File | App |
|------|-----|
| `passenger.apk` | Passenger mobile |
| `driver.apk` | Driver mobile |

The backend serves them at `/downloads/apk/passenger.apk` and `/downloads/apk/driver.apk`.
Public page: `/downloads` (QR codes, no login).

Do not commit APK binaries.
