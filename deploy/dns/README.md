# Ride DNS (Route53 → shared Lightsail)

Upserts A records on the `bkcs.app` hosted zone so Ride shares the same
Lightsail host as other BKCS apps (`bkcs-shared` / `52.70.234.23`).

| Host | Type | Target |
|------|------|--------|
| `ride.bkcs.app` | A | shared Lightsail IP (admin / web) |
| `api.ride.bkcs.app` | A | same IP (Spring API) |

## Provision / re-apply (AWS SDK)

```powershell
cd deploy/dns
npm install
npm run ensure-dns
```

Optional overrides:

```powershell
$env:PUBLIC_IP="52.70.234.23"
npm run ensure-dns
```

Config: `deploy/dns/dns.env`  
Meta after run: `deploy/dns/.dns-meta.json` (gitignored)

## GitHub Action

Workflow: `.github/workflows/ensure-dns.yml`

Actions → **Ensure Ride DNS** → Run workflow.

Uses AWS credentials from the `stage` environment (`AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY`). Optional inputs: `public_ip`, `app_host`, `api_host`.

## After DNS

TLS and reverse-proxy vhosts for `ride.bkcs.app` / `api.ride.bkcs.app` still need
to be configured on the shared host (Certbot + nginx), similar to Dr. Saathi.

Suggested GitHub `stage` vars once the host is live:

```
APP_HOST=ride.bkcs.app
API_HOST=api.ride.bkcs.app
ANDROID_API_BASE_URL=https://api.ride.bkcs.app/api/v1
```
