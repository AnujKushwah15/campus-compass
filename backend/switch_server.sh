#!/bin/bash
# =============================================================================
# Campus Compass — Switch Server Script (Run from Windows/WSL/Git Bash)
# =============================================================================
#
# PURPOSE: Migrate Campus Compass to a new VPS in one command.
#          Assumes vps_full_setup.sh has already been run on the new server.
#
# USAGE:
#   bash backend/switch_server.sh
#
# WHAT THIS DOES:
#   1. Updates .env.local with new VPS IP + domain
#   2. Copies backend files (index.js, service file, mediamtx config)
#   3. Installs Node.js dependencies on the new VPS
#   4. Starts the campus-compass systemd service
#   5. Runs a health check
#   6. Prints Pi reconfiguration instructions
# =============================================================================

set -e

# ─── PROMPT FOR CREDENTIALS ──────────────────────────────────────────────────
read -rp "  New VPS IP address       : " NEW_VPS_IP
read -rp "  New domain (e.g. foo.com): " NEW_DOMAIN
read -rp "  SSH user [root]          : " SSH_USER
SSH_USER="${SSH_USER:-root}"
echo ""
# ─────────────────────────────────────────────────────────────────────────────

OLD_VPS_IP=$(grep -oP 'VPS="\K[^"]+' backend/deploy.sh 2>/dev/null | grep -oP '\d+\.\d+\.\d+\.\d+' || echo "unknown")
BACKEND_DIR="/root/campus-compass-backend"
SERVICE_NAME="campus-compass"
VPS="${SSH_USER}@${NEW_VPS_IP}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Campus Compass — Server Switch                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Old VPS  : $OLD_VPS_IP"
echo "  New VPS  : $NEW_VPS_IP  ($NEW_DOMAIN)"
echo "  SSH      : $VPS"
echo ""
read -rp "  ⚠️  Proceed with migration? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
echo ""

# ── Step 1: Update .env.local ─────────────────────────────────────────────────
echo "📝 [1/5] Updating .env.local..."
if [[ -f ".env.local" ]]; then
  # Update existing entries
  if grep -q "NEXT_PUBLIC_BACKEND_URL" .env.local; then
    sed -i "s|NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=https://${NEW_DOMAIN}|g" .env.local
  else
    echo "NEXT_PUBLIC_BACKEND_URL=https://${NEW_DOMAIN}" >> .env.local
  fi

  if grep -q "NEXT_PUBLIC_VPS_DOMAIN" .env.local; then
    sed -i "s|NEXT_PUBLIC_VPS_DOMAIN=.*|NEXT_PUBLIC_VPS_DOMAIN=${NEW_DOMAIN}|g" .env.local
  else
    echo "NEXT_PUBLIC_VPS_DOMAIN=${NEW_DOMAIN}" >> .env.local
  fi

  echo "   ✅ .env.local updated to point to: $NEW_DOMAIN"
else
  echo "   ⚠️  .env.local not found — creating from .env.example"
  cp .env.example .env.local
  echo "NEXT_PUBLIC_BACKEND_URL=https://${NEW_DOMAIN}" >> .env.local
  echo "NEXT_PUBLIC_VPS_DOMAIN=${NEW_DOMAIN}" >> .env.local
  echo "   ⚠️  Fill in the Firebase keys in .env.local before deploying the frontend!"
fi

# ── Step 2: Update deploy.sh with new VPS IP ──────────────────────────────────
echo "📝 Updating deploy.sh with new VPS IP..."
sed -i "s|VPS=\"root@[^\"]*\"|VPS=\"${SSH_USER}@${NEW_VPS_IP}\"|g" backend/deploy.sh
sed -i "s|Health check: curl http://[^\"]*|Health check: curl http://${NEW_VPS_IP}:3001/health|g" backend/deploy.sh

# ── Step 3: Update nginx.conf with new domain ─────────────────────────────────
echo "📝 Updating backend/nginx.conf with new domain..."
sed -i "s|thanganat25\.com|${NEW_DOMAIN}|g" backend/nginx.conf

# ── Step 4: Update campus-compass.service with new IP ─────────────────────────
echo "📝 Updating campus-compass.service..."
sed -i "s|VPS_IP=[0-9.]*|VPS_IP=${NEW_VPS_IP}|g" backend/campus-compass.service

