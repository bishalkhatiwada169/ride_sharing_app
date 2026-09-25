# Phase 6 — Advanced matching + mobile wiring

## Scope

- Flyway `V8`: `ride_offers`
- **PostGIS matching**: radius + location freshness, distance then rating sort, fallback if no geo
- Offer dispatch: create `PENDING` offer, WS `DRIVER_OFFER`, accept/reject APIs
- Local default `MATCHING_AUTO_ACCEPT=true` (instant assign for smokes); set `false` for real offer UX
- Offer expiry + searching-ride timeout jobs
- Passenger + driver RN apps: OTP login and core ride/driver actions against local API

## Key APIs

| Method | Path | Role |
|--------|------|------|
| GET | `/api/v1/matching/offers/me` | DRIVER |
| POST | `/api/v1/matching/offers/{id}/accept` | DRIVER |
| POST | `/api/v1/matching/offers/{id}/reject` | DRIVER |

## Config

```
MATCHING_MAX_RADIUS_METERS=8000
MATCHING_LOCATION_STALE_SECONDS=180
MATCHING_OFFER_TIMEOUT_SECONDS=25
MATCHING_SEARCH_TIMEOUT_SECONDS=180
MATCHING_AUTO_ACCEPT=true
```

## Mobile

- `apps/passenger-mobile` — login, quote/book, SOS, rate
- `apps/driver-mobile` — login, apply driver, online, offers, trip lifecycle

Android emulator API host: `10.0.2.2:8080` (see `src/config/env.ts`).

## Smoke

```powershell
.\scripts\smoke-phase6.ps1
```
