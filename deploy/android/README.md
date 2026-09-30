# Android APK distribution (GitHub Actions → S3 → admin downloads page)

Ride publishes a sideloadable Android APK from CI. Testers open the admin
**App downloads** page (also linked from the login screen), download the APK,
and install it (allow “unknown apps” for the browser).

## Pipeline

1. Workflow: `.github/workflows/publish-android-apk.yml`
2. Builds the unified React Native app (`apps/passenger-mobile`) release APK
3. Uploads to S3:
   - `android/ride-latest.apk`
   - `android/ride-<version>+<code>.apk`
   - `android/version.json`
4. Admin web reads `VITE_ANDROID_MANIFEST_URL` (`version.json`) and opens `apkUrl`

## One-time AWS setup

Uses the **AWS SDK for JavaScript (v3)** — no AWS CLI required for provisioning.

```powershell
cd deploy/android
npm install
npm run ensure-bucket
```

This creates (or re-applies) `rideplatform-downloads-<accountId>` with public read on
`android/*`, CORS, and tags, then writes the real URLs into `bucket.env`.

The project downloads bucket is already provisioned:

| | |
|--|--|
| Bucket | `rideplatform-downloads-313411897974` |
| Region | `ap-south-1` |
| Public base | `https://rideplatform-downloads-313411897974.s3.ap-south-1.amazonaws.com` |
| Manifest | `.../android/version.json` |

Config file: `deploy/android/bucket.env`  
Re-apply policy anytime: `npm run ensure-bucket` (from `deploy/android`).

Copy the printed values into GitHub Actions environment **stage**.

### GitHub Actions (`environment: stage`) variables

```
ANDROID_S3_BUCKET=rideplatform-downloads-313411897974
ANDROID_S3_PREFIX=android
ANDROID_PUBLIC_BASE_URL=https://rideplatform-downloads-313411897974.s3.ap-south-1.amazonaws.com
ANDROID_API_BASE_URL=https://api.ride.bkcs.app/api/v1
```

### Secrets

| Secret | Purpose |
|--------|---------|
| `ANDROID_KEYSTORE_BASE64` | Base64 of `upload-keystore.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (e.g. `upload`) |
| `ANDROID_KEY_PASSWORD` | Key password |
| `AWS_ACCESS_KEY_ID` | IAM user that can `s3:PutObject` on the bucket |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Optional Maps key baked into the Android manifest |

### Admin web

Set in `apps/admin-web/.env` (or the host env used for Vite build):

```
VITE_ANDROID_MANIFEST_URL=https://rideplatform-downloads-313411897974.s3.ap-south-1.amazonaws.com/android/version.json
```

## Generate a keystore

```bash
bash deploy/android/generate-keystore.sh
# then base64 the .jks into ANDROID_KEYSTORE_BASE64
```

Never commit the `.jks` or passwords.

## Run a publish

GitHub → Actions → **Publish Android APK** → Run workflow.

- First smoke test without a keystore: check **use_debug_signing** (debug-signed APK; not for end users).
- Production: leave that unchecked (requires signing secrets).
- Or push a tag: `android-v1.0.0`

## Bump version

Edit `apps/passenger-mobile/package.json` `version` and/or
`android/app/build.gradle` `versionCode` before publishing, or pass
`version_name` / `version_code` workflow inputs.

## Google Play Protect

Sideloaded APKs are often blocked on real devices. Prefer Play Internal testing
for lasting installs; for testers, use “Install anyway” / temporarily disable
Play Protect scan during install.
