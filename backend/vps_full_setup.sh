#!/bin/bash
# =============================================================================
# Campus Compass — Full VPS Setup Script (Run on NEW server as root)
# =============================================================================
#
# PURPOSE: Bootstrap a brand-new VPS with everything needed to run
#          Campus Compass. Run this ONCE on the new server.
#
# USAGE (from your Windows machine):
#   1. Copy this script to the new VPS:
#      scp backend/vps_full_setup.sh root@<NEW_VPS_IP>:/tmp/vps_full_setup.sh
#
#   2. SSH in and run it:
#      ssh root@<NEW_VPS_IP> "bash /tmp/vps_full_setup.sh"
#
# PREREQUISITES (do these before running):
#   - Point your domain A record → new VPS IP
#   - Have your secrets ready (JWT secret, MediaMTX publish password)
#
# WHAT THIS INSTALLS:
#   ✅ Node.js LTS
#   ✅ MediaMTX (RTSP/WebRTC relay server)
#   ✅ Nginx + Let's Encrypt SSL
#   ✅ campus-compass Node.js backend (systemd service)
#   ✅ Firewall rules (ufw)
#   ✅ GitHub Actions deploy key (for auto-deploy on git push)
# =============================================================================

set -e  # Exit on any error

# ─── CONFIGURE THESE BEFORE RUNNING ─────────────────────────────────────────
DOMAIN="thanganat25.com"              # ← Your domain (must point to this VPS)
EMAIL="admin@thanganat25.com"         # ← Email for Let's Encrypt cert notices
STREAM_JWT_SECRET=""                  # ← Generate with: openssl rand -hex 32
MEDIAMTX_PUBLISH_PASS=""             # ← Strong password for Pi → VPS stream
MEDIAMTX_VERSION="v1.17.0"            # ← MediaMTX version to install
NODE_VERSION="24"                          # ← Node.js LTS MAJOR version (nodesource uses major only)
BACKEND_DIR="/root/campus-compass-backend"
SERVICE_NAME="campus-compass"
# ─────────────────────────────────────────────────────────────────────────────

# ── Validate required secrets ─────────────────────────────────────────────────
if [[ -z "$STREAM_JWT_SECRET" || -z "$MEDIAMTX_PUBLISH_PASS" ]]; then
  echo "❌ ERROR: You must set STREAM_JWT_SECRET and MEDIAMTX_PUBLISH_PASS"
  echo ""
  echo "   Generate a JWT secret with:"
  echo "     openssl rand -hex 32"
  echo ""
  echo "   Then edit the top of this script and fill in both values."
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Campus Compass — VPS Bootstrap Setup                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Domain   : $DOMAIN"
echo "  Node.js  : v$NODE_VERSION LTS"
echo "  MediaMTX : $MEDIAMTX_VERSION"
echo ""

# ── 1. System packages ────────────────────────────────────────────────────────
echo "📦 [1/8] Updating system and installing dependencies..."
apt-get update -qq
apt-get install -y \
  curl wget git unzip \
  nginx certbot python3-certbot-nginx \
  ufw ffmpeg jq \
  2>/dev/null

# ── 2. Node.js ────────────────────────────────────────────────────────────────
echo "🟩 [2/8] Installing Node.js $NODE_VERSION LTS..."
INSTALLED_MAJOR=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v' || echo '0')
if [[ "$INSTALLED_MAJOR" != "$NODE_VERSION" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
fi
echo "   node $(node -v) | npm $(npm -v)"

# ── 3. MediaMTX ───────────────────────────────────────────────────────────────
echo "📡 [3/8] Installing MediaMTX $MEDIAMTX_VERSION..."
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  MTX_ARCH="amd64" ;;
  aarch64) MTX_ARCH="arm64" ;;
  armv7l)  MTX_ARCH="armv7" ;;
  *)        echo "❌ Unsupported arch: $ARCH"; exit 1 ;;
esac

