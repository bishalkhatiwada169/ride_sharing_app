# Development Guide

---

## 1. Prerequisites

| Tool | Use |
|------|-----|
| JDK 21+ | Spring Boot backend |
| Node.js 22 LTS + npm | Admin web |
| Android Studio / SDK | Mobile builds (later) |
| Docker Desktop | Postgres+PostGIS, Redis |
| Git | Source control |

Pinned in root `README.md`, `backend/build.gradle.kts` (Java 21), admin `package.json`.

---

## 2. Repository layout

See root `README.md` and `ARCHITECTURE.md`. Work inside:

- `apps/*` — frontends
- `backend/` — Spring Boot
- `packages/*` — shared TS
- `infrastructure/*` — Docker/nginx
- `docs/*` — architecture (source of truth for Phase 0)

---

## 3. Local startup

```powershell
# infrastructure (db + redis) — required for PostGIS matching + Redis realtime
.\scripts\start-infra.ps1

# backend (loads backend/.env; PostGIS Flyway when DB_EMBEDDED=false)
.\scripts\start-backend.ps1

# admin
.\scripts\start-admin.ps1
```

Passenger/driver React Native apps live under `apps/passenger-mobile` and `apps/driver-mobile`
(API demo harnesses for Phases 6–7 — not polished product UIs).

Copy `.env.example` → `.env` (never commit `.env`).

---

## 4. Coding conventions

### Backend
- Package by domain
- Thin controllers; services own transactions
- DTOs + MapStruct or manual mappers
- Flyway for schema
- Constructor injection
- Tests co-located `src/test/java`

### Admin web
- Feature folders
- TanStack Query for server state
- Zustand only for client UI state
- Zod schemas shared with forms
- Prefer small composed components

### Mobile
- Feature-first screens
- Strict TypeScript
- No fare/status authority in UI beyond display

### General
- No secrets in source
- No giant components
- Match existing style once code exists

---

## 5. API contracts

- Develop against OpenAPI
- Update `packages/api-types` when endpoints change
- Breaking changes require team notice

---

## 6. Branching (recommended)

- `main` — stable
- `develop` — optional integration
- `feature/*`, `fix/*` — short-lived
- PR required; CI green

---

## 7. Commit messages

Imperative, why-focused (e.g. `Add ride transition guard for start`). Conventional Commits optional.

---

## 8. Design system

Follow `ARCHITECTURE.md` design goals. Tokens in shared theme. Do not copy competitor branding.

---

## 9. Mocking external services

Local profiles use:
- `MockSmsGateway` (log OTP)
- `MockPaymentGateway`
- `MockPushGateway`
- Map stub or restricted dev key

---

## 10. Phase status

- **Phases 0–7:** Implemented as an MVP (mock SMS/payments/push; thin mobile harnesses; local Docker for PostGIS+Redis).
- **Not done:** Real payment providers, FCM/APNs, map SDKs, production deploy packaging.
- See root `README.md` and `docs/PHASE*.md`.
