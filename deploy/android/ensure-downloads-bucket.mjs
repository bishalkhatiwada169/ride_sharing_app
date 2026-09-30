#!/usr/bin/env node
/**
 * Provision (or re-apply) the public Android APK downloads S3 bucket via AWS SDK.
 *
 * Usage (from repo root or this folder):
 *   cd deploy/android && npm install && npm run ensure-bucket
 *
 * Reads/writes bucket.env in this directory. If BUCKET contains CHANGE_ME,
 * creates rideplatform-downloads-<accountId> (same pattern as Dr. Saathi).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CreateBucketCommand,
  GetBucketLocationCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutBucketTaggingCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, "bucket.env");
const DEFAULT_REGION = "ap-south-1";
const DEFAULT_PREFIX = "android";

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

function renderEnvFile({
  bucket,
  region,
  prefix,
  publicBaseUrl,
  manifestUrl,
  latestApkUrl,
}) {
  return `# Ride Android downloads bucket (provisioned by ensure-downloads-bucket.mjs)
BUCKET=${bucket}
REGION=${region}
PREFIX=${prefix}
PUBLIC_BASE_URL=${publicBaseUrl}
MANIFEST_URL=${manifestUrl}
LATEST_APK_URL=${latestApkUrl}

# Set these as GitHub Actions environment \`stage\` variables:
#   ANDROID_S3_BUCKET=${bucket}
#   ANDROID_S3_PREFIX=${prefix}
#   ANDROID_PUBLIC_BASE_URL=${publicBaseUrl}
#   ANDROID_API_BASE_URL=https://api.ride.bkcs.app/api/v1
#
# Admin web (Vite) variable for the downloads page:
#   VITE_ANDROID_MANIFEST_URL=${manifestUrl}
`;
}

async function bucketExists(client, bucket) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    const name = err?.name ?? "";
    if (status === 404 || name === "NotFound" || name === "NoSuchBucket") {
      return false;
    }
    // Wrong region / access denied still means the name is taken or exists elsewhere.
    if (status === 301 || status === 403) {
      return true;
    }
    throw err;
  }
}

async function main() {
  const existing = parseEnvFile(readFileSync(ENV_PATH, "utf8"));
  const region = existing.REGION || DEFAULT_REGION;
  const prefix = (existing.PREFIX || DEFAULT_PREFIX).replace(/^\/+|\/+$/g, "");

  const sts = new STSClient({ region });
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  const accountId = identity.Account;
  if (!accountId) {
    throw new Error("STS GetCallerIdentity returned no Account");
  }

  let bucket = existing.BUCKET || "";
  if (!bucket || bucket.includes("CHANGE_ME")) {
    bucket = `rideplatform-downloads-${accountId}`;
  }

  const publicBaseUrl = `https://${bucket}.s3.${region}.amazonaws.com`;
  const manifestUrl = `${publicBaseUrl}/${prefix}/version.json`;
  const latestApkUrl = `${publicBaseUrl}/${prefix}/ride-latest.apk`;

  const s3 = new S3Client({ region });

  const exists = await bucketExists(s3, bucket);
  if (!exists) {
    const input = { Bucket: bucket };
    if (region !== "us-east-1") {
      input.CreateBucketConfiguration = { LocationConstraint: region };
    }
    await s3.send(new CreateBucketCommand(input));
    console.log(`Created bucket s3://${bucket} (${region})`);
  } else {
    console.log(`Bucket already exists: s3://${bucket}`);
    try {
      const loc = await s3.send(new GetBucketLocationCommand({ Bucket: bucket }));
      const locConstraint = loc.LocationConstraint || "us-east-1";
      if (locConstraint !== region && !(locConstraint === "" && region === "us-east-1")) {
        console.warn(
          `Warning: bucket location is "${locConstraint || "us-east-1"}" but REGION=${region}`
        );
      }
    } catch {
      // ignore location probe failures
    }
  }

  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    })
  );

  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadAndroidPrefix",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucket}/${prefix}/*`,
      },
    ],
  };
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    })
  );

  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [
              "https://ride.bkcs.app",
              "http://localhost:5173",
              "http://127.0.0.1:5173",
              "http://localhost:8080",
              "http://127.0.0.1:8080",
            ],
            AllowedMethods: ["GET", "HEAD"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    })
  );

  await s3.send(
    new PutBucketTaggingCommand({
      Bucket: bucket,
      Tagging: {
        TagSet: [
          { Key: "Project", Value: "ride-platform" },
          { Key: "Purpose", Value: "android-apk-distribution" },
        ],
      },
    })
  );

  writeFileSync(
    ENV_PATH,
    renderEnvFile({
      bucket,
      region,
      prefix,
      publicBaseUrl,
      manifestUrl,
      latestApkUrl,
    }),
    "utf8"
  );

  console.log("");
  console.log(`Bucket ready: ${publicBaseUrl}/${prefix}/`);
  console.log(`Manifest:     ${manifestUrl}`);
  console.log(`Latest APK:   ${latestApkUrl}`);
  console.log(`Wrote ${ENV_PATH}`);
  console.log("");
  console.log("GitHub Actions environment `stage` variables:");
  console.log(`  ANDROID_S3_BUCKET=${bucket}`);
  console.log(`  ANDROID_S3_PREFIX=${prefix}`);
  console.log(`  ANDROID_PUBLIC_BASE_URL=${publicBaseUrl}`);
  console.log(`  ANDROID_API_BASE_URL=<your API base>/api/v1`);
  console.log("");
  console.log("Admin web:");
  console.log(`  VITE_ANDROID_MANIFEST_URL=${manifestUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
