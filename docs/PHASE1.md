# Phase 1 — Foundation

## Delivered

- Monorepo + docs (Phase 0)
- Spring Boot auth foundation (OTP mock, JWT, admin login, RBAC)
- Embedded PostgreSQL local fallback (`DB_EMBEDDED=true`)
- Admin web shell (login + dashboard)
- Docker Desktop installed; Compose files ready (PostGIS needs reboot/WSL)
- React Native 0.78 passenger + driver apps
- Android Studio + SDK (platform-tools, API 35, build-tools, NDK 27.1)
- Passenger `assembleDebug` **BUILD SUCCESSFUL**
- Helper scripts under `scripts/`
- CI workflow skeleton

## Verified (at Phase 1 delivery)

| Check | Result |
|-------|--------|
| Backend health | UP |
| Auth smoke (admin login + `/me`) | Pass |
| Admin Vite | 200 |
| Passenger Android debug APK | Built |
| Docker PostGIS | Required Docker Desktop / WSL; use `.\scripts\after-reboot-setup.ps1` if needed |

> Note: Later phases (6–7) assume Docker PostGIS + Redis for matching and realtime. See `README.md`.

## After reboot (Docker)

```powershell
.\scripts\after-reboot-setup.ps1
```

## Run

See `docs/SETUP_WINDOWS.md`.