MTX_URL="https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_${MTX_ARCH}.tar.gz"
wget -q "$MTX_URL" -O /tmp/mediamtx.tar.gz
tar -xzf /tmp/mediamtx.tar.gz -C /tmp
mv /tmp/mediamtx /usr/local/bin/mediamtx
chmod +x /usr/local/bin/mediamtx
rm /tmp/mediamtx.tar.gz
echo "   MediaMTX installed → $(mediamtx --version 2>&1 | head -1)"

# ── 4. Backend directory + files ──────────────────────────────────────────────
echo "📁 [4/8] Setting up backend directory at $BACKEND_DIR..."
mkdir -p "$BACKEND_DIR"

# Write MediaMTX config
cat > /etc/mediamtx.yml << MEDIAMTX_EOF
logLevel: info
rtspAddress: ":8554"
webrtcAddress: ":8189"
rtmpAddress: ""
hlsAddress: ""
srtAddress: ""
api: yes
apiAddress: "127.0.0.1:9997"
authMethod: http
authHTTPAddress: http://localhost:3001/stream-auth
authHTTPExclude:
  - action: publish
authInternalUsers:
  - user: pi
    pass: ${MEDIAMTX_PUBLISH_PASS}
    permissions:
      - action: publish
        path: live
      - action: publish
        path: live_bus-1
      - action: publish
        path: live_bus-2
      - action: publish
        path: live_bus-3
paths:
  live:
    source: publisher
  live_bus-1:
    source: publisher
  live_bus-2:
    source: publisher
  live_bus-3:
    source: publisher
MEDIAMTX_EOF

# Write MediaMTX systemd service
cat > /etc/systemd/system/mediamtx.service << 'SVC_EOF'
[Unit]
Description=MediaMTX RTSP/WebRTC Relay
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/mediamtx /etc/mediamtx.yml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC_EOF

# ── 5. Secrets env file ───────────────────────────────────────────────────────
echo "🔐 [5/8] Writing secrets to /etc/campus-compass.env..."
cat > /etc/campus-compass.env << ENV_EOF
# Campus Compass — VPS Secrets
# Generated by vps_full_setup.sh — DO NOT commit to git
STREAM_JWT_SECRET=${STREAM_JWT_SECRET}
MEDIAMTX_PUBLISH_PASS=${MEDIAMTX_PUBLISH_PASS}
VPS_DOMAIN=${DOMAIN}
ENV_EOF
chmod 600 /etc/campus-compass.env
echo "   Secrets written and locked (chmod 600)"

# ── 6. Nginx + SSL ────────────────────────────────────────────────────────────
echo "🌐 [6/8] Configuring Nginx + SSL for $DOMAIN..."

# Write initial HTTP-only config (needed for certbot challenge)
cat > /etc/nginx/sites-available/campus-compass << NGINX_EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/campus-compass /etc/nginx/sites-enabled/campus-compass
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx && systemctl restart nginx

# Obtain SSL cert (domain must point to this server)
echo "   Requesting Let's Encrypt cert for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" || {
  echo "   ⚠️  Certbot failed — DNS may not have propagated yet."
  echo "   Re-run: certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL"
}

# Write full HTTPS config with WebRTC proxy
cat > /etc/nginx/sites-available/campus-compass << NGINX_FULL_EOF
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;

server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

    # Backend API + stream-auth
    location / {
        limit_req zone=api burst=10 nodelay;
        proxy_pass          http://127.0.0.1:3001;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade \$http_upgrade;
        proxy_set_header    Connection 'upgrade';
        proxy_set_header    Host \$host;
        proxy_set_header    X-Real-IP \$remote_addr;
        proxy_set_header    X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
        proxy_cache_bypass  \$http_upgrade;
        proxy_read_timeout  60s;
    }

    # WebRTC WHEP endpoint — proxy directly to MediaMTX
    location ~ ^/stream/(.+)/whep$ {
        limit_req zone=api burst=5 nodelay;
        proxy_pass          http://127.0.0.1:8189;
        proxy_http_version  1.1;
        proxy_set_header    Host \$host;
        proxy_set_header    X-Real-IP \$remote_addr;
        proxy_set_header    X-Forwarded-Proto \$scheme;
        proxy_read_timeout  120s;
    }
}
NGINX_FULL_EOF

