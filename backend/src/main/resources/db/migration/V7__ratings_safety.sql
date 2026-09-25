-- Phase 5: ratings + safety (SOS, contacts, trip share)

CREATE TABLE ratings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id         UUID NOT NULL REFERENCES rides (id) ON DELETE CASCADE,
    rater_user_id   UUID NOT NULL REFERENCES users (id),
    ratee_user_id   UUID NOT NULL REFERENCES users (id),
    score           SMALLINT NOT NULL,
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ratings_score_chk CHECK (score BETWEEN 1 AND 5),
    CONSTRAINT ratings_unique_rater UNIQUE (ride_id, rater_user_id)
);

CREATE INDEX ix_ratings_ratee ON ratings (ratee_user_id, created_at DESC);
CREATE INDEX ix_ratings_admin ON ratings (created_at DESC);

CREATE TABLE emergency_contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    phone_e164      VARCHAR(20) NOT NULL,
    relationship    VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_emergency_contacts_user ON emergency_contacts (user_id);

CREATE TABLE safety_incidents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id             UUID REFERENCES rides (id) ON DELETE SET NULL,
    reporter_user_id    UUID NOT NULL REFERENCES users (id),
    type                VARCHAR(32) NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    category            VARCHAR(64),
    notes               TEXT,
    lat                 DOUBLE PRECISION,
    lng                 DOUBLE PRECISION,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    resolved_by         UUID REFERENCES users (id),
    CONSTRAINT safety_type_chk CHECK (type IN ('SOS', 'REPORT')),
    CONSTRAINT safety_status_chk CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED'))
);

CREATE INDEX ix_safety_incidents_status ON safety_incidents (status, created_at DESC);
CREATE INDEX ix_safety_incidents_ride ON safety_incidents (ride_id);

CREATE TABLE sos_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id         UUID NOT NULL REFERENCES safety_incidents (id) ON DELETE CASCADE,
    contacts_notified   INT NOT NULL DEFAULT 0,
    payload_json        JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trip_shares (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id         UUID NOT NULL REFERENCES rides (id) ON DELETE CASCADE,
    token           VARCHAR(64) NOT NULL UNIQUE,
    created_by      UUID NOT NULL REFERENCES users (id),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_trip_shares_ride ON trip_shares (ride_id);
