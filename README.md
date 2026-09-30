# Ride Platform

Commercial ride-hailing platform: passenger app, driver app, admin dashboard, and Spring Boot backend.

**Current phase: MVP Phases 0–7 complete (local/dev).**  
Not production-ready: payments/SMS/push are mocks; mobile UIs are API harnesses; no managed staging/prod deploy in-repo.

---

## Repository structure

```
ride-platform/
├── apps/
│   ├── passenger-mobile/     # RN passenger API harness
│   ├── driver-mobile/        # RN driver API harness
│   └── admin-web/            # React + Vite ops console
├── backend/                  # Spring Boot (Dockerfile for Compose profile full)
├── packages/
│   ├── api-types/
│   ├── validation/
│   └── shared-config/
├── infrastructure/
│   ├── docker/               # Compose: PostGIS + Redis (+ optional backend w/ embedded admin)
│   └── nginx/                # optional standalone admin image only
├── deploy/
│   ├── android/              # APK publish (GitHub Actions → S3)
│   └── dns/                  # Route53 ride.bkcs.app (AWS SDK)
├── docs/
└── .github/workflows/        # ci.yml, publish-android-apk.yml, ensure-dns.yml
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| JDK | 21+ |
| Node.js | 22 LTS (admin web) |
| Docker | for Postgres+PostGIS & Redis (matching + realtime) |
| Git | any recent |

---

## Local quick start

```powershell
# Terminal 0 — PostGIS + Redis (recommended for Phases 3/6)
.\scripts\start-infra.ps1

# Terminal 1 — backend
.\scripts\start-backend.ps1

# Terminal 2 — admin (optional Vite HMR)
.\scripts\start-admin.ps1
```

With `backend/.env` using `DB_EMBEDDED=false` and PostGIS Flyway locations (see `backend/.env.example`).

- Backend / Swagger: http://localhost:8080/swagger-ui.html  
- Admin (Vite HMR): http://localhost:5173  
- Admin (embedded, after `npm run build` in `apps/admin-web` then `bootJar` / Compose `full`): http://localhost:8080/  
- Default local admin: `admin@example.com` / `ChangeMeNow123!` (from `backend/.env`)

Optional full containers (API + embedded admin SPA on one port):  
`docker compose -f infrastructure/docker/docker-compose.yml --profile full up -d --build`  
→ http://localhost:8080

Full Windows notes: [docs/SETUP_WINDOWS.md](docs/SETUP_WINDOWS.md)

Passenger OTP uses mock SMS (code printed in backend logs).

### Android APK installs (CI → S3)

Publish from GitHub Actions (**Publish Android APK**), not a local PowerShell script.
See [deploy/android/README.md](deploy/android/README.md).

```
# After CI publish + VITE_ANDROID_MANIFEST_URL set on admin-web:
# http://localhost:5173/downloads   (or embedded admin /downloads)
```

One Android app — choose Passenger or Driver after install.

### DNS (`ride.bkcs.app`)

```powershell
cd deploy/dns
npm install
npm run ensure-dns
```

Or GitHub → Actions → **Ensure Ride DNS**. Details: [deploy/dns/README.md](deploy/dns/README.md).

### Shared host deploy (TLS)

```powershell
# GitHub → Actions → Deploy Shared Host
# Docs: deploy/shared/README.md
# Live: https://ride.bkcs.app  /  https://api.ride.bkcs.app
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PHASE1.md](docs/PHASE1.md) | Phase 1 deliverables |
| [docs/PHASE2.md](docs/PHASE2.md) | Phase 2 deliverables |
| [docs/PHASE3.md](docs/PHASE3.md) | Phase 3 deliverables |
| [docs/PHASE4.md](docs/PHASE4.md) | Phase 4 deliverables |
| [docs/PHASE5.md](docs/PHASE5.md) | Phase 5 deliverables |
| [docs/PHASE6.md](docs/PHASE6.md) | Phase 6 deliverables |
| [docs/PHASE7.md](docs/PHASE7.md) | Phase 7 ops polish |
| [docs/PRD.md](docs/PRD.md) | Product requirements |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [docs/API.md](docs/API.md) | API groups |
| [docs/SECURITY.md](docs/SECURITY.md) | Security |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Dev conventions |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy / ops |

---

## Phase status

| Phase | Status | Scope |
|-------|--------|--------|
| 0 | Done | Architecture & docs |
| 1 | Done | Backend skeleton, auth, admin shell, Docker, CI |
| 2 | Done | Drivers, vehicles, fares, ride state machine, matching stub |
| **3** | **Done** | WebSocket tracking, Redis fan-out, admin live feed |
| **4** | **Done** | Payments gateway, wallets, admin payments |
| **5** | **Done** | Ratings, SOS, trip share, admin safety |
| **6** | **Done** | PostGIS matching, offers, mobile wiring |
| **7** | **Done** | Admin pricing, mock push, audit logs, live dashboard |
| Later | Optional | Real Stripe/eSewa, FCM/APNs, map SDK polish, ML dispatch |

---

## Configuration

Copy `.env.example` files; never commit real secrets. All provider keys are environment-driven for client handover.
