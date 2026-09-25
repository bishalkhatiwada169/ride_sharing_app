# Phase 3 — Real-time tracking

## Scope

- Spring WebSocket (STOMP) with JWT handshake
- Redis Pub/Sub fan-out for multi-instance
- Ride status events after DB commit
- Driver location fan-out to ride parties + admin live topic
- REST fallback for last known driver location
- Admin Live Rides page: STOMP live feed (poll remains as backup)

## Destinations

| Destination | Who | Events |
|-------------|-----|--------|
| `/topic/ride.{rideId}` | Passenger, assigned driver, admin | `RIDE_STATUS_CHANGED`, `DRIVER_LOCATION` |
| `/topic/admin.live` | ADMIN / SUPER_ADMIN / SUPPORT | Same events (coalesced board) |
| `/user/queue/events` | Authenticated user | Personal notifications |

Connect: `ws://localhost:8080/ws` (SockJS: `http://localhost:8080/ws`)  
Auth: `Authorization: Bearer <accessToken>` header on CONNECT, or `?access_token=` query.

## Not in Phase 3

- Payment gateway capture
- Advanced PostGIS ranking / offer timeouts
- Ratings / SOS
- Mobile app WS clients (API ready; RN wiring later)

## Smoke

With backend + Redis running:

```powershell
.\scripts\smoke-phase3.ps1
```
