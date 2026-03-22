#!/bin/bash
# Phase 0 — VPS Environment Verification Script
# Run on VPS via: ssh vps 'bash -s' < testing/phase0_verify_vps.sh
# Output is structured for log parsing

PASS=0
FAIL=0
WARN=0
LOG=""

check() {
  local label="$1"
  local result="$2"
  local expected="$3"
  if echo "$result" | grep -q "$expected"; then
    echo "[PASS] $label"
    PASS=$((PASS+1))
  else
    echo "[FAIL] $label — got: $result"
    FAIL=$((FAIL+1))
  fi
}

warn() {
  echo "[WARN] $1"
  WARN=$((WARN+1))
}

echo "============================================"
echo " PHASE 0 — VPS ENVIRONMENT VERIFICATION"
echo " $(date)"
echo "============================================"
echo ""

# --- 1. Campus Compass backend service ---
echo "## 1. Backend Service (campus-compass.service)"
SVC=$(systemctl is-active campus-compass.service 2>/dev/null)
check "campus-compass.service is active" "$SVC" "active"

# --- 2. MediaMTX service ---
echo ""
echo "## 2. MediaMTX Service"
MTX=$(systemctl is-active mediamtx.service 2>/dev/null || systemctl is-active mediamtx 2>/dev/null)
check "mediamtx service is active" "$MTX" "active"

# --- 3. Nginx service ---
echo ""
echo "## 3. Nginx"
NGX=$(systemctl is-active nginx 2>/dev/null)
check "nginx is active" "$NGX" "active"

# --- 4. Backend health endpoint ---
echo ""
echo "## 4. Backend Health API (localhost:3001)"
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
check "health endpoint responds" "$HEALTH" '"status":"ok"'

# --- 5. MediaMTX API (local, port 9997) ---
echo ""
echo "## 5. MediaMTX API (localhost:9997)"
MTX_API=$(curl -s http://127.0.0.1:9997/v3/paths/list 2>/dev/null || curl -s http://127.0.0.1:9997/v2/paths/list 2>/dev/null)
check "MediaMTX API responds" "$MTX_API" "items"

# Active stream paths
echo "   Active paths:"
echo "$MTX_API" | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"//'

# --- 6. SSL certificate for domain ---
echo ""
echo "## 6. SSL Certificate (thanganat25.com)"
SSL=$(echo | openssl s_client -connect thanganat25.com:443 -servername thanganat25.com 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ -n "$SSL" ]; then
  echo "[PASS] SSL certificate present"
  echo "   $SSL"
  PASS=$((PASS+1))
else
  echo "[FAIL] SSL certificate check failed"
  FAIL=$((FAIL+1))
fi

# --- 7. Firewall ports ---
echo ""
echo "## 7. Firewall / Open Ports"
if command -v ufw >/dev/null 2>&1; then
  echo "   UFW status:"
  ufw status numbered 2>/dev/null | head -20
fi

# Check if 9997 is reachable from outside (it should NOT be)
PORT_9997=$(ss -tlnp 2>/dev/null | grep ':9997')
if echo "$PORT_9997" | grep -q "127.0.0.1"; then
  echo "[PASS] Port 9997 (MediaMTX API) bound to localhost only — not exposed"
  PASS=$((PASS+1))
elif [ -z "$PORT_9997" ]; then
  echo "[WARN] Port 9997 not listening at all — MediaMTX may be down"
  WARN=$((WARN+1))
else
  echo "[FAIL] Port 9997 may be exposed publicly: $PORT_9997"
  FAIL=$((FAIL+1))
fi

# --- 8. Env variables in campus-compass.env ---
echo ""
echo "## 8. Environment Variables (/etc/campus-compass.env)"
ENV_FILE="/etc/campus-compass.env"
if [ -f "$ENV_FILE" ]; then
  echo "[PASS] $ENV_FILE exists"
  PASS=$((PASS+1))
  # Check for required keys (not values)
  for KEY in STREAM_JWT_SECRET MEDIAMTX_PUBLISH_PASS VPS_DOMAIN; do
    if grep -q "^${KEY}=" "$ENV_FILE" 2>/dev/null; then
      echo "[PASS]   $KEY is set"
      PASS=$((PASS+1))
    else
      echo "[FAIL]   $KEY is MISSING from $ENV_FILE"
      FAIL=$((FAIL+1))
    fi
  done
else
  echo "[FAIL] $ENV_FILE not found"
  FAIL=$((FAIL+1))
fi

# --- Summary ---
echo ""
echo "============================================"
echo " PHASE 0 VPS SUMMARY"
echo "   PASS: $PASS"
echo "   FAIL: $FAIL"
echo "   WARN: $WARN"
echo "============================================"
