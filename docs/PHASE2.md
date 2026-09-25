# Phase 2 — Drivers, vehicles, pricing quotes, rides

## Scope delivered

- Flyway `V3`: vehicles, vehicle_documents, fare_rules (+ seed), fare_quotes, rides, ride_events
- Flyway `V4`/`V5`: CHAR→VARCHAR for `currency` and `trip_pin` (Hibernate validate)
- Driver onboarding: register, submit verification, admin approve/reject, online/offline, location (PostGIS)
- Vehicles: register, list, admin activate
- Server-side fare quotes (haversine distance + configurable rules; apps never compute fares)
- Ride booking with **strict state machine**
- Simple matching stub (first approved online available driver with active vehicle)
- Ride lifecycle APIs: book, arriving, arrived, start (PIN), complete, cancel, live admin list
- Unit tests: ride transitions, haversine

## Canonical ride states (v1)

`REQUESTED → SEARCHING_DRIVER → DRIVER_ACCEPTED → DRIVER_ARRIVING → DRIVER_ARRIVED → RIDE_STARTED → RIDE_COMPLETED`

## Key APIs

| Method | Path | Role |
|--------|------|------|
| POST | `/api/v1/drivers/me/application` | PASSENGER/DRIVER |
| POST | `/api/v1/drivers/me/submit` | DRIVER |
| POST | `/api/v1/drivers/me/online` | DRIVER |
| PUT | `/api/v1/drivers/me/location` | DRIVER |
| POST | `/api/v1/drivers/admin/{id}/approve` | ADMIN |
| POST | `/api/v1/vehicles/me` | DRIVER |
| POST | `/api/v1/vehicles/admin/{id}/activate` | ADMIN |
| POST | `/api/v1/pricing/quotes` | PASSENGER |
| POST | `/api/v1/rides` | PASSENGER |
| POST | `/api/v1/rides/{id}/start` | DRIVER (+ PIN) |
| GET | `/api/v1/rides/admin/live` | ADMIN |

## Not in Phase 2

- Real-time WebSocket tracking
- Advanced PostGIS ranking / offer timeouts
- Payment gateway capture
- Full admin UI modules (basic pages only)
- Ratings / safety SOS

## Restart backend

After pulling Phase 2 code, restart `.\scripts\start-backend.ps1` so Flyway applies V3–V5.
Then run `.\scripts\smoke-phase2.ps1` for the full passenger/driver ride path.
