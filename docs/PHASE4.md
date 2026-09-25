# Phase 4 — Payments

## Scope

- Flyway `V6`: `payments`, `payment_transactions`, `wallets`, `wallet_ledger`
- `PaymentGateway` port with **Cash** + **Mock** adapters (`PAYMENT_PROVIDER`)
- Digital initiate (Idempotency-Key), get status, signed mock webhook, admin refund/list
- On digital success: ride `payment_status=CAPTURED`, driver wallet credit (minus commission)
- Cash on complete: `CAPTURED` (unchanged) + optional wallet credit for driver earnings
- Realtime `PAYMENT_STATUS` on admin/ride topics
- Admin Payments page

## Key APIs

| Method | Path | Role |
|--------|------|------|
| POST | `/api/v1/payments/rides/{rideId}/initiate` | PASSENGER (+ Idempotency-Key) |
| GET | `/api/v1/payments/rides/{rideId}` | PASSENGER / DRIVER / ADMIN |
| POST | `/api/v1/payments/webhooks/{provider}` | Public (signed) |
| POST | `/api/v1/payments/admin/{paymentId}/refund` | ADMIN |
| GET | `/api/v1/payments/admin` | ADMIN |
| GET | `/api/v1/wallets/me` | DRIVER / PASSENGER |

## Not in Phase 4

- Real Stripe/eSewa SDKs (env-ready mock only)
- Coupons / tips UI
- Advanced matching / SOS / ratings

## Smoke

```powershell
.\scripts\smoke-phase4.ps1
```
