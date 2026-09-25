# Security Architecture

**Audience:** Engineering, security reviewers, client handover  
**Related:** `API.md`, `PAYMENTS.md`, `DEPLOYMENT.md`

---

## 1. Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Stolen access token | Short TTL; refresh rotation; optional Redis denylist |
| Privilege escalation via client | Roles only from server JWT claims / DB |
| IDOR on rides/payments | Ownership + role checks on every resource |
| Fare / status tampering | Server state machine + server pricing |
| Payment fraud | Provider webhooks; never trust client “paid” |
| OTP brute force | Rate limit + lockouts + attempt counters |
| Injection | Parameterized JPA/SQL; Bean Validation |
| XSS (admin) | React escaping; CSP headers |
| CSRF | Stateless JWT (Bearer); careful cookie policy if used |
| Secret leakage | Env/secret manager; never in git or mobile binaries |
| Malicious file upload | Type/size validation; virus scan later; private bucket |
| Insider abuse | RBAC + audit logs |

---

## 2. Authentication

### Passengers & drivers
- Phone in E.164 → OTP via `SmsGateway`
- On verify: issue **access JWT** (short-lived) + **refresh token** (longer, opaque or JWT, rotated, stored hashed in DB/Redis)
- Optional device binding metadata

### Admin / Support / Super Admin
- Email + password (Argon2id or BCrypt with strong cost)
- MFA strongly recommended before production handover
- Separate login endpoint; same token machinery with role claims

### JWT contents (minimal)
- `sub` (user id)
- `roles[]`
- `sid` / token family id
- `iat`, `exp`
- **No** fare, payment status, or ride status in JWT

### Refresh
- Rotate on use; reuse detection revokes family
- Logout blacklists access `jti` until expiry (optional) and deletes refresh

---

## 3. Authorization (RBAC)

Roles: `PASSENGER`, `DRIVER`, `ADMIN`, `SUPPORT`, `SUPER_ADMIN`

| Pattern | Implementation |
|---------|----------------|
| Method security | `@PreAuthorize` / security expressions |
| Resource checks | Domain services: `assertPassengerOwnsRide`, etc. |
| Admin scopes | SUPPORT limited to tickets + read; ADMIN ops; SUPER_ADMIN settings |

**Never trust** client-supplied role, fare, payment status, ride status, or “I am the driver” flags beyond the token identity.

---

## 4. Ride & payment integrity

- Transitions only via use-case endpoints
- Optimistic locking (`version`) on rides
- Quotes expire; booking rejects expired quotes
- Payment success only from provider verify/webhook
- Cash: mark collected via driver complete flow + admin dispute tools

---

## 5. Input validation & output safety

- Bean Validation on all request DTOs
- Max lengths, enums, coordinate bounds
- Central exception handler → stable error codes
- No internal exception messages to clients in production
- Correlation ID in logs and error body

---

## 6. Rate limiting & abuse

- Redis sliding window / token bucket per IP, user, phone
- Stricter on OTP, login, quote spam, SOS abuse monitoring
- Progressive delays / temporary blocks

---

## 7. CORS

- Explicit allowlist of admin web origins + mobile does not use browser CORS the same way
- No `*` with credentials
- Separate configs per environment

---

## 8. File upload security

- Driver documents & avatars via **pre-signed URL** to object storage
- Server issues upload grant with content-type allowlist, max size, short TTL
- Store only object keys; scan asynchronously when available
- Admin download via authorized short-lived URLs

---

## 9. Transport & headers

- TLS everywhere (terminated at LB/nginx)
- HSTS on admin
- Security headers: `X-Content-Type-Options`, `Frame-Options`/`CSP`, `Referrer-Policy`
- WebSocket auth: token on connect (query discouraged long-term; prefer first message or `Authorization` subprotocol)

---

## 10. Secrets management

| Secret | Storage |
|--------|---------|
| `JWT_SECRET` / signing keys | Secret manager / env |
| `DATABASE_URL` | Env |
| `REDIS_URL` | Env |
| `PAYMENT_*` | Env |
| `MAP_API_KEY` | Env (mobile may use restricted keys + backend proxies where needed) |
| `FIREBASE_*` | Env |
| `SMS_*` | Env |

Mobile apps: only non-privileged keys; sensitive map/payment operations prefer backend.

See root and per-app `.env.example`.

---

## 11. Password hashing

- Argon2id preferred (or BCrypt ≥ 12)
- OTP codes hashed at rest; short TTL; single-use

---

## 12. SQL injection & ORM

- Named parameters / JPA Criteria; no string-concat SQL
- Native PostGIS queries reviewed and parameterized
- Least-privilege DB roles (app vs migrate)

---

## 13. IDOR protection checklist

For every `/{id}` resource:
1. Authenticate
2. Load entity
3. Authorize (owner or elevated role)
4. Perform action
5. Audit if privileged

Automated tests required (see `TESTING.md`).

---

## 14. Audit logging

Privileged actions always audit:
- Driver approve/reject
- Fare rule changes
- Refunds
- User suspend
- Role changes
- Manual ride interventions
- Settings changes

Retain per client policy.

---

## 15. Secure error handling

| Environment | Detail level |
|-------------|--------------|
| Local/dev | Verbose optional |
| Staging | Codes + limited detail |
| Production | Codes + generic message; full detail in logs only |

---

## 16. Compliance posture (handover)

Document with client: data residency, retention, breach process, DPA with providers. Platform provides technical controls; legal compliance is client-owned.
