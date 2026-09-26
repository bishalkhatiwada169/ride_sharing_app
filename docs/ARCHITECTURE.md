# System Architecture

**Phase:** 0 — Architecture  
**Related:** `PRD.md`, `DATABASE.md`, `API.md`, `SECURITY.md`, `REALTIME.md`

---

## 1. Architecture principles

1. **Server is source of truth** — fare, ride status, payment status, roles, matching outcomes never trusted from clients.
2. **Thin controllers** — HTTP/WebSocket adapters only; business logic in domain services.
3. **DTOs at boundaries** — JPA entities never exposed in API responses.
4. **Modular domains** — clear package boundaries; matching/pricing/payments replaceable behind interfaces.
5. **Stateless API nodes** — session/state in PostgreSQL + Redis; enables horizontal scale.
6. **Config over code** — prices, surge, feature toggles, provider keys via configuration/env.
7. **Handover-ready** — no personal accounts; documented external services; `.env.example`.
8. **Safety without clutter** — always reachable, never dominating the happy path.

---

## 2. High-level system context

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Passenger App   │  │  Driver App     │  │  Admin Web      │
│ React Native    │  │  React Native   │  │  React + Vite   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │ HTTPS/WSS          │ HTTPS/WSS          │ HTTPS
         └────────────┬───────┴────────────────────┘
                      ▼
              ┌───────────────┐
              │  API Gateway  │  (nginx / load balancer)
              │  TLS terminate│
              └───────┬───────┘
                      ▼
         ┌────────────────────────┐
         │  Spring Boot Services  │  (stateless, N replicas)
         │  REST + WebSocket      │
         └─┬──────────┬─────────┬─┘
           ▼          ▼         ▼
     PostgreSQL    Redis    Object storage
     + PostGIS   (cache,    (docs, photos)
                 pub/sub,
                 locks)
           │
           ▼
    External providers
    (Maps, SMS/OTP, Push, Payments)
