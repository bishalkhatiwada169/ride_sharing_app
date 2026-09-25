# Real-Time Architecture

**Transport:** WebSocket (Spring)  
**Fan-out:** Redis Pub/Sub (or Streams) for multi-instance  
**Related:** `ARCHITECTURE.md`, `SECURITY.md`, `MATCHING.md`

---

## 1. Goals

Deliver low-latency updates for:
- Driver location (to assigned passenger + admin live view)
- Ride status transitions
- Driver assignment / offer to driver
- Driver arriving / arrived
- Ride start / completion
- Passenger-facing trip updates

REST remains for commands and history. WebSocket is for **events and streams**.

---

## 2. Topology

```
Driver App ──WS──► API instance A ──publish──► Redis ──subscribe──► API instance B ──WS──► Passenger App
                         │                                              │
                         └────────────── local sessions ────────────────┘
```

- Each API node holds local WS sessions
- Domain events published to Redis channels
- Nodes forward to subscribers on that node
- Enables horizontal scaling without sticky dependency (sticky optional for efficiency)

---

## 3. Channels / topics (logical)

| Channel pattern | Subscribers | Payload |
|-----------------|-------------|---------|
| `user.{userId}` | That user | Notifications, offers |
| `ride.{rideId}` | Passenger, assigned driver, authorized admin | Status, ETA, thin location |
| `driver.{driverId}.offers` | That driver | Ride offer cards |
| `admin.live` | Admin roles | Aggregated live events (rate-limited) |

Exact naming may map to STOMP destinations (`/topic/...`, `/user/queue/...`) or custom JSON protocol.

---

## 4. Message envelope

```json
{
  "type": "RIDE_STATUS_CHANGED",
  "occurredAt": "2026-09-25T08:00:00Z",
  "rideId": "…",
  "payload": {
    "from": "DRIVER_ARRIVING",
    "to": "DRIVER_ARRIVED"
  },
  "correlationId": "…"
}
```

Event types (non-exhaustive):
- `DRIVER_LOCATION`
- `RIDE_STATUS_CHANGED`
- `DRIVER_OFFER`
- `OFFER_EXPIRED`
- `PAYMENT_STATUS`
- `SAFETY_ALERT` (admin)

---

## 5. Authentication & authorization

1. Client connects with valid access token
2. Server binds session → `userId` + roles
3. Subscribe requests authorized:
   - `ride.{id}` only if passenger, assigned driver, or admin/support with permission
   - Reject subscription upgrades without re-check
4. On token expiry: send `AUTH_EXPIRED`; client refreshes and reconnects
5. Driver location publish only if authenticated as that driver and online

---

## 6. Driver location stream

| Concern | Design |
|---------|--------|
| Frequency | Adaptive: ~2–5s on trip; slower when idle online |
| Payload | lat, lng, heading, speed, recordedAt, rideId (if any) |
| Server | Validate bounds; throttle per driver; update `driver_profiles.current_location` at lower rate than WS fan-out |
| Persistence | Sample into `ride_locations` every N seconds / M meters during active ride |
| Battery | Client batching; pause updates when offline; OS background limits documented |
| Network | Binary/compact JSON; drop intermediate points if backlog |

---

## 7. Reconnection

Client algorithm:
1. On disconnect → exponential backoff with jitter (e.g. 1s → 30s cap)
2. Refresh token if needed
3. Reconnect WS
4. Re-subscribe to active `rideId` / user channel
5. **Catch-up:** `GET /api/v1/rides/{id}` for authoritative status (WS is not sole truth)

Server:
- Detect dead sessions via heartbeat / protocol ping
- Remove subscriptions; do not assume client received last event

---

## 8. Stale connection handling

- Heartbeat interval (e.g. 15–30s); miss threshold closes session
- Driver `location_updated_at` stale → matching excludes driver; passenger UI shows “reconnecting”
- Admin live view marks drivers stale

---

## 9. Rate limiting

- Per-session message rate (especially location publishes)
- Per-user subscribe attempts
- Admin live channel coalesced (not one WS message per GPS tick globally)

Violations: warning frame then disconnect.

---

## 10. Fallback when WebSocket unavailable

| Feature | Fallback |
|---------|----------|
| Status changes | Push notification + REST poll (backoff) |
| Driver location on live trip | REST poll last location every few seconds |
| Offers to driver | Push high-priority + poll offers endpoint |
| Admin live | Polling dashboard |

UX must remain correct (eventually consistent) without WS.

---

## 11. Ride event publishing

State machine service, after successful DB commit:
1. Append `ride_events`
2. Publish domain event → Redis
3. Push notification for critical transitions (assigned, arrived, cancelled)

Ordering: consumers treat status from REST as authoritative if conflict.

---

## 12. Security notes

- No PII beyond need-to-know on admin.live
- Trip PIN never broadcast on public channels
- Share-trip links use separate tokenized HTTP endpoints, not open WS

---

## 13. Operational concerns

- Metrics: connections, auth failures, publish lag, drop counts
- Graceful shutdown: stop new connects; drain; close
- Load tests before claiming concurrent socket capacity

---

## 14. Phase 0 boundary

This specifies architecture only. No WS endpoints implemented yet.
