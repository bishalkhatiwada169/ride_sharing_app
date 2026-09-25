# Phase 7 — Ops polish (pricing admin, push, audit, live dashboard)

Completed after MVP Phases 0–6.

## Deliverables

| Area | Status | Notes |
|------|--------|--------|
| Fare rule admin API | Done | `GET/POST/PUT /api/v1/pricing/admin/rules` |
| Admin Pricing page | Done | Toggle active rules |
| Mock push gateway | Done | Logs `[MockPush]`; swap for FCM/APNs later |
| Device register | Done | `POST /api/v1/notifications/me/devices` + mobile wiring |
| Offer push | Done | Matching notifies driver’s registered devices |
| Audit logs | Done | Table + `GET /api/v1/admin/audit-logs`; driver approve/reject audited |
| Support tickets | Done | Passenger create + admin list/status (`/api/v1/support/...`) |
| Live dashboard KPIs | Done | `GET /api/v1/admin/dashboard` — live rides, online drivers, open incidents |
| Migration | Done | `V9__audit_push_support.sql` |

## Admin UI

- Dashboard (live KPIs, 8s poll)
- Pricing
- Support
- Audit logs
- Existing: Drivers, Live rides, Payments, Safety

## Smoke

```powershell
.\scripts\smoke-phase7.ps1
```

## Out of scope (later)

- Real FCM/APNs credentials
- Stripe / eSewa production gateways
- Native map SDK polish
- ML dispatch
