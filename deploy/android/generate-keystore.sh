#!/usr/bin/env bash
# Generate an Android upload keystore for CI / Play / sideload releases.
# Usage (from repo root, Git Bash or WSL):
#   bash deploy/android/generate-keystore.sh
set -euo pipefail

OUT_DIR="${1:-deploy/android/secrets}"
mkdir -p "$OUT_DIR"
KEYSTORE="$OUT_DIR/upload-keystore.jks"
ALIAS="${KEY_ALIAS:-upload}"

if [[ -f "$KEYSTORE" ]]; then
  echo "Already exists: $KEYSTORE"
  exit 1
fi

keytool -genkey -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storetype JKS

echo ""
echo "Next:"
echo "1) Base64-encode for GitHub secret ANDROID_KEYSTORE_BASE64:"
echo "   base64 -w0 \"$KEYSTORE\"   # Linux"
echo "   base64 -i \"$KEYSTORE\" | tr -d '\\n'   # macOS"
echo "2) Set secrets: ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS=$ALIAS, ANDROID_KEY_PASSWORD"
echo "3) Keep $KEYSTORE offline — never commit it."
