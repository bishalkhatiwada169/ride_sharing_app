# Pricing / Fare Engine

**Principle:** All fares calculated **server-side**. Mobile apps display quote breakdowns only; they never own business prices.

---

## 1. Goals

- Configurable by admin (per vehicle type, city/zone, schedule)
- Transparent breakdown for passengers
- Deterministic quotes with expiry
- Snapshot immutability after booking
- Support surge, discounts, tax, booking fee
- Auditable rule changes

---

## 2. Port

```java
public interface FareEngine {
  FareQuote quote(FareQuoteRequest request);
  FareSettlement settle(Ride ride, FareSettlementContext context); // optional actuals
}
```

Admin mutates `fare_rules` (and surge tables); engine reads active rules—not hard-coded constants in apps.

---

## 3. Quote inputs

- Pickup / dropoff coordinates (and optional waypoints later)
- Vehicle type
- Passenger id (coupon eligibility)
- Requested coupon code (optional)
- City/zone derived server-side from pickup

Distance & duration:
- v1: `MapGateway` route distance/duration or Haversine + speed factor
- Never trust client-sent distance for price

---

## 4. Fare formula (configurable components)

```
gross = max(
  min_fare,
  base_fare
  + distance_km * per_km
  + duration_min * per_minute
) * surge_multiplier

+ booking_fee
+ other_fees[]          # configurable line items
- discount              # coupon / promo
+ tax                   # on taxable portion per policy

total = round_currency(gross_adjusted)
```

All amounts in **minor units** integer math; define rounding mode (half-up) in config.

### Breakdown line items (example)

| Code | Description |
|------|-------------|
| BASE | Base fare |
| DISTANCE | Distance component |
| TIME | Time component |
| BOOKING_FEE | Platform fee |
| SURGE | Surge adjustment (or multiplier applied) |
| DISCOUNT | Coupon |
| TAX | Tax |
| TOTAL | Payable |

Stored in `fare_quotes.breakdown_json`.

---

## 5. Surge

Options (choose in implementation):
1. Multiplier on rule (`surge_multiplier`)
2. Separate `surge_schedules` / heatmap zones by time

Admin sets surge; engine applies at quote time. Snapshot includes surge so later admin changes do not alter active rides.

---

## 6. Discounts

- Coupons: percent or fixed; max discount; first-ride; vehicle constraints
- Validate server-side; record redemption on completed/paid ride
- Prevent double-spend with unique constraints

---

## 7. Quote lifecycle

```
POST /pricing/quotes → FareQuote (expires_at = now + N minutes)
Passenger confirms → Ride references fare_quote_id
If expired → reject booking; client must re-quote
```

Quotes are **immutable**.

---

## 8. Settlement vs quote

| Mode | Behavior |
|------|----------|
| Quote-locked | Charge quote total (simpler; good for MVP) |
| Actuals adjust | Recalculate with real distance/time; cap variance % |

**MVP recommendation:** quote-locked for passenger trust; store actual path metrics for analytics. Document client preference before enabling actuals billing.

---

## 9. Currency & markets

- `currency` on rules and quotes
- Single-currency per city initially
- Display formatting in apps via locale; values from server

---

## 10. Admin APIs

- CRUD fare rules with validation
- Preview quote tool (admin)
- Audit every rule change (`audit_logs`)

---

## 11. Testing requirements

Critical unit tests:
- Min fare enforcement
- Surge application
- Tax calculation
- Coupon edge cases (expired, over-limit)
- Rounding
- Expired quote rejection on book

---

## 12. Anti-tampering

Reject client-supplied `total`, `surge`, or line items on booking. Only `fareQuoteId` + ride params.

---

## 13. Phase 0 boundary

Design only; no fare_rules seed data applied until later phases.
