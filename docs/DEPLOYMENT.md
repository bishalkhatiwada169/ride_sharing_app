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
  docker-compose.yml       # db + redis (default); backend (+ embedded admin) under profile `full`
  Dockerfile.backend       # alternate of backend/Dockerfile (repo-root context)
  Dockerfile.admin-web     # optional standalone nginx image (not used by Compose)
infrastructure/nginx/
  admin.conf               # only for optional standalone admin image
backend/Dockerfile         # multi-stage: Vite admin → Spring Boot jar (embeds SPA)
```

### Default local (recommended)

```powershell
.\scripts\start-infra.ps1          # db + redis only
.\scripts\start-backend.ps1        # Gradle bootRun (uses backend/.env)
.\scripts\start-admin.ps1          # Vite HMR on :5173 (optional)
```

### Optional containers (`full` profile)

```powershell
docker compose -f infrastructure/docker/docker-compose.yml --profile full up -d --build
```

- API + Admin SPA (same origin): http://localhost:8080  
- Requires bootstrap admin env vars for first boot if DB is empty

There is **no** `docker-compose.staging.yml` in this repository.

---

## 3. Embedded admin SPA

The production-shaped artifact is a **single Spring Boot jar** that also serves the admin UI:

1. `apps/admin-web` is built with Vite (`dist/`)
2. Files are copied to `classpath:/static/` during `bootJar` / Docker build
3. Spring serves `/`, `/login`, … and `/assets/**` from that classpath
4. REST stays under `/api/**`; WebSocket under `/ws`

Local UI development can still use Vite on `:5173` with the proxy; leave `VITE_*` base URLs unset for same-origin when using the embedded UI.

---

## 4. Configuration

Secrets and environment-specific values via env / secret manager. See `.env.example` files.

Local defaults use mock SMS and mock payments. Do **not** treat default JWT/DB passwords as production-safe.

---

## 5. Nginx

`infrastructure/nginx/admin.conf` is only for the optional standalone `Dockerfile.admin-web` image. The Compose `full` profile does **not** run a separate admin container — TLS termination remains out of scope in-repo.

---

## 6. CI (current)

`.github/workflows/ci.yml`:

1. Admin: typecheck, lint, build
2. Backend: `./gradlew test`, `./gradlew bootJar -x test` (embeds admin `dist` into the jar)

No image publish or deploy jobs yet.

---

## 7. Observability / runbooks

MVP exposes Spring Actuator health. Structured ops runbooks, SLOs, and production incident processes are out of scope until a real deploy target exists.
