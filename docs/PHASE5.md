# Phase 5 — Ratings & safety (SOS)

## Scope

- Flyway `V7`: `ratings`, `emergency_contacts`, `safety_incidents`, `sos_events`, `trip_shares`
- Post-ride ratings (1–5) with unique (ride, rater); roll up driver `rating_avg` / `rating_count`
- Emergency contacts CRUD (max 5)
- SOS on active ride → incident + location snapshot + SMS to contacts (mock) + admin WS `SAFETY_ALERT`
- Post-ride incident reports
- Trip share token link (create / revoke / public read)
- Admin Safety incidents page

## Key APIs

| Method | Path | Role |
|--------|------|------|
| POST | `/api/v1/ratings/rides/{rideId}` | PASSENGER / DRIVER |
| GET | `/api/v1/ratings/admin` | ADMIN |
| GET/PUT | `/api/v1/safety/emergency-contacts` | Auth |
| POST | `/api/v1/safety/rides/{id}/sos` | Auth (ride party) |
| POST | `/api/v1/safety/incidents` | Auth |
| GET | `/api/v1/safety/admin/incidents` | ADMIN |
| POST/DELETE | `/api/v1/safety/rides/{id}/share` | PASSENGER |
| GET | `/api/v1/safety/share/{token}` | Public |

## Not in Phase 5

- Advanced PostGIS matching / offers
- Push/email ops webhooks beyond SMS mock
- Full support ticketing
- Mobile SOS UI wiring

## Smoke

```powershell
.\scripts\smoke-phase5.ps1
```
