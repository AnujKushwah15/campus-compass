#!/bin/bash
# Phase 0 — Raspberry Pi Environment Verification Script
# Run on Pi via: ssh pi 'bash -s' < testing/phase0_verify_pi.sh

PASS=0
FAIL=0
WARN=0

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

echo "============================================"
echo " PHASE 0 — RASPBERRY PI ENVIRONMENT VERIFICATION"
echo " $(date)"
echo "============================================"
echo ""

# --- 1. Camera stream service ---
echo "## 1. Camera Stream Service (camstream.service)"
SVC=$(systemctl is-active camstream.service 2>/dev/null)
check "camstream.service is active" "$SVC" "active"
echo "   Recent logs:"
journalctl -u camstream.service -n 5 --no-pager 2>/dev/null | tail -5

# --- 2. Camera device ---
echo ""
echo "## 2. Camera Device"
if ls /dev/video* 2>/dev/null | grep -q video; then
  echo "[PASS] Camera device found: $(ls /dev/video*)"
  PASS=$((PASS+1))
else
  echo "[WARN] No /dev/video* device — check camera connection"
  WARN=$((WARN+1))
fi

# --- 3. Network reachability to VPS ---
echo ""
echo "## 3. VPS Reachability"
VPS_PING=$(ping -c 2 thanganat25.com 2>/dev/null | grep "2 received")
check "Pi can reach thanganat25.com" "$VPS_PING" "received"

# --- 4. Stream push confirmation (check RTSP port reachable) ---
echo ""
echo "## 4. RTSP Port (VPS:8554)"
RTSP=$(nc -z -w3 thanganat25.com 8554 2>&1; echo $?)
if [ "$RTSP" = "0" ]; then
  echo "[PASS] VPS RTSP port 8554 is reachable from Pi"
  PASS=$((PASS+1))
else
  echo "[FAIL] Cannot reach VPS RTSP port 8554 from Pi"
  FAIL=$((FAIL+1))
fi

# --- 5. FFmpeg / picamera2 present ---
echo ""
echo "## 5. Streaming Tool"
if command -v ffmpeg >/dev/null 2>&1; then
  echo "[PASS] ffmpeg found: $(ffmpeg -version 2>/dev/null | head -1)"
  PASS=$((PASS+1))
elif python3 -c "import picamera2" 2>/dev/null; then
  echo "[PASS] picamera2 found"
  PASS=$((PASS+1))
else
  echo "[WARN] Neither ffmpeg nor picamera2 detected"
  WARN=$((WARN+1))
fi

# --- Summary ---
echo ""
echo "============================================"
echo " PHASE 0 PI SUMMARY"
echo "   PASS: $PASS"
echo "   FAIL: $FAIL"
echo "   WARN: $WARN"
echo "============================================"
