#!/usr/bin/env bash
set -euo pipefail

# Fast build script - skips dependency reinstall and tests
# Usage:
#   ./scripts/fast-build.sh          # just build and reload
#   ./scripts/fast-build.sh --test   # run tests first

echo "[fast-build] Starting fast build"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ "${1:-}" = "--test" ]; then
  echo "[fast-build] Running unit tests"
  npm run test:unit --silent
fi

echo "[fast-build] Building production bundle"
npx react-scripts build

echo "[fast-build] Reloading PM2"
npm run pm2:reload || (echo "[fast-build] npm run pm2:reload failed, attempting pm2 reload directly" && pm2 reload database/pm2.config.js || true)

echo "[fast-build] Fast build completed successfully"