```

---

## 3. Monorepo layout

```
ride-platform/
├── apps/
│   ├── passenger-mobile/     # React Native + TS
│   ├── driver-mobile/        # React Native + TS
│   └── admin-web/            # React + Vite + Tailwind + shadcn
├── backend/                  # Spring Boot (Gradle) multi-module or package-by-domain
├── packages/
│   ├── api-types/            # Shared OpenAPI-derived / TS types
│   ├── validation/           # Shared Zod (and mirrored Bean Validation rules)
│   └── shared-config/        # ESLint/TS/prettier/brand tokens (non-secret)
├── infrastructure/
│   ├── docker/               # Dockerfiles, compose overlays
│   └── nginx/                # Reverse proxy templates
└── docs/                     # This documentation set
```

**Decision:** Single monorepo for commercial handover cohesion. Backend may later split into deployable services without changing API contracts.

---

## 4. Backend domain modules

Package layout (illustrative):

```
com.rideplatform
├── auth
├── users
├── drivers
├── vehicles
├── rides
├── matching
├── pricing
├── payments
├── wallets
├── ratings
├── notifications
├── locations
├── safety
├── support
├── admin
└── common          # errors, pagination, auditing, security helpers
```

### Layering (per domain)

| Layer | Responsibility |
|-------|----------------|
| `api` / controller | Auth annotations, validation, mapping DTO ↔ command |
| `application` / service | Use cases, transactions, orchestration |
| `domain` | Entities, state machines, domain rules, ports (interfaces) |
| `infrastructure` | JPA repos, Redis, provider adapters, WebSocket gateways |

**Controllers stay thin.** Matching, pricing, and payments are invoked via ports so algorithms/providers can evolve.

---

## 5. Frontend architecture

### Admin web (`apps/admin-web`)

```
src/
├── app/                 # router, providers, layouts
├── pages/               # route-level screens
├── features/            # feature modules (drivers, rides, pricing…)
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── api/
│       └── types/
├── components/ui/       # design system (shadcn-based + custom)
├── hooks/
├── services/            # API client wrappers
├── stores/              # Zustand (UI/session only)
├── lib/                 # query client, axios/fetch, utils
└── types/
```

- **TanStack Query** — server state (lists, details, mutations)
- **Zustand** — client-only: sidebar, theme preference, ephemeral UI flags
- **React Hook Form + Zod** — forms
- **React Router** — auth-gated routes by role
- **Deploy** — Vite `dist/` is embedded in the Spring Boot jar (`classpath:/static/`) for same-origin serving; Vite `:5173` remains for local HMR

### Mobile apps (`passenger-mobile`, `driver-mobile`)

```
src/
├── app/                 # navigation roots
├── screens/
├── features/
├── components/          # design system primitives
├── hooks/
├── services/            # API + WebSocket clients
├── stores/              # Zustand (connection, map UI)
├── theme/
└── utils/
```

Shared patterns with admin; separate apps because UX, permissions, and offline needs differ.

---

## 6. Design system (product UI)

**Goals:** premium, original, easy, accessible, mobile-first, minimal clutter.

**Principles:**
- Clear hierarchy; one primary action per screen
- Map is the visual anchor on booking/live trip; chrome stays light
- Status via color + text + icon (not color alone)
- Driver mode: large controls, reduced animation while `RIDE_STARTED`
- No cloning of third-party ride-hailing brands or assets

**Reusable components (planned):** buttons, inputs, cards (interaction containers only), bottom sheets, dialogs, map controls, navigation chrome, status indicators, loading/skeleton/error/empty states, toasts.

**Tokens:** color, typography, spacing, elevation, motion — in `packages/shared-config` / theme packages; CSS variables for admin.

---

## 7. Ride lifecycle (conceptual)

Passenger confirms quote → ride `REQUESTED` → matching → assignment → driver lifecycle → trip → completion → payment → ratings.

Full state machine: see section 8 and `DATABASE.md`. Clients request transitions via intentional APIs (`accept`, `arrive`, `start`, `complete`, `cancel`); server validates actor + allowed transition.

---

## 8. Ride state machine

### States

| State | Meaning |
|-------|---------|
| `REQUESTED` | Ride created; quote locked |
| `SEARCHING_DRIVER` | Matching in progress |
| `DRIVER_ASSIGNED` | Reserved / optional hold state (see note below) |
| `DRIVER_ACCEPTED` | Driver accepted offer; assignment committed |
| `DRIVER_ARRIVING` | En route to pickup |
| `DRIVER_ARRIVED` | At pickup |
| `RIDE_STARTED` | Trip in progress |
| `RIDE_COMPLETED` | Trip finished; awaiting/settling payment |
| `CANCELLED_BY_PASSENGER` | Passenger cancel |
| `CANCELLED_BY_DRIVER` | Driver cancel |
| `NO_DRIVER_FOUND` | Matching exhausted |
| `EXPIRED` | Offer/search timeout |
| `PAYMENT_FAILED` | Digital payment failed (policy-defined terminal or recoverable) |

### Allowed transitions (happy path) — **canonical v1**

```
REQUESTED → SEARCHING_DRIVER
SEARCHING_DRIVER → DRIVER_ACCEPTED | NO_DRIVER_FOUND | EXPIRED | CANCELLED_BY_PASSENGER
DRIVER_ACCEPTED → DRIVER_ARRIVING | CANCELLED_BY_PASSENGER | CANCELLED_BY_DRIVER
DRIVER_ARRIVING → DRIVER_ARRIVED | CANCELLED_BY_PASSENGER | CANCELLED_BY_DRIVER
DRIVER_ARRIVED → RIDE_STARTED | CANCELLED_BY_PASSENGER | CANCELLED_BY_DRIVER
RIDE_STARTED → RIDE_COMPLETED
RIDE_COMPLETED → (payment settlement; may set PAYMENT_FAILED on digital failure)
```

**Note on `DRIVER_ASSIGNED`:** Product requirement listed this state. For v1 we **skip** it to avoid dual “assigned vs accepted” ambiguity. Offers are ephemeral (Redis/DB offer rows), not ride status. If a future market needs a hard hold before accept, reintroduce `SEARCHING_DRIVER → DRIVER_ASSIGNED → DRIVER_ACCEPTED` via migration + transition table update—never via client free-form status.

Terminal states: `RIDE_COMPLETED` (settled), cancel/no-driver/expired variants, and policy-defined `PAYMENT_FAILED`.

**Invariant:** No client may `PATCH` arbitrary `status`. Transitions go through use-case endpoints that check role, ride ownership, and transition table.

Every transition appends a `ride_events` row (who, when, from, to, metadata).

---

## 9. Cross-cutting technical decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API style | REST + OpenAPI | Clear contracts; Swagger for admin/dev |
| Realtime | STOMP-over-WebSocket or raw WS + Redis pub/sub | Scale via pub/sub; see `REALTIME.md` |
| Auth | JWT access + refresh (Redis denylist optional) | Stateless API |
| Migrations | Flyway | Versioned schema for handover |
| Geo | PostGIS | Nearby drivers without premature infra |
| Cache / locks | Redis | Matching offers, rate limits, presence |
| Validation | Bean Validation + Zod mirror | Server enforces; client UX |
| Files | Pre-signed upload to object storage | Secure docs/photos |
| Idempotency | `Idempotency-Key` on payments & booking | Safe retries on mobile |

---

## 10. Scalability sketch (no capacity claims)

- Horizontal API replicas behind LB
- Sticky or Redis-backed WebSocket fan-out (see `REALTIME.md`)
- DB: indexes, read replicas later, connection pooling
- Location updates: throttle + batch; store path samples sparsely
- CDN for static admin assets and images

Load numbers only after `TESTING.md` load tests.

---

## 11. External service ports

```
SmsGateway | PushGateway | MapGateway | PaymentGateway | StorageGateway
```

Each has a no-op/mock adapter for local dev and a production adapter selected by config.

---

## 12. Phase boundaries

| Phase | Scope |
|-------|-------|
| **0 (this)** | Docs, structure, env examples |
| **1** | Repo bootstrap, backend skeleton, auth, CI skeleton, Docker Compose base |
| **2+** | Domains incrementally per product priority |

Do not implement product features until instructed.
