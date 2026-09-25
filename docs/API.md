# API Design

**Style:** REST + JSON  
**Contract:** OpenAPI 3 (SpringDoc)  
**Realtime:** WebSocket (see `REALTIME.md`) — not REST for high-frequency location

---

## 1. Principles

1. Version prefix: `/api/v1/...`
2. DTOs only — never JPA entities
3. Auth via `Authorization: Bearer <access_token>`
4. Idempotency on booking create & payment initiate: header `Idempotency-Key`
5. Errors: stable `code`, human `message`, optional `details[]` (no stack traces)
6. Pagination: `page`, `size`, `sort` → `{ items, page, size, totalElements, totalPages }`
7. Server validates all money, status, and authorization claims
8. Public IDs are UUIDs

---

## 2. Error envelope

```json
{
  "timestamp": "2026-09-25T08:00:00Z",
  "status": 409,
  "code": "RIDE_INVALID_TRANSITION",
  "message": "Cannot start ride from DRIVER_ARRIVING without arrival confirmation.",
  "path": "/api/v1/rides/{id}/start",
  "correlationId": "…"
}
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `RIDE_INVALID_TRANSITION`, `QUOTE_EXPIRED`, `PAYMENT_FAILED`.

---

## 3. API groups

### 3.1 Auth — `/api/v1/auth`

| Method | Path | Actor | Purpose |
|--------|------|-------|---------|
| POST | `/otp/request` | Public | Request OTP (rate limited) |
| POST | `/otp/verify` | Public | Verify → tokens + user |
| POST | `/admin/login` | Public | Admin login |
| POST | `/token/refresh` | Public | Refresh access token |
| POST | `/logout` | Auth | Revoke refresh |
| GET | `/me` | Auth | Current user + roles |

### 3.2 Users / profiles — `/api/v1/users`

| Method | Path | Purpose |
|--------|------|---------|
| GET/PATCH | `/me/profile` | Passenger/driver profile |
| PUT | `/me/emergency-contacts` | Safety contacts |
| POST | `/me/avatar` | Initiate upload |

### 3.3 Drivers — `/api/v1/drivers`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/me/application` | Start/continue driver onboarding |
| GET | `/me` | Driver profile + verification |
| POST | `/me/online` | Go online (eligibility checks) |
| POST | `/me/offline` | Go offline |
| GET | `/me/earnings` | Earnings summary |
| GET | `/admin/drivers` | Admin list |
| POST | `/admin/drivers/{id}/approve` | Verification |
| POST | `/admin/drivers/{id}/reject` | Rejection + reason |

### 3.4 Vehicles — `/api/v1/vehicles`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/me` | Register vehicle |
| GET | `/me` | List my vehicles |
| POST | `/me/{id}/documents` | Document upload session |
| PATCH | `/admin/...` | Approve/reject docs |

### 3.5 Locations — `/api/v1/locations`

| Method | Path | Purpose |
|--------|------|---------|
| PUT | `/drivers/me` | Low-frequency fallback location (prefer WS) |
| GET | `/rides/{id}` | Authorized parties: last known / trail summary |

High-frequency driver points: WebSocket.

### 3.6 Pricing — `/api/v1/pricing`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/quotes` | Create fare quote (server-side) |
| GET | `/quotes/{id}` | Fetch quote if unexpired |
| GET | `/admin/rules` | List fare rules |
| POST | `/admin/rules` | Create fare rule |
| PUT | `/admin/rules/{id}` | Update fare rule |

Quote request body: pickup, dropoff, vehicle type. Response: breakdown + `expiresAt`. **Apps must not compute fares.**

### 3.7 Rides — `/api/v1/rides`

