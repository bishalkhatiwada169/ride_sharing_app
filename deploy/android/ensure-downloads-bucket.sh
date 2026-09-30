#!/usr/bin/env bash
# Thin wrapper — prefers the AWS SDK (Node) provisioner.
# Usage: bash deploy/android/ensure-downloads-bucket.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -d node_modules/@aws-sdk/client-s3 ]]; then
  npm install
fi

npm run ensure-bucket
