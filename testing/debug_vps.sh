#!/bin/bash
# Campus Compass - VPS Debugging Script
# Usage from local: ssh vps 'bash -s' < testing/debug_vps.sh

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  local result="$2"
  local expected="$3"
  if echo "$result" | grep -q "$expected"; then
    echo -e "[\033[32mPASS\033[0m] $label"
    PASS=$((PASS+1))
  else
    echo -e "[\033[31mFAIL\033[0m] $label — got: $result"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo " 🧭 CAMPUS COMPASS - VPS DEBUG REPORT"
echo " $(date)"
echo "============================================"
echo ""

# 1. Services
echo "## 1. Systemd Services"
for svc in mediamtx campus-compass nginx; do
  status=$(systemctl is-active $svc 2>/dev/null)
  check "$svc is active" "$status" "active"
done

# 2. Ports
echo ""
echo "## 2. Port Listeners"
check "Port 8554 (RTSP Publish) is open" "$(ss -tuln | grep -c :8554)" "1"
check "Port 8189 (WebRTC) is open" "$(ss -tuln | grep -c :8189)" "2"
check "Port 3001 (Internal Backend API) is open" "$(ss -tuln | grep -c :3001)" "1"

# 3. API Health
echo ""
echo "## 3. Backend API Health"
health_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
check "Backend Health Endpoint (/api/health)" "$health_code" "200"

# Note: /stream-auth requires POST and credentials, so we expect a 400 or 401, not a connection refused (000)
auth_code=$(curl -s -X POST -o /dev/null -w "%{http_code}" http://localhost:3001/stream-auth)
if [ "$auth_code" = "401" ] || [ "$auth_code" = "400" ]; then
  check "MediaMTX Auth Endpoint Responsive" "$auth_code" "$auth_code"
else
  check "MediaMTX Auth Endpoint Responsive" "$auth_code" "401 (expected 400 or 401)"
fi

# 4. Logs
echo ""
echo "## 4. Recent Errors (Last 10 lines)"
echo "--- mediamtx.service ---"
journalctl -u mediamtx -n 10 --no-pager 2>/dev/null | grep -i "error\|failed\|fatal" || echo "No recent errors found."
echo "--- campus-compass.service ---"
journalctl -u campus-compass -n 10 --no-pager 2>/dev/null | grep -i "error\|failed\|fatal" || echo "No recent errors found."

echo ""
echo "============================================"
echo " SUMMARY: $PASS PASS | $FAIL FAIL | $WARN WARN"
echo "============================================"
