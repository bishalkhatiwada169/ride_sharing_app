# Android emulator / device notes (passenger)

See `src/config/env.ts` for the active API base URL.

| Target | `Env.apiBaseUrl` example |
|--------|--------------------------|
| Android emulator | `http://10.0.2.2:8080/api/v1` (default) |
| iOS simulator | `http://localhost:8080/api/v1` |
| Physical device | `http://<PC-LAN-IP>:8080/api/v1` (same Wi‑Fi; open firewall TCP 8080) |

`.env.example` documents the same values; Metro does not auto-load `.env` in this app yet — edit `env.ts`.

## MAP-1: Google Maps (Android)

1. In Google Cloud, enable **Maps SDK for Android** only (not Places/Routes for this phase).
2. Create a **development** API key; restrict to Android apps:
   - Package: `com.passengerapp`
   - SHA-1 from the debug keystore (`android/app/debug.keystore`, alias `androiddebugkey`, password `android`)
3. Copy `android/local.properties.example` → `android/local.properties` (gitignored) and set:
   - `sdk.dir=...`
   - `GOOGLE_MAPS_ANDROID_API_KEY=...`
4. Rebuild the native app (`npm run android`). Hot reload does not apply manifest key changes.
5. Open Home / Booking / Active ride — map should pan and zoom over Kathmandu.

Without a key, the app still builds; map tiles will be blank/grey until the key is configured.

Windows note: very long project paths under OneDrive can break `assembleDebug` (MAX_PATH / CMake object path limits). Prefer a shorter local path if native builds fail.
