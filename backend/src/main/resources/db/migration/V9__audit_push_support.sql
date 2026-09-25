-- Phase 7: audit logs, push devices, support tickets
CREATE TABLE IF NOT EXISTS audit_logs (
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

CREATE INDEX IF NOT EXISTS ix_audit_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_actor ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_entity ON audit_logs (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS device_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    platform        VARCHAR(32) NOT NULL,
    token           VARCHAR(512) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT device_tokens_unique UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS ix_device_tokens_user ON device_tokens (user_id);

CREATE TABLE IF NOT EXISTS support_tickets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opener_user_id      UUID NOT NULL REFERENCES users (id),
    ride_id             UUID REFERENCES rides (id) ON DELETE SET NULL,
    category            VARCHAR(64) NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    priority            VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    subject             VARCHAR(200) NOT NULL,
    description         TEXT,
    assignee_user_id    UUID REFERENCES users (id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_status_chk CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT support_priority_chk CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

CREATE INDEX IF NOT EXISTS ix_support_tickets_status ON support_tickets (status, created_at DESC);
