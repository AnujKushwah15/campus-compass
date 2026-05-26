#!/bin/bash
# Campus Compass - Pi Debugging Script
# Usage from local: ssh 10.34.25.238 'bash -s' < testing/debug_pi.sh

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

warn_if_missing() {
  local label="$1"
  local condition="$2"
  if [ "$condition" = "1" ]; then
    echo -e "[\033[32mPASS\033[0m] $label"
    PASS=$((PASS+1))
  else
    echo -e "[\033[33mWARN\033[0m] $label"
    WARN=$((WARN+1))
  fi
}

echo "============================================"
echo " 🧭 CAMPUS COMPASS - PI DEBUG REPORT"
echo " $(date)"
echo "============================================"
echo ""

# 1. Services
echo "## 1. Systemd Services"
cam_svc=$(systemctl is-active camstream.service 2>/dev/null)
sen_svc=$(systemctl is-active sensor_service.service 2>/dev/null)
check "camstream.service is active" "$cam_svc" "active"
check "sensor_service.service is active" "$sen_svc" "active"

# 2. Network
echo ""
echo "## 2. Network Reachability"
inet_ping=$(ping -c 1 8.8.8.8 2>/dev/null | grep -c "1 received")
warn_if_missing "Internet Reachable (8.8.8.8)" "$inet_ping"

# Get VPS IP from env if possible, otherwise rely on known domains or IPs. 
# Usually Pi connects to the VPS. Let's ping thanganat25.com as seen in phase0
vps_ping=$(ping -c 1 thanganat25.com 2>/dev/null | grep -c "1 received")
warn_if_missing "VPS Reachable (thanganat25.com)" "$vps_ping"

# 3. Devices
echo ""
echo "## 3. Hardware Devices"
cam_dev=$(ls /dev/video* 2>/dev/null | wc -l)
if [ "$cam_dev" -gt 0 ]; then
  warn_if_missing "Camera device found (/dev/video*)" "1"
else
  warn_if_missing "Camera device found (/dev/video*)" "0"
fi

gps_dev=$(ls /dev/ttyS* /dev/ttyUSB* /dev/ttyAMA* 2>/dev/null | wc -l)
if [ "$gps_dev" -gt 0 ]; then
  warn_if_missing "GPS/IMU tty device found" "1"
else
  warn_if_missing "GPS/IMU tty device found" "0"
fi

# 4. Logs
echo ""
echo "## 4. Recent Errors (Last 10 lines)"
echo "--- camstream.service ---"
journalctl -u camstream.service -n 10 --no-pager 2>/dev/null | grep -i "error\|failed\|fatal" || echo "No recent errors found."
echo "--- sensor_service.service ---"
journalctl -u sensor_service.service -n 10 --no-pager 2>/dev/null | grep -i "error\|failed\|fatal" || echo "No recent errors found."

echo ""
echo "============================================"
echo " SUMMARY: $PASS PASS | $FAIL FAIL | $WARN WARN"
echo "============================================"
