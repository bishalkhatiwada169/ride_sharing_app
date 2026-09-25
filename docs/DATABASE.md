# Database Design

**Engine:** PostgreSQL + PostGIS  
**Migrations:** Flyway (to be introduced in Phase 1+)  
**ORM:** Spring Data JPA / Hibernate (entities internal; APIs use DTOs)

---

## 1. Design principles

- Normalized core; denormalize only for hot read paths with documented reason
- Soft-delete sparingly; prefer status + audit for regulated entities
- All money in **minor units** (e.g. cents/paisa) as `BIGINT` + `currency` (`CHAR(3)`)
- Locations as PostGIS `geography(Point, 4326)` (and optional line for paths)
- Timestamps: `created_at`, `updated_at`; business events also in `ride_events`
- UUIDs for public IDs (`UUID` PK or separate `public_id`) to reduce IDOR guessing
- Never store raw card PAN/CVV

---

## 2. Entity overview

```
roles ←── user_roles ──→ users
                           ├── passenger_profiles
                           ├── driver_profiles ──→ vehicles ──→ vehicle_documents
                           ├── wallets
                           ├── emergency_contacts
                           └── audit_logs (actor)

rides ──→ ride_events
      ──→ ride_locations
      ──→ fare_quotes
      ──→ payments ──→ payment_transactions
      ──→ ratings / reviews

fare_rules (config)
coupons / promotions
notifications
support_tickets
```

---

## 3. Core tables

### 3.1 `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| phone_e164 | VARCHAR(20) | Unique where not null |
| email | CITEXT | Unique where not null (admins) |
| password_hash | VARCHAR | Null for OTP-only users |
| status | ENUM | `ACTIVE`, `SUSPENDED`, `DELETED` |
| display_name | VARCHAR | |
| avatar_url | VARCHAR | |
| locale | VARCHAR(10) | |
| created_at / updated_at | TIMESTAMPTZ | |

**Indexes:** unique `(phone_e164)`, unique `(email)`, `(status)`

### 3.2 `roles`

| Column | Type |
|--------|------|
| id | SMALLSERIAL PK |
| code | VARCHAR UNIQUE | `PASSENGER`, `DRIVER`, `ADMIN`, `SUPPORT`, `SUPER_ADMIN` |

### 3.3 `user_roles`

| Column | Type |
|--------|------|
| user_id | UUID FK → users |
| role_id | SMALLINT FK → roles |
| PK `(user_id, role_id)` |

### 3.4 `passenger_profiles`

| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID PK/FK | |
| default_payment_method | VARCHAR | Token ref only |
| rating_avg | NUMERIC(3,2) | Maintained by service |
| rating_count | INT | |

### 3.5 `driver_profiles`

| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID PK/FK | |
| verification_status | ENUM | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED` |
| is_online | BOOLEAN | |
| availability_status | ENUM | `OFFLINE`, `AVAILABLE`, `ON_OFFER`, `ON_TRIP` |
| current_location | geography(Point,4326) | Updated throttled |
| location_updated_at | TIMESTAMPTZ | Stale detection |
| rating_avg / rating_count | | |
| approved_at / rejected_reason | | |

**Indexes:** GiST on `current_location`; `(is_online, availability_status, verification_status)`; partial index for online+available+approved.

### 3.6 `vehicles`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| driver_user_id | UUID FK | |
| vehicle_type | ENUM/VARCHAR | e.g. `ECONOMY`, `COMFORT`, `XL` |
| make / model / color / year | | |
| plate_number | VARCHAR | Unique per market rules |
| status | ENUM | `ACTIVE`, `INACTIVE`, `PENDING` |
| seats | SMALLINT | |

### 3.7 `vehicle_documents`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| vehicle_id | UUID FK | |
| doc_type | ENUM | registration, insurance, permit, photo… |
| storage_key | VARCHAR | Object storage key |
| status | ENUM | `UPLOADED`, `APPROVED`, `REJECTED` |
| expires_at | DATE | Nullable |
| reviewed_by / reviewed_at | | |

### 3.8 `rides`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| passenger_user_id | UUID FK | |
| driver_user_id | UUID FK NULL | |
| vehicle_id | UUID FK NULL | |
| status | VARCHAR/ENUM | State machine |
| vehicle_type_requested | VARCHAR | |
| pickup | geography(Point,4326) | |
| pickup_address | TEXT | |
| dropoff | geography(Point,4326) | |
| dropoff_address | TEXT | |
| fare_quote_id | UUID FK | Snapshot quote |
| distance_m | INT | Estimated/actual |
| duration_s | INT | |
| payment_method | ENUM | `CASH`, `DIGITAL` |
| payment_status | ENUM | `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`, `NOT_REQUIRED` |
| trip_pin | CHAR(4) | Server-generated |
| cancelled_by / cancel_reason | | |
| requested_at / assigned_at / started_at / completed_at | TIMESTAMPTZ | |
| created_at / updated_at | TIMESTAMPTZ | |
| version | BIGINT | Optimistic lock |

**Indexes:** `(passenger_user_id, created_at DESC)`; `(driver_user_id, created_at DESC)`; `(status)` + partial live statuses; GiST pickup for analytics.

**Constraint:** status only updated via application service (DB check optional for known enum set).

### 3.9 `ride_events`

| Column | Type |
|--------|------|
| id | BIGSERIAL PK |
| ride_id | UUID FK |
| from_status | VARCHAR NULL |
| to_status | VARCHAR |
| actor_user_id | UUID NULL |
| actor_role | VARCHAR |
| source | VARCHAR | `API`, `SYSTEM`, `WEBHOOK`, `ADMIN` |
| payload_json | JSONB |
| created_at | TIMESTAMPTZ |

**Indexes:** `(ride_id, created_at)`

### 3.10 `ride_locations`

| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL | |
| ride_id | UUID FK | |
| recorded_at | TIMESTAMPTZ | |
| location | geography(Point,4326) | |
| speed_mps / heading | optional | |
| source | VARCHAR | `DRIVER_APP` |

**Indexes:** `(ride_id, recorded_at)`; retention job archives/deletes old rows.

### 3.11 `fare_rules`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR | |
| vehicle_type | VARCHAR | |
| city_code / zone_id | VARCHAR NULL | Multi-city ready |
| currency | CHAR(3) | |
| base_fare_minor | BIGINT | |
| per_km_minor | BIGINT | |
| per_minute_minor | BIGINT | |
| booking_fee_minor | BIGINT | |
| min_fare_minor | BIGINT | |
| tax_bps | INT | Basis points |
| surge_multiplier | NUMERIC(4,2) | Default 1.00; or separate surge table |
| active_from / active_to | TIMESTAMPTZ | |
| is_active | BOOLEAN | |
| priority | INT | Rule selection |

### 3.12 `fare_quotes`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| passenger_user_id | UUID | |
| rule_id | UUID | |
| breakdown_json | JSONB | Line items |
| total_minor | BIGINT | |
| currency | CHAR(3) | |
| expires_at | TIMESTAMPTZ | |
| distance_m / duration_s | INT | Inputs |
| created_at | TIMESTAMPTZ | |

Immutable after creation; ride stores `fare_quote_id`.

### 3.13 `payments`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| ride_id | UUID FK | |
| provider | VARCHAR | `CASH`, `STRIPE`, `ESEWA`, … |
| amount_minor | BIGINT | |
| currency | CHAR(3) | |
| status | ENUM | `INITIATED`, `PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED`, `PARTIAL_REFUND` |
| client_reference | VARCHAR | Idempotency |
| provider_payment_id | VARCHAR | |
| created_at / updated_at | | |

### 3.14 `payment_transactions`

Ledger of attempts/webhooks:

| Column | Type |
|--------|------|
| id | UUID PK |
| payment_id | UUID FK |
| type | ENUM | `AUTHORIZE`, `CAPTURE`, `REFUND`, `WEBHOOK`, `VERIFY` |
| status | VARCHAR |
| raw_provider_ref | VARCHAR |
| amount_minor | BIGINT |
| created_at | TIMESTAMPTZ |
| metadata_json | JSONB | Redact secrets |

### 3.15 `wallets`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID UNIQUE | Driver earnings / passenger credit |
| balance_minor | BIGINT | |
| currency | CHAR(3) | |
| updated_at | | |

Companion `wallet_ledger` recommended (id, wallet_id, delta, reason, ride_id, created_at).

### 3.16 `ratings` / `reviews`

| Column | Type |
|--------|------|
| id | UUID PK |
| ride_id | UUID | Unique per (ride, rater) |
| rater_user_id | UUID |
| ratee_user_id | UUID |
| score | SMALLINT | 1–5 CHECK |
| comment | TEXT | Optional moderation |
| created_at | |

### 3.17 `notifications`

| Column | Type |
|--------|------|
| id | UUID PK |
| user_id | UUID |
| channel | ENUM | `PUSH`, `SMS`, `IN_APP` |
| template_code | VARCHAR |
| title / body | |
| status | ENUM | `QUEUED`, `SENT`, `FAILED` |
| payload_json | JSONB |
| created_at / sent_at | |

### 3.18 `support_tickets`

| Column | Type |
|--------|------|
| id | UUID PK |
| opener_user_id | UUID |
| ride_id | UUID NULL |
| category | VARCHAR |
| status | ENUM | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| priority | ENUM |
| assignee_user_id | UUID NULL |
| subject / description | |
| created_at / updated_at | |

### 3.19 `coupons` / `promotions`

Standard codes, percent/fixed off, validity windows, usage limits, vehicle/city constraints. Redemption rows link `user_id`, `coupon_id`, `ride_id`.

### 3.20 `emergency_contacts`

| Column | Type |
|--------|------|
| id | UUID PK |
| user_id | UUID |
| name | VARCHAR |
| phone_e164 | VARCHAR |
| relationship | VARCHAR |

### 3.21 `audit_logs`

| Column | Type |
|--------|------|
| id | BIGSERIAL |
| actor_user_id | UUID NULL |
| action | VARCHAR | e.g. `DRIVER_APPROVE` |
| entity_type / entity_id | |
| ip / user_agent | |
| before_json / after_json | Redacted |
| created_at | TIMESTAMPTZ |

**Indexes:** `(entity_type, entity_id)`, `(actor_user_id, created_at)`, `(created_at)`

### 3.22 Safety adjuncts (recommended)

- `trip_shares` — token, ride_id, expires_at, revoked_at  
- `safety_incidents` — ride_id, reporter, type (`SOS`, `REPORT`), status, location, notes  
- `sos_events` — incident child with contacts notified  

---

## 4. Relationships (summary)

- User 1—* roles via `user_roles`
- User 1—0..1 passenger_profile / driver_profile
- Driver 1—* vehicles; vehicle 1—* documents
- Passenger 1—* rides; Driver 0..* rides
- Ride 1—* ride_events / ride_locations
- Ride 1—1 fare_quote (required at confirm)
- Ride 1—* payments; payment 1—* transactions
- User 1—1 wallet (as needed)
- Ride 1—* ratings (max 2: passenger↔driver)

---

## 5. Important constraints

- `ratings.score` BETWEEN 1 AND 5
- Unique ride rating per `(ride_id, rater_user_id)`
- `vehicles.plate_number` unique (scoped by `country_code` if multi-market)
- Driver `is_online = true` only if `verification_status = APPROVED` (enforce in service; optional DB trigger)
- Monetary amounts `>= 0` except wallet ledger deltas
- `fare_quotes.expires_at > created_at`

---

## 6. Status fields (canonical)

| Entity | Status field |
|--------|--------------|
| users | ACTIVE / SUSPENDED / DELETED |
| driver_profiles | verification + availability |
| vehicles / documents | ACTIVE/PENDING… / UPLOADED/APPROVED… |
| rides | state machine (ARCHITECTURE) |
| payments | INITIATED → … |
| support_tickets | OPEN → CLOSED |
| notifications | QUEUED → SENT/FAILED |

---

## 7. Location fields

| Use | Storage |
|-----|---------|
| Driver presence | `driver_profiles.current_location` |
| Ride pickup/dropoff | `rides.pickup` / `dropoff` |
| Trip trail | `ride_locations` |
| SOS | `safety_incidents.location` |

Always store WGS84; convert in app for display.

---

## 8. Retention & privacy

- Document retention policy with client legal (ride paths, OTP codes, audit)
- Soft purge PII on account deletion request with legal hold exceptions
- Webhook payloads stored redacted

---

## 9. Indexing checklist

| Query | Index |
|-------|-------|
| Nearby drivers | GiST + partial online/available/approved |
| Passenger history | `(passenger_user_id, created_at DESC)` |
| Driver history / earnings | `(driver_user_id, completed_at)` |
| Live ops board | partial index on non-terminal ride statuses |
| Payment reconciliation | `(provider, provider_payment_id)` UNIQUE |
| Audit investigation | `(created_at)`, entity composite |

---

## 10. Migration strategy

Flyway scripts under `backend/src/main/resources/db/migration`:

1. Enable PostGIS  
2. Auth/users/roles  
3. Profiles/vehicles/docs  
4. Fare + rides + events  
5. Payments/wallets  
6. Ratings/notifications/support/safety/audit  

No schema applied in Phase 0.
