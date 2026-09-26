# Ride Platform — Backend

Spring Boot 3 / Java 21 service. Phase 1: auth foundation, Flyway baseline, OpenAPI, domain package scaffolding.

## Prerequisites

- JDK 21+
- Docker (Postgres+PostGIS, Redis)

## Quick start

```bash
# from repo root
docker compose -f infrastructure/docker/docker-compose.yml up -d db redis

cd backend
cp .env.example .env   # optional; defaults work for local

# optional local super-admin (local profile only)
set BOOTSTRAP_SUPERADMIN_EMAIL=admin@example.com
set BOOTSTRAP_SUPERADMIN_PASSWORD=ChangeMeNow123!

./gradlew bootRun
```

- API: http://localhost:8080/api  
- Health: http://localhost:8080/actuator/health  
- Swagger: http://localhost:8080/swagger-ui.html  
- Admin SPA (when embedded): http://localhost:8080/  

Embed the admin UI into the jar (CI/Docker do this automatically):

```bash
cd ../apps/admin-web && npm install && npm run build
cd ../../backend && ./gradlew bootJar
```

### Passenger OTP (mock SMS)

```bash
curl -X POST http://localhost:8080/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d "{\"phoneE164\":\"+9779800000000\"}"
```

OTP is logged by `MockSmsGateway` in the backend console.

### Admin login

```bash
curl -X POST http://localhost:8080/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"ChangeMeNow123!\"}"
```

## Modules

See `docs/ARCHITECTURE.md`. Domain placeholders exist under `com.rideplatform.*` for rides, matching, pricing, payments, etc.
