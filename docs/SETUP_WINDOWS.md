# Complete local Phase 1 setup (Windows)

## Already done on this machine
- Git repo
- JDK 21 (Temurin)
- Node.js 24 LTS
- Docker Desktop installed (engine needs WSL + **reboot**)
- Backend runnable with **embedded PostgreSQL** (no Docker required)
- Admin web verified
- React Native 0.78 passenger + driver apps scaffolded
- Android Studio installed
- Android SDK: platform-tools, android-35, build-tools 35, NDK 27.1

## Run every day (no Docker)

```powershell
# Terminal 1 — API
.\scripts\start-backend.ps1

# Terminal 2 — Admin UI
.\scripts\start-admin.ps1
```

- API / Swagger: http://localhost:8080/swagger-ui.html
- Admin (Vite HMR): http://localhost:5173
- Admin (embedded with backend): build admin then jar, or Compose profile `full` → http://localhost:8080/
- Local admin: `admin@example.com` / `ChangeMeNow123!`

```powershell
.\scripts\smoke-auth.ps1
```

## Mobile apps (React Native 0.78)

```powershell
cd apps\passenger-mobile
npm start
# other terminal (device/emulator required for run-android)
npm run android
```

Same for `apps\driver-mobile`.

Repair SDK packages if needed:

```powershell
.\scripts\install-android-sdk.ps1
```

## Enable Docker PostGIS (after reboot)

Windows has a **pending reboot** for WSL. Docker engine will not start until you reboot once.

```powershell
.\scripts\after-reboot-setup.ps1
$env:DB_EMBEDDED = "false"
$env:FLYWAY_LOCATIONS = "classpath:db/migration,classpath:db/migration-postgis"
.\scripts\start-backend.ps1
```
