-- Phase 2: vehicles, fare rules/quotes, rides, ride events

CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_user_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    vehicle_type    VARCHAR(32) NOT NULL,
    make            VARCHAR(80),
    model           VARCHAR(80),
    color           VARCHAR(40),
    year            SMALLINT,
    plate_number    VARCHAR(32) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    seats           SMALLINT NOT NULL DEFAULT 4,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT vehicles_type_chk CHECK (vehicle_type IN ('ECONOMY', 'COMFORT', 'XL')),
    CONSTRAINT vehicles_status_chk CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING'))
);

CREATE UNIQUE INDEX ux_vehicles_plate ON vehicles (plate_number);
CREATE INDEX ix_vehicles_driver ON vehicles (driver_user_id);

CREATE TABLE vehicle_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      UUID NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
    doc_type        VARCHAR(32) NOT NULL,
    storage_key     VARCHAR(512) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'UPLOADED',
    expires_at      DATE,
    reviewed_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT vehicle_docs_type_chk CHECK (doc_type IN ('REGISTRATION', 'INSURANCE', 'PERMIT', 'PHOTO')),
    CONSTRAINT vehicle_docs_status_chk CHECK (status IN ('UPLOADED', 'APPROVED', 'REJECTED'))
);

CREATE INDEX ix_vehicle_documents_vehicle ON vehicle_documents (vehicle_id);

CREATE TABLE fare_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(120) NOT NULL,
    vehicle_type        VARCHAR(32) NOT NULL,
    city_code           VARCHAR(32),
    currency            CHAR(3) NOT NULL DEFAULT 'NPR',
    base_fare_minor     BIGINT NOT NULL,
    per_km_minor        BIGINT NOT NULL,
    per_minute_minor    BIGINT NOT NULL,
    booking_fee_minor   BIGINT NOT NULL DEFAULT 0,
    min_fare_minor      BIGINT NOT NULL,
    tax_bps             INT NOT NULL DEFAULT 0,
    surge_multiplier    NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    priority            INT NOT NULL DEFAULT 100,
    active_from         TIMESTAMPTZ,
    active_to           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_fare_rules_active ON fare_rules (vehicle_type, is_active, priority);

INSERT INTO fare_rules (
    name, vehicle_type, city_code, currency,
    base_fare_minor, per_km_minor, per_minute_minor, booking_fee_minor, min_fare_minor, tax_bps, surge_multiplier, priority
) VALUES
    ('Economy default', 'ECONOMY', 'KTM', 'NPR', 5000, 2500, 500, 1000, 8000, 0, 1.00, 100),
    ('Comfort default', 'COMFORT', 'KTM', 'NPR', 8000, 3500, 700, 1500, 12000, 0, 1.00, 100),
    ('XL default', 'XL', 'KTM', 'NPR', 12000, 4500, 900, 2000, 18000, 0, 1.00, 100);

CREATE TABLE fare_quotes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_user_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rule_id             UUID NOT NULL REFERENCES fare_rules (id),
    vehicle_type        VARCHAR(32) NOT NULL,
    pickup_lat          DOUBLE PRECISION NOT NULL,
    pickup_lng          DOUBLE PRECISION NOT NULL,
    dropoff_lat         DOUBLE PRECISION NOT NULL,
    dropoff_lng         DOUBLE PRECISION NOT NULL,
    pickup_address      TEXT,
    dropoff_address     TEXT,
    distance_m          INT NOT NULL,
    duration_s          INT NOT NULL,
    currency            CHAR(3) NOT NULL,
    total_minor         BIGINT NOT NULL,
    breakdown_json      JSONB NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_fare_quotes_passenger ON fare_quotes (passenger_user_id, created_at DESC);

CREATE TABLE rides (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_user_id       UUID NOT NULL REFERENCES users (id),
    driver_user_id          UUID REFERENCES users (id),
    vehicle_id              UUID REFERENCES vehicles (id),
    status                  VARCHAR(40) NOT NULL,
    vehicle_type_requested  VARCHAR(32) NOT NULL,
    pickup_lat              DOUBLE PRECISION NOT NULL,
    pickup_lng              DOUBLE PRECISION NOT NULL,
    pickup_address          TEXT,
    dropoff_lat             DOUBLE PRECISION NOT NULL,
    dropoff_lng             DOUBLE PRECISION NOT NULL,
    dropoff_address         TEXT,
    fare_quote_id           UUID NOT NULL REFERENCES fare_quotes (id),
    distance_m              INT,
    duration_s              INT,
    payment_method          VARCHAR(16) NOT NULL DEFAULT 'CASH',
    payment_status          VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    trip_pin                CHAR(4) NOT NULL,
    cancel_reason           TEXT,
    cancelled_by            UUID REFERENCES users (id),
    requested_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_at             TIMESTAMPTZ,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT rides_status_chk CHECK (status IN (
        'REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ACCEPTED', 'DRIVER_ARRIVING',
        'DRIVER_ARRIVED', 'RIDE_STARTED', 'RIDE_COMPLETED',
        'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'NO_DRIVER_FOUND', 'EXPIRED', 'PAYMENT_FAILED'
    )),
    CONSTRAINT rides_payment_method_chk CHECK (payment_method IN ('CASH', 'DIGITAL')),
    CONSTRAINT rides_payment_status_chk CHECK (payment_status IN (
        'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'NOT_REQUIRED'
    ))
);

CREATE INDEX ix_rides_passenger ON rides (passenger_user_id, created_at DESC);
CREATE INDEX ix_rides_driver ON rides (driver_user_id, created_at DESC);
CREATE INDEX ix_rides_status ON rides (status);
CREATE INDEX ix_rides_live ON rides (status) WHERE status IN (
    'SEARCHING_DRIVER', 'DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'RIDE_STARTED'
);

CREATE TABLE ride_events (
    id              BIGSERIAL PRIMARY KEY,
    ride_id         UUID NOT NULL REFERENCES rides (id) ON DELETE CASCADE,
    from_status     VARCHAR(40),
    to_status       VARCHAR(40) NOT NULL,
    actor_user_id   UUID REFERENCES users (id) ON DELETE SET NULL,
    actor_role      VARCHAR(32),
    source          VARCHAR(32) NOT NULL DEFAULT 'API',
    payload_json    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ride_events_ride ON ride_events (ride_id, created_at);
