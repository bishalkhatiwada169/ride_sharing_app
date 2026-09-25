-- Phase 6: ride offers for matching dispatch
CREATE TABLE ride_offers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id          UUID NOT NULL REFERENCES rides (id) ON DELETE CASCADE,
    driver_user_id   UUID NOT NULL REFERENCES users (id),
    vehicle_id       UUID NOT NULL REFERENCES vehicles (id),
    status           VARCHAR(32) NOT NULL,
    distance_m       INT,
    expires_at       TIMESTAMPTZ NOT NULL,
    responded_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ride_offers_status_chk CHECK (status IN (
        'PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'
    ))
);

CREATE INDEX ix_ride_offers_ride ON ride_offers (ride_id, created_at DESC);
CREATE INDEX ix_ride_offers_driver_pending ON ride_offers (driver_user_id, status)
    WHERE status = 'PENDING';