| Method | Path | Actor | Purpose |
|--------|------|-------|---------|
| POST | `/` | Passenger | Confirm booking from quote |
| GET | `/{id}` | Party/Admin | Ride detail |
| GET | `/` | Self | History (role-scoped) |
| POST | `/{id}/cancel` | Passenger/Driver | Cancel with reason |
| POST | `/{id}/accept` | Driver | Accept offer |
| POST | `/{id}/reject` | Driver | Reject offer |
| POST | `/{id}/arrived` | Driver | Arrived at pickup |
| POST | `/{id}/start` | Driver | Start (PIN if required) |
| POST | `/{id}/complete` | Driver | Complete |
| GET | `/admin/live` | Admin | Live rides board |

No `PATCH /rides/{id}` with free-form status.

### 3.8 Matching — internal + limited admin

Matching runs as domain service after booking. Optional admin:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/matching/metrics` | Observability |
| POST | `/admin/matching/requeue/{rideId}` | Ops recovery |

### 3.9 Payments — `/api/v1/payments`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/rides/{rideId}/initiate` | Start digital payment |
| GET | `/rides/{rideId}` | Payment status (server truth) |
| POST | `/webhooks/{provider}` | Provider webhooks (signed) |
| POST | `/admin/.../refund` | Refund |

Clients never mark payment succeeded unilaterally.

### 3.10 Wallets — `/api/v1/wallets`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/me` | Balance |
| GET | `/me/ledger` | History |

### 3.11 Ratings — `/api/v1/ratings`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/rides/{rideId}` | Submit score + optional review |
| GET | `/admin` | Moderation list |

### 3.12 Notifications — `/api/v1/notifications`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/me/devices` | Register push token |
| POST | `/me/test-push` | Send mock push to own devices |

### 3.13 Safety — `/api/v1/safety`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/rides/{id}/sos` | Trigger SOS |
| POST | `/rides/{id}/share` | Create share link |
| DELETE | `/rides/{id}/share` | Revoke |
| POST | `/incidents` | Report incident |
| GET | `/admin/incidents` | Ops queue |

### 3.14 Support — `/api/v1/support`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/tickets` | Open ticket |
| GET | `/tickets/me` | My tickets |
| GET | `/admin/tickets` | Admin list |
| POST | `/admin/tickets/{id}/status` | Update status |

### 3.15 Admin analytics — `/api/v1/admin`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard` | Live KPI cards |
| GET | `/audit-logs` | Recent audit entries |

### 3.16 Common

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/health/ready` | Readiness (DB/Redis) |
| GET | `/v3/api-docs` | OpenAPI |
| GET | `/swagger-ui` | Dev/staging only |

---

## 4. Authorization matrix (summary)

| Resource | Passenger | Driver | Support | Admin | Super |
|----------|-----------|--------|---------|-------|-------|
| Own profile | RW | RW | R | R | R |
| Own rides | RW* | RW* | R | RW | RW |
| Fare rules | — | — | — | RW | RW |
| Verify drivers | — | — | — | RW | RW |
| Refunds | — | — | limited | RW | RW |
| Audit logs | — | — | — | R | R |
| Settings | — | — | — | R | RW |

\* Only allowed transitions for own active ride.

IDOR: every handler loads resource and asserts membership/role.

---

## 5. Webhooks

Payment (and optionally SMS delivery) webhooks:

- Raw body signature verification
- Idempotent processing by provider event id
- Respond 2xx quickly; async work via queue if needed later

---

## 6. OpenAPI & shared types

- Backend publishes OpenAPI
- `packages/api-types` generated or hand-synced TypeScript types for apps
- Breaking changes require `/api/v2` or coordinated release

---

## 7. Rate limiting (API-level)

| Endpoint class | Guidance |
|----------------|----------|
| OTP request | Strict per phone + IP |
| Login | Strict |
| Location REST fallback | Moderate |
| Booking | Per user moderate |
| Admin reads | Higher but audited |

Exact numbers tuned in staging; enforced via gateway + Redis.

---

## 8. Phase 0 note

This document defines **groups and contracts**. Controllers and OpenAPI artifacts are implemented in later phases.
