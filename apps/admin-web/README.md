# Ride Platform Admin

React + Vite + TypeScript + Tailwind admin console.

**Phase 1:** login, JWT session (Zustand), shell layout, dashboard placeholder.

## Setup

```bash
cd apps/admin-web
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 — API proxied to `http://localhost:8080` in dev.

### Embedded with backend

Production-shaped deploys serve this app from Spring Boot (`classpath:/static/`) on the same origin as the API. Build `dist/`, then run `./gradlew bootJar` in `backend/` (or use Compose profile `full`). Leave `VITE_API_BASE_URL` / `VITE_WS_BASE_URL` unset for relative same-origin URLs.
