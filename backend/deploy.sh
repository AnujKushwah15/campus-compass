#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Campus Compass — VPS Deploy Script
#
# Usage (from your Windows machine using WSL or Git Bash):
#   bash backend/deploy.sh
#
# Or from PowerShell (one-liner):
#   scp backend/index.js backend/campus-compass.service root@72.61.250.73:/tmp/cc_deploy && ssh root@72.61.250.73 "bash /tmp/cc_deploy/deploy.sh"
#
# What this does:
#   1. Copies index.js to /root/campus-compass-backend/
#   2. Copies campus-compass.service to /etc/systemd/system/
#   3. Reloads systemd and restarts the service
#   4. Tails the last 20 log lines to confirm it started OK
# ─────────────────────────────────────────────────────────────────────────────

set -e

VPS="root@72.61.250.73"
BACKEND_DIR="/root/campus-compass-backend"
SERVICE_NAME="campus-compass"

echo "📦 Copying backend files to VPS..."
scp backend/index.js "${VPS}:${BACKEND_DIR}/index.js"
scp backend/campus-compass.service "${VPS}:/etc/systemd/system/${SERVICE_NAME}.service"

echo "🔄 Reloading systemd and restarting service..."
ssh "${VPS}" "
  sudo systemctl daemon-reload
  sudo systemctl enable ${SERVICE_NAME}
  sudo systemctl restart ${SERVICE_NAME}
  sleep 2
  echo ''
  echo '── Service Status ──────────────────────────────'
  sudo systemctl status ${SERVICE_NAME} --no-pager -l
  echo ''
  echo '── Last 20 log lines ───────────────────────────'
  sudo journalctl -u ${SERVICE_NAME} -n 20 --no-pager
"

echo ""
echo "✅ Deploy complete!"
echo "   Health check: curl http://72.61.250.73:3001/health"
