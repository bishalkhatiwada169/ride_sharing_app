# Product Requirements Document (PRD)

**Product:** Ride Platform (commercial ride-hailing)  
**Phase:** 0 — Architecture & requirements baseline  
**Audience:** Engineering, product, QA, client handover  
**Status:** Approved for architecture; implementation deferred to later phases

---

## 1. Vision

Build a transferable, production-grade ride-hailing platform that a client can operate commercially. The product includes passenger and driver mobile apps, an admin web dashboard, and a modular Spring Boot backend with PostgreSQL/PostGIS, Redis, real-time WebSockets, payments, safety, and analytics.

This is **not** a tutorial, demo, or prototype. Architecture, security, and handover readiness come first.

---

## 2. Goals

| Goal | Description |
|------|-------------|
| Commercial readiness | Secure, auditable, configurable, operable by a client team |
| Multi-app coherence | Shared domain model, API contracts, and design language |
| Replaceable integrations | Maps, payments, push, SMS via interfaces + env config |
| Safety-first | SOS, trip PIN, sharing, identity verification without cluttering ride UX |
| Transferability | No personal accounts hard-coded; secrets via env; documented ops |

### Non-goals (Phase 0)

- Implementing booking, matching, payments, maps, or full UI
- Claiming capacity (users/RPS) without load testing
- Copying proprietary UX/branding from other ride-hailing companies

---

## 3. Personas & Roles

| Role | Primary surfaces | Capabilities |
|------|------------------|--------------|
| **PASSENGER** | Passenger mobile | Book rides, pay, rate, history, safety |
| **DRIVER** | Driver mobile | Go online, accept rides, navigate, earn, rate |
| **ADMIN** | Admin web | Ops: users, rides, pricing, payments, incidents |
| **SUPPORT** | Admin web (scoped) | Tickets, complaints, limited ride/passenger views |
| **SUPER_ADMIN** | Admin web | All admin + settings, roles, secrets config refs, audit |

Server is the source of truth for roles. Clients never assert elevated privileges.

---

## 4. Platforms

1. **Passenger mobile** — React Native + TypeScript (Android Gradle; iOS later as needed)
2. **Driver mobile** — React Native + TypeScript (Android Gradle; iOS later as needed)
3. **Admin web** — React + Vite + TypeScript + Tailwind + shadcn/ui
4. **Backend** — Java Spring Boot (Gradle), PostgreSQL + PostGIS, Redis, WebSocket
5. **Infrastructure** — Docker Compose (dev/staging), CI/CD-ready layout

---

## 5. User Journeys

### 5.1 Passenger

```
Splash
  → Onboarding (first launch)
  → Login (phone)
  → OTP verification
  → Profile completion (if incomplete)
  → Home (map + “Where to?”)
  → Pickup selection (default: current location; editable)
  → Destination selection
  → Vehicle type + Fare estimate
  → Ride confirmation
  → Searching for driver
  → Driver assigned (photo, vehicle, ETA, PIN)
  → Driver arriving
  → Driver arrived
  → Ride started
  → Live trip
  → Ride completed
  → Payment
  → Rating / review
  → Ride history (anytime)
```

**Supporting flows:** saved places, emergency contacts, trip sharing, SOS, coupons, support tickets, profile/payment methods (tokenized), cancel ride with reason.

### 5.2 Driver

```
Splash
  → Login / Registration
  → Profile
  → Vehicle registration
  → Document upload
  → Verification (pending → approved / rejected)
  → Driver dashboard
  → Online / Offline toggle
  → Ride request (offer)
  → Accept / Reject
  → Navigate to passenger
  → Arrived
  → Start ride (PIN / confirmation rules)
  → Active ride
  → Complete ride
  → Earnings
  → Rating passenger
  → Ride history
```

**Supporting flows:** document re-upload after rejection, go offline mid-offer, navigation deep-link, payout/earnings summary, support.

### 5.3 Admin

```
Login
  → Dashboard (KPIs, live ride count, alerts)
  → Drivers / Driver verification
  → Passengers
  → Vehicles
  → Rides / Live rides
  → Pricing (fare rules, surge)
  → Payments / Transactions
  → Ratings
  → Complaints / Support tickets
  → Safety incidents
  → Notifications (broadcast / targeted)
  → Reports / Analytics
  → Settings
  → Audit logs
```

