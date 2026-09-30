# Deploy Ride to bkcs-shared (Caddy + TLS)

Ride runs on the shared Lightsail host (`bkcs-shared` / `52.70.234.23`) next to
other `*.bkcs.app` apps. TLS is automatic via Caddy.

| Host | Target |
|------|--------|
| `https://ride.bkcs.app` | Admin SPA + API (embedded Spring Boot) |
| `https://api.ride.bkcs.app` | Same container (mobile / public API) |

Shared-host config lives in the **bkcs-shared-host** repo (`docker-compose.yml`,
`Caddyfile`). This app repo builds the image and runs `./scripts/deploy-app.sh ride`.

## Prerequisites

1. Route53 A records (already provisioned): `deploy/dns`
2. On `/opt/bkcs`: updated `Caddyfile` + `docker-compose.yml` with `ride*` services
3. GitHub Environment **stage**:

| Name | Type | Purpose |
|------|------|---------|
| `LIGHTSAIL_HOST` / `SHARED_HOST` | variable | `52.70.234.23` |
| `LIGHTSAIL_USER` | variable | `ubuntu` (optional) |
| `LIGHTSAIL_SSH_KEY` / `SHARED_SSH_KEY` | secret | `bkcs-shared-key.pem` |
| `RIDE_DB_PASSWORD` | secret | PostGIS password |
| `RIDE_JWT_SECRET` | secret | ≥32 chars |
| `RIDE_BOOTSTRAP_SUPERADMIN_EMAIL` | secret | optional first admin |
| `RIDE_BOOTSTRAP_SUPERADMIN_PASSWORD` | secret | optional first admin |

Also set for APK builds:

```
ANDROID_API_BASE_URL=https://api.ride.bkcs.app/api/v1
```

## Deploy

GitHub → Actions → **Deploy Shared Host** → Run workflow.

Or after pushing image tags manually:

```bash
# on server
cd /opt/bkcs
# upsert RIDE_IMAGE=... and secrets in .env
./scripts/deploy-app.sh ride
```

## Verify

```bash
curl -fsS https://api.ride.bkcs.app/actuator/health
curl -fsSI https://ride.bkcs.app/
```