# ── Step 5: Deploy backend to new VPS ─────────────────────────────────────────
echo ""
echo "🚀 [2/5] Copying backend files to new VPS ($VPS)..."
ssh "$VPS" "mkdir -p $BACKEND_DIR"

scp backend/index.js                 "${VPS}:${BACKEND_DIR}/index.js"
scp backend/package.json             "${VPS}:${BACKEND_DIR}/package.json"
scp backend/campus-compass.service   "${VPS}:/etc/systemd/system/${SERVICE_NAME}.service"
scp backend/mediamtx.yml             "${VPS}:/tmp/mediamtx_update.yml"

echo "   ✅ Files copied"

# ── Step 6: Install dependencies + start service ──────────────────────────────
echo ""
echo "📦 [3/5] Installing Node.js dependencies on VPS..."
ssh "$VPS" "
  cd $BACKEND_DIR
  npm install --omit=dev --silent
  echo '   node_modules installed'

  # Apply mediamtx config update if domain changed
  if [[ -f /tmp/mediamtx_update.yml ]]; then
    mv /tmp/mediamtx_update.yml /etc/mediamtx.yml
    systemctl restart mediamtx 2>/dev/null || true
    echo '   MediaMTX config updated'
  fi

  # Start/restart the campus-compass backend
  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}
  systemctl restart ${SERVICE_NAME}
  sleep 2

  echo ''
  echo '── Service Status ──────────────────────────────'
  systemctl status ${SERVICE_NAME} --no-pager -l | head -20
"

# ── Step 7: Health check ──────────────────────────────────────────────────────
echo ""
echo "🏥 [4/5] Running health checks..."
sleep 3

# Check Node.js backend directly
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${NEW_VPS_IP}:3001/health" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "   ✅ Backend health (port 3001): HTTP $HTTP_CODE"
else
  echo "   ⚠️  Backend health (port 3001): HTTP $HTTP_CODE — service may still be starting"
fi

# Check HTTPS endpoint (only if domain is live)
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${NEW_DOMAIN}/api/health" --connect-timeout 5 2>/dev/null || echo "000")
if [[ "$HTTPS_CODE" == "200" ]]; then
  echo "   ✅ HTTPS endpoint (${NEW_DOMAIN}): HTTP $HTTPS_CODE"
elif [[ "$HTTPS_CODE" == "000" ]]; then
  echo "   ⏳ HTTPS endpoint: No response — DNS may still be propagating"
else
  echo "   ⚠️  HTTPS endpoint: HTTP $HTTPS_CODE"
fi

# Check MediaMTX
MTX_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${NEW_VPS_IP}:9997/v3/paths/list" --connect-timeout 5 2>/dev/null || echo "000")
if [[ "$MTX_CODE" == "200" ]]; then
  echo "   ✅ MediaMTX API (port 9997): HTTP $MTX_CODE"
else
  echo "   ⚠️  MediaMTX API (port 9997): HTTP $MTX_CODE — check firewall; port should only be accessible locally"
fi

# ── Step 8: Summary + Pi instructions ─────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ✅ Server Switch Complete!                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  New VPS  : https://${NEW_DOMAIN}"
echo "  Backend  : http://${NEW_VPS_IP}:3001"
echo ""
echo "  📋 REMAINING MANUAL STEPS:"
echo ""
echo "  1. ── Redeploy the Next.js frontend ─────────────────────────"
echo "     The frontend now targets: https://${NEW_DOMAIN}"
echo "     Push to git / Vercel will auto-redeploy, OR run:"
echo "       vercel --prod"
echo ""
echo "  2. ── Update each Pi ────────────────────────────────────────"
echo "     SSH into each Raspberry Pi and update /etc/campus-compass.env:"
echo ""
echo "       sudo nano /etc/campus-compass.env"
echo "       # Change: VPS_IP=${NEW_VPS_IP}"
echo "       sudo systemctl restart camstream"
echo ""
echo "  3. ── Verify the stream ─────────────────────────────────────"
echo "     Open the dashboard and check the live video feed."
echo "     Or run: bash debug/check_vps.sh"
echo ""
echo "  4. ── (Optional) Decommission old VPS ──────────────────────"
echo "     Snapshot it first, then terminate it in your cloud console."
