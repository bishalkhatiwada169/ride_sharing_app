# Deployment & Operations

**Status:** Local / MVP guidance for Phases 0–7. This is **not** a production deployment playbook.
There is no staging Compose overlay and no managed production environment in this repository yet.

---

## 1. Environments (intent)

| Env | In this repo |
|-----|----------------|
| `local` | Supported — Docker Compose `db` + `redis`; backend via Gradle or Compose profile `full` |
| `staging` / `production` | **Not packaged here** — client ops / future work |

---

## 2. What exists under `infrastructure/docker/`

```
infrastructure/docker/
  docker-compose.yml       # db + redis (default); backend + admin-web under profile `full`
  Dockerfile.backend       # alternate; prefer backend/Dockerfile with backend context
  Dockerfile.admin-web     # build from **repository root** context
infrastructure/nginx/
  admin.conf               # SPA + /api + /ws proxy to service name `backend`
backend/Dockerfile         # used by Compose profile `full` for the API image
```

### Default local (recommended)

```powershell
.\scripts\start-infra.ps1          # db + redis only
.\scripts\start-backend.ps1        # Gradle bootRun (uses backend/.env)
.\scripts\start-admin.ps1          # Vite on :5173
```

### Optional containers (`full` profile)

```powershell
docker compose -f infrastructure/docker/docker-compose.yml --profile full up -d --build
```

- API: http://localhost:8080  
- Admin image (nginx): http://localhost:8081  
- Requires bootstrap admin env vars for first boot if DB is empty

There is **no** `docker-compose.staging.yml` in this repository.

---

## 3. Configuration

Secrets and environment-specific values via env / secret manager. See `.env.example` files.

Local defaults use mock SMS and mock payments. Do **not** treat default JWT/DB passwords as production-safe.

---

## 4. Nginx

`infrastructure/nginx/admin.conf` proxies `/api` and `/ws` to `backend:8080` when the admin image runs on the Compose network. TLS termination is **not** configured in-repo.

---

## 5. CI (current)

`.github/workflows/ci.yml`:

1. Backend: `./gradlew test`, `./gradlew bootJar -x test`
2. Admin: `npm` typecheck, lint, build

No image publish or deploy jobs yet.

---

## 6. Observability / runbooks

MVP exposes Spring Actuator health. Structured ops runbooks, SLOs, and production incident processes are out of scope until a real deploy target exists.
