# Payments Architecture

**Principle:** Provider-independent. Never trust client-reported payment success. Never store raw card data.

---

## 1. Goals

- Support **cash** and **digital** payments
- Swap providers without rewriting ride domain
- Idempotent initiation & webhook handling
- Refunds and full transaction history
- PCI scope minimization (use provider tokens / hosted flows)

---

## 2. PaymentGateway port

```java
public interface PaymentGateway {
  String providerId();

  PaymentInitiation initiate(PaymentInitiationRequest request);

  PaymentVerification verify(PaymentVerificationRequest request);

  RefundResult refund(RefundRequest request);

  boolean verifyWebhookSignature(WebhookRequest request);

  ProviderEvent parseWebhook(WebhookRequest request);
}
```

Adapters (examples): `CashPaymentGateway`, `StripePaymentGateway`, `EsewaPaymentGateway`, `MockPaymentGateway` (dev).

Selection via `PAYMENT_PROVIDER` / per-method config. Ride domain depends on the port only.

---

## 3. Flows

### 3.1 Cash

```
Ride completes → payment_method=CASH → payment_status=NOT_REQUIRED or CAPTURED_BY_DRIVER
Driver marks complete → system records cash expectation
Disputes → support/admin tools
```

No card data. Optional: passenger confirms amount shown matches quote.

### 3.2 Digital — initiate

```
Client: POST /payments/rides/{id}/initiate (Idempotency-Key)
Server: validate ride owner, amount from fare quote, status allows payment
     → PaymentGateway.initiate
     → persist payments + payment_transactions (INITIATED/PENDING)
     → return provider client params (redirect URL, client secret, etc.)
```

Amount **always** from server quote/settlement—not client body (client may send currency for sanity check only).

### 3.3 Digital — verify / webhook

```
Provider webhook → verify signature → idempotent apply event
     → SUCCEEDED / FAILED
     → update payment + ride.payment_status
     → notify via WS/push
```

Client may call verify endpoint; server still confirms with provider. **Client success screens are UX only.**

### 3.4 Failure

- `PAYMENT_FAILED` per product policy (block re-book vs allow retry)
- Allow retry initiate with new idempotency key
- Cash fallback only if business rules allow mid-flow switch (usually pre-chosen at booking)

### 3.5 Refunds

- Admin/Support authorized refund → gateway.refund → ledger entries
- Partial refunds supported in data model
- Audit log mandatory

---

## 4. Data model mapping

| Table | Role |
|-------|------|
| `payments` | Business payment for a ride |
| `payment_transactions` | Attempts, webhooks, refunds |
| `wallets` / ledger | Driver earnings, tips, credits |

Driver earnings: on successful completed ride, create wallet ledger credit (minus commission) in application service—not in the gateway adapter.

---

## 5. Idempotency & concurrency

- `Idempotency-Key` unique per user for initiate
- Unique `(provider, provider_payment_id)`
- Unique provider event ids for webhooks
- DB transactions around status transitions

---

## 6. Security

| Rule | Detail |
|------|--------|
| No PAN/CVV storage | Ever |
| Webhook auth | HMAC/signature per provider |
| HTTPS only | |
| Secrets | `PAYMENT_API_KEY`, webhook secrets in env |
| Amount integrity | Server-side only |
| Admin refunds | RBAC + audit |

---

## 7. Commission & settlement (logical)

```
trip_total
- discount (platform-funded vs merchant rules)
= collectable

platform_commission = f(vehicle_type, city, %)
driver_earnings = collectable - commission (+ tips)
```

Commission rules configurable; not hard-coded in apps.

---

## 8. Transaction history APIs

- Passenger: payments for own rides
- Driver: earnings ledger (not raw provider payloads)
- Admin: full transactions, filters, export

---

## 9. Testing

- Mock gateway success/fail/refund
- Webhook replay idempotency
- Initiate amount mismatch rejection
- Unauthorized payment on another user’s ride (IDOR)

---

## 10. External services (examples)

Document actual choice with client:
- Global card: Stripe / Adyen / etc.
- Local wallets: market-specific
- Always keep `MockPaymentGateway` for CI

Env keys (illustrative):

```
PAYMENT_PROVIDER=
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=
PAYMENT_CURRENCY_DEFAULT=NPR
```

---

## 11. Phase 0 boundary

Architecture and ports only. No provider SDK integration yet.
