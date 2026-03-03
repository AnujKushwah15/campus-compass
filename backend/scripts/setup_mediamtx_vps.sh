#!/usr/bin/env bash
# ============================================================================
# Campus Compass — MediaMTX VPS Setup / Reinstall Script
# ============================================================================
# Run as root on the VPS:
#   bash setup_mediamtx_vps.sh
#
# What this script does:
#   1. Stops and removes any existing MediaMTX installation
#   2. Downloads the latest stable MediaMTX release (arm64 / amd64 auto-detected)
#   3. Installs the binary to /usr/local/bin/mediamtx
#   4. Writes the project mediamtx.yml to /opt/mediamtx_dir/
#   5. Installs and enables the systemd service
#   6. Verifies the service is running and the API is reachable
# ============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
MEDIAMTX_VERSION="1.9.1"          # Bump this when upgrading
INSTALL_DIR="/opt/mediamtx_dir"
BINARY="/usr/local/bin/mediamtx"
SERVICE_FILE="/etc/systemd/system/mediamtx.service"

# ── Detect arch ───────────────────────────────────────────────────────────────
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  MEDIAMTX_ARCH="linux_amd64" ;;
  aarch64) MEDIAMTX_ARCH="linux_arm64v8" ;;
  armv7l)  MEDIAMTX_ARCH="linux_armv7" ;;
  *)       echo "❌ Unsupported arch: $ARCH"; exit 1 ;;
esac

DOWNLOAD_URL="https://github.com/bluenviron/mediamtx/releases/download/v${MEDIAMTX_VERSION}/mediamtx_v${MEDIAMTX_VERSION}_${MEDIAMTX_ARCH}.tar.gz"

# ── Step 1: Stop and remove existing installation ────────────────────────────
echo "🛑 Stopping existing MediaMTX service (if any)..."
systemctl stop mediamtx 2>/dev/null || true
systemctl disable mediamtx 2>/dev/null || true

echo "🗑  Removing old binary and service..."
rm -f "$BINARY"
rm -f "$SERVICE_FILE"

# ── Step 2: Download MediaMTX ─────────────────────────────────────────────────
echo ""
echo "📥 Downloading MediaMTX v${MEDIAMTX_VERSION} (${MEDIAMTX_ARCH})..."
echo "   URL: $DOWNLOAD_URL"

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

wget -q --show-progress -O "$TMPDIR/mediamtx.tar.gz" "$DOWNLOAD_URL"

echo "📦 Extracting..."
tar -xzf "$TMPDIR/mediamtx.tar.gz" -C "$TMPDIR"

# ── Step 3: Install binary ────────────────────────────────────────────────────
echo "🔧 Installing binary to $BINARY..."
cp "$TMPDIR/mediamtx" "$BINARY"
chmod +x "$BINARY"

echo "✅ MediaMTX version installed:"
"$BINARY" --version

# ── Step 4: Write config ──────────────────────────────────────────────────────
echo ""
echo "📝 Writing mediamtx.yml to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

cat > "$INSTALL_DIR/mediamtx.yml" << 'YAML_EOF'
# Campus Compass — MediaMTX Configuration
# =========================================
# Architecture:
#   Publishers : Pi → MediaMTX (RTSP publish, internal credentials)
#   Viewers    : Client → Backend → MediaMTX (JWT token via /stream-auth)
#   Monitoring : Backend → MediaMTX API (Basic Auth via apiUser/apiPass)

logLevel: info

# Protocol Addresses
rtspAddress: ":8554"
webrtcAddress: ":8889"

# Disabled protocols (not used in this project)
rtmpAddress: ""
hlsAddress: ""
srtAddress: ""

# Management API
api: yes
apiAddress: ":9997"
# Backend uses these credentials to poll /v3/paths/list
apiUser: campus-compass-api
apiPassword: ApiMonitorPass456

# Authentication
# Publishers  : internal credentials (authInternalUsers below)
# Viewers     : HTTP webhook → backend /stream-auth
authMethod: http
authHTTPAddress: http://localhost:3001/stream-auth
authHTTPExclude:
  # Pi publishers use internal credentials — skip HTTP webhook for them
  - action: publish

authInternalUsers:
  - user: pi
    pass: StrongPublishPass123
    permissions:
      - action: publish
        path: live
      - action: publish
        path: live_bus-1
      - action: publish
        path: live_bus-2
      - action: publish
        path: live_bus-3

# Stream Paths
paths:
  live:
    source: publisher
  live_bus-1:
    source: publisher
  live_bus-2:
    source: publisher
  live_bus-3:
    source: publisher
YAML_EOF

echo "✅ Config written."

# ── Step 5: Install systemd service ──────────────────────────────────────────
echo ""
echo "⚙️  Installing systemd service..."

cat > "$SERVICE_FILE" << 'SERVICE_EOF'
[Unit]
Description=MediaMTX RTSP/WebRTC Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/mediamtx /opt/mediamtx_dir/mediamtx.yml
Restart=always
RestartSec=5
StartLimitIntervalSec=0

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable mediamtx
systemctl start mediamtx

# ── Step 6: Verify ───────────────────────────────────────────────────────────
echo ""
echo "⏳ Waiting for MediaMTX to start..."
sleep 3

echo ""
echo "📊 Service status:"
systemctl status mediamtx --no-pager -l

echo ""
echo "🔌 Testing API (unauthenticated — should return auth error):"
curl -s http://127.0.0.1:9997/v3/paths/list && echo ""

echo ""
echo "🔌 Testing API (authenticated — should return JSON):"
curl -s -u campus-compass-api:ApiMonitorPass456 http://127.0.0.1:9997/v3/paths/list && echo ""

echo ""
echo "✅ MediaMTX reinstall complete!"
echo "   RTSP  → :8554"
echo "   WebRTC→ :8889"
echo "   API   → :9997 (user: campus-compass-api)"
