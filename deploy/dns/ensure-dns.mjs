#!/usr/bin/env node
/**
 * Upsert Route53 A records for Ride on bkcs.app via AWS SDK.
 *
 *   cd deploy/dns && npm install && npm run ensure-dns
 *
 * Optional overrides:
 *   PUBLIC_IP=1.2.3.4 npm run ensure-dns
 *   APP_HOST=ride.bkcs.app API_HOST=api.ride.bkcs.app npm run ensure-dns
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ChangeResourceRecordSetsCommand,
  GetChangeCommand,
  Route53Client,
} from "@aws-sdk/client-route-53";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, "dns.env");
const META_PATH = join(__dirname, ".dns-meta.json");

function parseEnvFile(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

function fqdn(name) {
  return name.endsWith(".") ? name : `${name}.`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitInSync(client, changeId, { timeoutMs = 120_000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await client.send(new GetChangeCommand({ Id: changeId }));
    const status = res.ChangeInfo?.Status;
    if (status === "INSYNC") return;
    await sleep(2000);
  }
  throw new Error(`Timed out waiting for Route53 change ${changeId} to become INSYNC`);
}

async function main() {
  const file = parseEnvFile(readFileSync(ENV_PATH, "utf8"));
  const hostedZoneId = process.env.HOSTED_ZONE_ID || file.HOSTED_ZONE_ID;
  const publicIp = process.env.PUBLIC_IP || file.PUBLIC_IP;
  const appHost = process.env.APP_HOST || file.APP_HOST || "ride.bkcs.app";
  const apiHost = process.env.API_HOST || file.API_HOST || "api.ride.bkcs.app";
  const ttl = Number(process.env.TTL || file.TTL || 60);

  if (!hostedZoneId) throw new Error("HOSTED_ZONE_ID is required");
  if (!publicIp) throw new Error("PUBLIC_IP is required");

  const client = new Route53Client({ region: "us-east-1" });
  const appFqdn = fqdn(appHost);
  const apiFqdn = fqdn(apiHost);

  console.log(`==> Route53 zone ${hostedZoneId}`);
  console.log(`    ${appHost} -> ${publicIp}`);
  console.log(`    ${apiHost} -> ${publicIp}`);

  const result = await client.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Comment: "Ride platform A records (shared Lightsail)",
        Changes: [
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: appFqdn,
              Type: "A",
              TTL: ttl,
              ResourceRecords: [{ Value: publicIp }],
            },
          },
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: apiFqdn,
              Type: "A",
              TTL: ttl,
              ResourceRecords: [{ Value: publicIp }],
            },
          },
        ],
      },
    })
  );

  const changeId = result.ChangeInfo?.Id;
  const status = result.ChangeInfo?.Status;
  if (!changeId) throw new Error("No ChangeInfo.Id returned from Route53");
  console.log(`==> Change submitted: ${changeId} (status=${status})`);

  console.log("==> Waiting for INSYNC...");
  await waitInSync(client, changeId);
  console.log("    INSYNC");

  const meta = {
    hostedZoneId,
    publicIp,
    appHost,
    apiHost,
    ttl,
    changeId,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(META_PATH, `${JSON.stringify(meta, null, 2)}\n`, "utf8");

  // Keep dns.env authoritative with the values we applied
  writeFileSync(
    ENV_PATH,
    `# Ride platform DNS on bkcs.app (Route53)
HOSTED_ZONE_ID=${hostedZoneId}
REGION=us-east-1
PUBLIC_IP=${publicIp}
APP_HOST=${appHost}
API_HOST=${apiHost}
TTL=${ttl}

# After DNS + TLS on the shared host:
#   Web/admin: https://${appHost}
#   API:       https://${apiHost}
#
# GitHub Actions environment \`stage\` variables:
#   APP_HOST=${appHost}
#   API_HOST=${apiHost}
#   ANDROID_API_BASE_URL=https://${apiHost}/api/v1
#   VITE_ANDROID_MANIFEST_URL=https://rideplatform-downloads-313411897974.s3.ap-south-1.amazonaws.com/android/version.json
`,
    "utf8"
  );

  console.log("");
  console.log(`DNS ready (TTL=${ttl}s). Verify:`);
  console.log(`  nslookup ${appHost}`);
  console.log(`  nslookup ${apiHost}`);
  console.log(`Wrote ${ENV_PATH} and ${META_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
