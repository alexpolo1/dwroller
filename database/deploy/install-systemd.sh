#!/usr/bin/env bash
set -euo pipefail

# Usage: ./install-systemd.sh /absolute/path/to/repo username
# Example: ./install-systemd.sh /home/alex/git/dwroller alex

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /absolute/path/to/repo username"
  exit 2
fi

REPO_DIR=$1
RUN_AS_USER=$2
SERVICE_NAME=deathwatch-server
TEMPLATE=${REPO_DIR}/database/deploy/deathwatch.service.template
TARGET=/etc/systemd/system/${SERVICE_NAME}.service
ENV_FILE=/etc/default/${SERVICE_NAME}

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root or with sudo"
  exit 3
fi

if [ ! -f "$TEMPLATE" ]; then
  echo "Template not found: $TEMPLATE"
  exit 4
fi

# Replace placeholders
sed "s|{{REPO_DIR}}|${REPO_DIR}|g; s|{{RUN_AS_USER}}|${RUN_AS_USER}|g" "$TEMPLATE" > "$TARGET"

# Create an environment file with defaults if not present
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
# deathwatch-server env defaults
PORT=5000
NODE_ENV=production
# You can add other environment variables here, e.g.:
# DATABASE_FILE=/home/you/deathwatch.sqlite
EOF
  chown root:root "$ENV_FILE"
  chmod 0644 "$ENV_FILE"
fi

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}

echo "Service ${SERVICE_NAME} installed and (re)started. Use: systemctl status ${SERVICE_NAME}"
