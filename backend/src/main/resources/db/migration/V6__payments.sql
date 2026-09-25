-- Phase 4: payments, transactions, wallets

CREATE TABLE payments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id              UUID NOT NULL REFERENCES rides (id) ON DELETE CASCADE,
    passenger_user_id    UUID NOT NULL REFERENCES users (id),
    provider             VARCHAR(32) NOT NULL,
    amount_minor         BIGINT NOT NULL,
    currency             VARCHAR(3) NOT NULL DEFAULT 'NPR',
    status               VARCHAR(32) NOT NULL,
    client_reference     VARCHAR(128),
    provider_payment_id  VARCHAR(128),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_status_chk CHECK (status IN (
        'INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIAL_REFUND'
    )),
    CONSTRAINT payments_amount_chk CHECK (amount_minor >= 0)
);

CREATE UNIQUE INDEX ux_payments_client_ref
    ON payments (passenger_user_id, client_reference)
    WHERE client_reference IS NOT NULL;

CREATE UNIQUE INDEX ux_payments_provider_id
    ON payments (provider, provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;

CREATE INDEX ix_payments_ride ON payments (ride_id);
CREATE INDEX ix_payments_status ON payments (status, created_at DESC);

CREATE TABLE payment_transactions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id         UUID NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
    type               VARCHAR(32) NOT NULL,
    status             VARCHAR(32) NOT NULL,
    raw_provider_ref   VARCHAR(128),
    amount_minor       BIGINT,
    metadata_json      JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_tx_type_chk CHECK (type IN (
        'AUTHORIZE', 'CAPTURE', 'REFUND', 'WEBHOOK', 'VERIFY', 'INITIATE'
    ))
);

CREATE INDEX ix_payment_tx_payment ON payment_transactions (payment_id, created_at);

CREATE TABLE wallets (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    balance_minor  BIGINT NOT NULL DEFAULT 0,
    currency       VARCHAR(3) NOT NULL DEFAULT 'NPR',
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wallets_balance_chk CHECK (balance_minor >= 0)
);

CREATE TABLE wallet_ledger (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id      UUID NOT NULL REFERENCES wallets (id) ON DELETE CASCADE,
    delta_minor    BIGINT NOT NULL,
    reason         VARCHAR(64) NOT NULL,
    ride_id        UUID REFERENCES rides (id) ON DELETE SET NULL,
    payment_id     UUID REFERENCES payments (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_wallet_ledger_wallet ON wallet_ledger (wallet_id, created_at DESC);