---

## 6. Functional Requirements (by domain)

### Auth & users
- Phone OTP login (passenger/driver); admin email/password or SSO-ready
- JWT access + refresh tokens; logout / revoke
- Profile CRUD with role-scoped fields

### Drivers & vehicles
- Application, document upload, verification workflow
- Vehicle type, plate, capacity, documents
- Online/offline + availability tied to verification & active ride state

### Rides
- Strict server-side state machine (see `ARCHITECTURE.md` / ride section)
- Fare quote before confirm; immutable quote snapshot on booking
- Cancel rules, no-driver-found, expiry

### Matching
- PostGIS nearby search; ranking pluggable (see `MATCHING.md`)

### Pricing
- Configurable fare engine; server-only calculation (see `PRICING.md`)

### Payments & wallets
- Provider-agnostic gateway; cash + digital; webhooks; refunds (see `PAYMENTS.md`)

### Ratings & reviews
- Mutual rating after completed rides; moderation hooks for admin

### Notifications
- Push + in-app; transactional templates; admin broadcasts

### Locations
- Driver location streams; ride path samples; privacy retention policy

### Safety
- SOS, emergency contacts, trip share, trip PIN, incidents (see `SAFETY.md`)

### Support
- Tickets, complaints, escalation to safety/ops

### Admin & analytics
- Dashboards, reports exports, audit trail of privileged actions

### Common
- Pagination, idempotency keys, error catalog, feature flags (future)

---

## 7. Non-functional Requirements

| Area | Requirement |
|------|-------------|
| Security | JWT, RBAC, rate limits, IDOR protection, no secrets in clients |
| Privacy | Minimize PII in logs; location retention policy; consent for sharing |
| Reliability | Stateless API; Redis for sessions/offers; graceful WS degradation |
| Performance | Indexed queries; paginated lists; batched/throttled location updates |
| Accessibility | WCAG-minded admin; large tap targets for mobile; reduced motion option for drivers |
| Observability | Structured logs, correlation IDs, metrics hooks, audit logs |
| Handover | Env-based config; `.env.example`; ops runbooks in `DEPLOYMENT.md` |

---

## 8. Success Metrics (to instrument later)

- Ride completion rate
- Median time-to-assign
- Cancel rates (passenger/driver/system)
- Payment success rate
- Driver online hours / acceptance rate
- SOS response time
- Support ticket resolution time
- App crash-free sessions

Baselines set after staging instrumentation—not in Phase 0.

---

## 9. Assumptions & Dependencies

- Client provides legal entity, payment merchant account, map provider account, SMS/OTP provider, push (e.g. Firebase)
- Initial launch geography defined by client (single city → multi-city later)
- Android first for mobile; iOS when client requests
- Cash rides remain first-class where digital penetration is low

---

## 10. Out of Scope (initial commercial MVP vs later)

| Later / optional | Notes |
|------------------|-------|
| Multi-stop trips | Architecture allows extension |
| Scheduled rides | Separate scheduling domain |
| Intercity / rental | Separate product lines |
| In-app chat | Prefer masked calling first |
| Full ML dispatch | Matching interface supports evolution |

---

## 11. Acceptance Criteria for Phase 0

- [x] Repository structure planned under `ride-platform/` layout
- [x] PRD and architecture docs complete
- [x] Database, API, security, realtime, matching, pricing, payments, safety documented
- [x] Deployment, development, testing plans documented
- [x] Root README + env examples for handover
- [ ] Phase 1 implementation — **blocked until explicit instruction**

---

## 12. Document map

| Doc | Purpose |
|-----|---------|
| `ARCHITECTURE.md` | System design, domains, frontend structure |
| `DATABASE.md` | Schema, relationships, indexes |
| `API.md` | API groups & contracts philosophy |
| `SECURITY.md` | AuthZ/AuthN, threats, controls |
| `REALTIME.md` | WebSocket design |
| `MATCHING.md` | Dispatch engine design |
| `PRICING.md` | Fare engine |
| `PAYMENTS.md` | Payment gateway abstraction |
| `SAFETY.md` | Safety features |
| `DEPLOYMENT.md` | Environments, Docker, CI/CD |
| `DEVELOPMENT.md` | Local setup, conventions |
| `TESTING.md` | Test strategy |
