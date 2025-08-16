#!/usr/bin/env bash
set -euo pipefail

# Local CI/CD helper script
# Usage:
#   ./scripts/local-ci.sh          # run install, unit tests, integration tests, build
#   ./scripts/local-ci.sh --deploy # run above then reload pm2 (calls npm run pm2:reload)

echo "[local-ci] Starting local CI run"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[local-ci] Running npm ci to ensure deterministic install"
if npm ci; then
  echo "[local-ci] npm ci succeeded"
else
  echo "[local-ci] npm ci failed — falling back to npm install (local dev mode)"
  npm install
fi

echo "[local-ci] Running unit tests"
npm run test:unit --silent

echo "[local-ci] Running integration tests (this will start/stop PM2 as configured)"
# test:integration starts pm2, runs tests, and stops pm2
npm run test:integration --silent

echo "[local-ci] Building production bundle"
npm run build --silent

if [ "${1:-}" = "--deploy" ]; then
  echo "[local-ci] Deploy flag detected: reloading PM2"
  npm run pm2:reload || (echo "[local-ci] npm run pm2:reload failed, attempting pm2 reload directly" && pm2 reload database/pm2.config.js || true)
fi

echo "[local-ci] Finished successfully"
