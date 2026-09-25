# External services registry (documentation)
# Fill provider product names when the client selects vendors.

| Concern | Port / adapter | Env vars (examples) | Notes |
|---------|----------------|---------------------|-------|
| Maps / geocoding / routing | `MapGateway` | `MAP_API_KEY`, `MAP_PROVIDER` | Restrict keys by API & package name |
| SMS / OTP | `SmsGateway` | `SMS_API_KEY`, `SMS_API_SECRET`, `SMS_SENDER_ID` | Mock in local |
| Push | `PushGateway` | `FIREBASE_*` | FCM; APNs later for iOS |
| Payments | `PaymentGateway` | `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET` | Never store PAN |
| Object storage | `StorageGateway` | `STORAGE_*` | Driver documents, avatars |
| Email (optional) | `EmailGateway` | `SMTP_*` / provider API | Admin alerts, receipts |
| Error tracking (optional) | — | `SENTRY_DSN` | Client + server |
| Analytics (optional) | — | vendor keys | Prefer server-side events for money |

All production accounts must be owned by the **client legal entity**, not a contractor personal account.