nginx -t && systemctl reload nginx

# Auto-renew SSL
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

# ── 7. Firewall ───────────────────────────────────────────────────────────────
echo "🛡  [7/8] Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS (Nginx → backend)
ufw allow 8554/tcp  # RTSP  (Pi → MediaMTX)
ufw allow 8554/udp  # RTSP  (UDP variant)
ufw allow 8189/udp  # WebRTC (ICE/STUN)
# Port 9997 (MediaMTX API) is intentionally NOT opened — localhost only
# Port 3001 (Node.js) is intentionally NOT opened — proxied via Nginx
ufw --force enable
ufw status verbose

# ── 8. GitHub Actions deploy key ─────────────────────────────────────────────
echo "🔑 [8/8] Setting up GitHub Actions deploy key..."
GH_KEY_FILE="/root/.ssh/github_actions_deploy"
mkdir -p /root/.ssh
chmod 700 /root/.ssh

if [[ ! -f "$GH_KEY_FILE" ]]; then
  ssh-keygen -t ed25519 -C "github-actions-deploy@campus-compass" -f "$GH_KEY_FILE" -N ""
  echo "   ✅ Deploy key generated at $GH_KEY_FILE"
else
  echo "   ℹ️  Deploy key already exists at $GH_KEY_FILE — skipping generation"
fi

# Allow this key to SSH into the VPS (used by GitHub Actions)
AUTH_KEYS="/root/.ssh/authorized_keys"
touch "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"
if ! grep -qF "$(cat ${GH_KEY_FILE}.pub)" "$AUTH_KEYS"; then
  cat "${GH_KEY_FILE}.pub" >> "$AUTH_KEYS"
  echo "   ✅ Public key added to authorized_keys"
fi

VPS_PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        📋 GitHub Secrets — Add These Now                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Go to: https://github.com/AnujKushwah15/campus-compass/settings/secrets/actions"
echo ""
echo "  Add the following repository secrets:"
echo ""
echo "  ┌─ Secret name: VPS_IP"
echo "  │  Value:"
echo "  │    $VPS_PUBLIC_IP"
echo "  └──────────────────────────────────────"
echo ""
echo "  ┌─ Secret name: VPS_SSH_KEY"
echo "  │  Value (private key — copy ENTIRE block including header/footer):"
echo "  │"
cat "$GH_KEY_FILE" | sed 's/^/  │  /'
echo "  └──────────────────────────────────────"
echo ""
echo "  After adding secrets, any push to main/anuj that touches"
echo "  backend/** will automatically deploy to this VPS."
echo ""

# ── Start services ────────────────────────────────────────────────────────────
echo "🚀 Enabling and starting services..."
systemctl daemon-reload
systemctl enable mediamtx
systemctl start mediamtx
# (campus-compass service starts after the first GitHub Actions deploy or switch_server.sh)

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ✅ VPS Setup Complete!                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Services running:"
echo "    • mediamtx  $(systemctl is-active mediamtx)"
echo "    • nginx     $(systemctl is-active nginx)"
echo ""
echo "  📋 NEXT STEPS:"
echo "  1. ↑ Copy VPS_IP and VPS_SSH_KEY printed above into GitHub Secrets:"
echo "     https://github.com/AnujKushwah15/campus-compass/settings/secrets/actions"
echo ""
echo "  2. From Windows, run:  bash backend/switch_server.sh"
echo "     (first deploy — after this, GitHub Actions handles all future deploys)"
echo ""
echo "  3. Update Pi /etc/campus-compass.env with new VPS_IP:"
VPS_FINAL_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "     VPS_IP=$VPS_FINAL_IP"
echo "     RTMP_PASS=${MEDIAMTX_PUBLISH_PASS}"
echo ""
echo "  4. Restart camstream on the Pi:"
echo "     sudo systemctl restart camstream"

