# Testing Strategy

---

## 1. Test pyramid

| Layer | Scope | Tools (planned) |
|-------|-------|-----------------|
| Unit | Domain services, fare math, state machine | JUnit 5, AssertJ |
| Integration | API + DB + Redis | Spring Boot Test, Testcontainers |
| API contract | OpenAPI conformance | RestAssured / Spring MockMvc |
| Frontend | Components, hooks | Vitest, Testing Library |
| Mobile | Components, critical flows | Jest, Detox/Maestro (later) |
| Security | AuthZ, IDOR, rate limits | Dedicated test suite |
| Load | Matching, WS, quotes | k6 / Gatling (staging) |

---

## 2. Critical backend tests (must-have before commercial launch)

| Area | Cases |
|------|-------|
| **Authentication** | OTP success/fail, refresh rotation, logout revoke |
| **Authorization** | Role matrix; passenger cannot accept ride; driver cannot price-admin |
| **IDOR** | User A cannot read/modify User B ride/payment |
| **Fare calculation** | Base/distance/time/min/surge/tax/coupon/rounding |
| **Ride transitions** | Each allowed edge; reject illegal edges; concurrency on accept |
| **Matching** | Filters, radius, timeout → NO_DRIVER_FOUND, lock safety |
| **Payment verification** | Webhook success/fail; reject client spoof; idempotent replay |
| **Cancellation** | Passenger/driver rules by state; fee hooks later |
| **Rating** | Only completed rides; one rating per rater; score bounds |

---

## 3. Frontend tests

- Form validation (Zod)
- Query error/empty/loading states
- Route guards by role (admin)
- No reliance on snapshot-only tests for critical auth flows

---

## 4. Mobile tests

- Navigation happy paths (mocked API)
- Offline/WS reconnect UI states
- Driver mode: critical buttons present; reduced animation flags

---

## 5. Security tests

- Automated IDOR suite per resource group
- OTP rate limit behavior
- Upload content-type rejection
- Webhook bad signature → 401/403

---

## 6. Load tests

Run in staging with production-like data volumes:
- Quote + book RPS
- Matching under concurrent requests
- WS concurrent connections + location message rate
- Payment webhook bursts

**Publish capacity numbers only from these results.**

---

## 7. Test data

- Flyway + seed profiles for local
- Factories/fixtures for users, rides in states
- Never use real PII in fixtures

---

## 8. CI gates

PR cannot merge if:
- Unit/integration fail
- Lint/typecheck fail
- Critical security tests fail

Load tests: scheduled or pre-release, not every PR.

---

## 9. Phase 0 boundary

Strategy only; test suites implemented with code in later phases.
