#!/usr/bin/env bash
# Start pm2 using the repo pm2.config.js, wait until server is responsive, then stop pm2.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# start pm2 using npm script (if available) or call pm2 directly
if command -v npm >/dev/null 2>&1; then
  npm run pm2:start || true
else
  pm2 start pm2.config.js --env production --update-env || true
fi
# wait for server
for i in {1..15}; do
  if curl -sSf http://localhost:5000/ >/dev/null 2>&1; then
    echo "server up"
    break
  fi
  sleep 1
done
# basic health endpoints
curl -sSf http://localhost:5000/api/players || true
curl -sSf http://localhost:5000/api/shop/items || true
# stop pm2 process
if command -v npm >/dev/null 2>&1; then
  npm run pm2:stop || true
else
  pm2 stop deathwatch-server || true
fi
exit 0
