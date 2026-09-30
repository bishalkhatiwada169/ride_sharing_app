#!/usr/bin/env bash
set -euo pipefail
cd /opt/bkcs

upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

upsert RIDE_IMAGE "ghcr.io/bishalkhatiwada169/ride_sharing_app:latest"
upsert RIDE_DB_PASSWORD "${RIDE_DB_PASSWORD:?}"
upsert RIDE_JWT_SECRET "${RIDE_JWT_SECRET:?}"
upsert RIDE_BOOTSTRAP_SUPERADMIN_EMAIL "${RIDE_BOOTSTRAP_SUPERADMIN_EMAIL:-admin@ride.bkcs.app}"
upsert RIDE_BOOTSTRAP_SUPERADMIN_PASSWORD "${RIDE_BOOTSTRAP_SUPERADMIN_PASSWORD:?}"
upsert RIDE_CORS_ALLOWED_ORIGINS "https://ride.bkcs.app,https://api.ride.bkcs.app"
upsert RIDE_SMS_PROVIDER "mock"
upsert RIDE_PAYMENT_PROVIDER "mock"

chmod +x scripts/deploy-app.sh

echo "==> Reload Caddy"
docker compose --env-file .env up -d caddy
docker compose --env-file .env exec -T caddy caddy reload --config /etc/caddy/Caddyfile \
  || docker compose --env-file .env restart caddy

echo "==> Deploy ride stack"
SKIP_PULL=1 ./scripts/deploy-app.sh ride

echo "==> Status"
docker compose --env-file .env --profile apps ps ride ride-postgres ride-redis caddy
