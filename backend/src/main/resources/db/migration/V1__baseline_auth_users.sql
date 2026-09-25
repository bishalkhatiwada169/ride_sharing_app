-- Phase 1 baseline: auth, users, roles, refresh tokens, OTP challenges
-- PostGIS / geography columns are in V2 (requires PostGIS-enabled Postgres, e.g. Docker image)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
    id          SMALLSERIAL PRIMARY KEY,
    code        VARCHAR(32) NOT NULL UNIQUE,
    description VARCHAR(255)
);

INSERT INTO roles (code, description) VALUES
    ('PASSENGER', 'Ride passenger'),
    ('DRIVER', 'Ride driver'),
    ('ADMIN', 'Operations admin'),
    ('SUPPORT', 'Customer support'),
    ('SUPER_ADMIN', 'Full platform administration');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164      VARCHAR(20),
    email           VARCHAR(320),
    password_hash   VARCHAR(255),
    status          VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    display_name    VARCHAR(120),
    avatar_url      VARCHAR(512),
    locale          VARCHAR(10) DEFAULT 'en',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_status_chk CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
    CONSTRAINT users_phone_or_email_chk CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL)
);

CREATE UNIQUE INDEX ux_users_phone ON users (phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE UNIQUE INDEX ux_users_email ON users (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX ix_users_status ON users (status);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id SMALLINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash      VARCHAR(128) NOT NULL UNIQUE,
    family_id       UUID NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent      VARCHAR(512),
    ip_address      VARCHAR(64)
);

CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX ix_refresh_tokens_family ON refresh_tokens (family_id);

CREATE TABLE otp_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164      VARCHAR(20) NOT NULL,
    code_hash       VARCHAR(128) NOT NULL,
    purpose         VARCHAR(32) NOT NULL DEFAULT 'LOGIN',
    attempts        INT NOT NULL DEFAULT 0,
    max_attempts    INT NOT NULL DEFAULT 5,
    expires_at      TIMESTAMPTZ NOT NULL,
    consumed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT otp_purpose_chk CHECK (purpose IN ('LOGIN', 'VERIFY_PHONE'))
);

CREATE INDEX ix_otp_phone_created ON otp_challenges (phone_e164, created_at DESC);

CREATE TABLE passenger_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    rating_avg      NUMERIC(3, 2) NOT NULL DEFAULT 0,
    rating_count    INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE driver_profiles (
    user_id                 UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    verification_status     VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    is_online               BOOLEAN NOT NULL DEFAULT FALSE,
    availability_status     VARCHAR(32) NOT NULL DEFAULT 'OFFLINE',
    location_updated_at     TIMESTAMPTZ,
    rating_avg              NUMERIC(3, 2) NOT NULL DEFAULT 0,
    rating_count            INT NOT NULL DEFAULT 0,
    approved_at             TIMESTAMPTZ,
    rejected_reason         TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT driver_verification_chk CHECK (verification_status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    CONSTRAINT driver_availability_chk CHECK (availability_status IN ('OFFLINE', 'AVAILABLE', 'ON_OFFER', 'ON_TRIP'))
);

CREATE INDEX ix_driver_online_available ON driver_profiles (is_online, availability_status, verification_status);

CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_user_id   UUID REFERENCES users (id) ON DELETE SET NULL,
    action          VARCHAR(64) NOT NULL,
    entity_type     VARCHAR(64),
    entity_id       VARCHAR(64),
    ip_address      VARCHAR(64),
    user_agent      VARCHAR(512),
    before_json     JSONB,
    after_json      JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_audit_created ON audit_logs (created_at DESC);
CREATE INDEX ix_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX ix_audit_actor ON audit_logs (actor_user_id, created_at DESC);
