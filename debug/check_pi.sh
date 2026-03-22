#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Campus Compass — Raspberry Pi Stream Debug
# SSH alias: 'ssh pi'
# Tests: camstream.service, ffmpeg, camera RTSP, env config, VPS reachability
# Run: bash debug/check_pi.sh
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date '+%Y-%m-%d_%H-%M-%S')_check_pi.log"
exec > >(tee -a "$LOG_FILE") 2>&1

init_counters
echo -e "${BOLD}${MAGENTA}Campus Compass — Raspberry Pi Check${NC}"
echo -e "${DIM}$(date)${NC}"
echo -e "${DIM}SSH alias: ssh pi${NC}"

# Verify SSH alias works
section "0. SSH Connectivity"
if ssh -o ConnectTimeout=15 -o BatchMode=yes pi "echo ok" &>/dev/null; then
    pass "'ssh pi' alias works"
else
    fail "'ssh pi' failed — check ~/.ssh/config and Pi network connectivity"
    echo ""
    echo -e "${RED}Cannot reach Pi. All Pi checks skipped.${NC}"
    print_summary "check_pi.sh"
    exit 1
fi

# ─── Run all checks via single SSH session ─────────────────────────────────
section "Running checks on Raspberry Pi via SSH..."
echo -e "${DIM}(Executing remote diagnostics — this may take 20–30 seconds)${NC}"

ssh pi bash << 'REMOTE_SCRIPT'
#!/bin/bash

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

FAILURES=0; WARNINGS=0

section()    { echo ""; echo -e "${BOLD}${BLUE}══ $1 ══${NC}"; }
pass()  { echo -e "  ${GREEN}✔${NC}  $1"; }
fail()  { echo -e "  ${RED}✘${NC}  $1"; FAILURES=$((FAILURES+1)); }
warn()  { echo -e "  ${YELLOW}⚠${NC}  $1"; WARNINGS=$((WARNINGS+1)); }
info()  { echo -e "  ${DIM}ℹ${NC}  $1"; }

echo -e "${BOLD}${MAGENTA}=== Pi Diagnostics ===${NC}"
echo "Host: $(hostname) | $(date)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
echo "Model: $(cat /proc/device-tree/model 2>/dev/null || echo 'Unknown Pi')"

# ─── 1. System Resources ────────────────────────────────────────────────────
section "1. System Resources"

DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [[ "$DISK_USAGE" -lt 85 ]]; then
    pass "Disk usage: ${DISK_USAGE}%"
else
    warn "Disk usage: ${DISK_USAGE}% — consider cleanup"
fi

MEM_AVAIL=$(free -m | awk 'NR==2{print $7}')
if [[ "$MEM_AVAIL" -gt 100 ]]; then
    pass "Available memory: ${MEM_AVAIL}MB"
else
    warn "Low memory: ${MEM_AVAIL}MB available"
fi

CPU_TEMP=$(vcgencmd measure_temp 2>/dev/null | cut -d= -f2 || sensors 2>/dev/null | grep temp | head -1 || echo "N/A")
info "CPU Temperature: ${CPU_TEMP}"

# ─── 2. Environment Config ──────────────────────────────────────────────────
section "2. Environment Config (/etc/campus-compass.env)"

ENV_FILE="/etc/campus-compass.env"
if [[ -f "$ENV_FILE" ]]; then
    pass "Environment file exists: $ENV_FILE"

    check_env_var() {
        local VAR="$1"
        local VAL
        VAL=$(grep "^${VAR}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r')
        if [[ -n "$VAL" ]]; then
            pass "${VAR}=${VAL}" >&2
            echo "$VAL"
        else
            fail "${VAR} is NOT set in $ENV_FILE" >&2
            echo ""
        fi
    }

    CAMERA_IP=$(check_env_var "CAMERA_IP")
    CAMERA_USER=$(check_env_var "CAMERA_USER")
    CAMERA_PASS_SET=$(grep -q "CAMERA_PASS=" "$ENV_FILE" && echo "yes" || echo "no")
    if [[ "$CAMERA_PASS_SET" == "yes" ]]; then
        pass "CAMERA_PASS is set (value hidden)"
    else
        fail "CAMERA_PASS is NOT set"
    fi
    CAMERA_RTSP_PATH=$(check_env_var "CAMERA_RTSP_PATH")
    STREAM_PATH=$(check_env_var "STREAM_PATH")
    VPS_IP=$(check_env_var "VPS_IP")
    RTMP_PASS_SET=$(grep -q "RTMP_PASS=" "$ENV_FILE" && echo "yes" || echo "no")
    if [[ "$RTMP_PASS_SET" == "yes" ]]; then
        pass "RTMP_PASS is set (value hidden)"
    else
        fail "RTMP_PASS is NOT set"
    fi
else
    fail "Environment file NOT FOUND: $ENV_FILE"
    info "Create it with: CAMERA_IP, CAMERA_USER, CAMERA_PASS, CAMERA_RTSP_PATH, STREAM_PATH, VPS_IP, RTMP_PASS"
    # Try to get values from defaults for subsequent tests
    CAMERA_IP=""
    CAMERA_USER="admin"
    CAMERA_RTSP_PATH="stream1"
    STREAM_PATH="live_bus-1"
    VPS_IP=""
fi

# ─── 3. camera Service ───────────────────────────────────────────────────────
section "3. camstream.service (ffmpeg relay)"

if systemctl is-active --quiet camstream; then
    pass "camstream.service is RUNNING"

    # Get PID
    PID=$(systemctl show -p MainPID camstream 2>/dev/null | cut -d= -f2)
    if [[ -n "$PID" && "$PID" != "0" ]]; then
        info "PID: $PID"
        # Show CPU/mem usage
        if command -v ps &>/dev/null; then
            PS_OUT=$(ps -p "$PID" -o pid,%cpu,%mem,etime,cmd --no-headers 2>/dev/null)
            info "Process: $PS_OUT"
        fi
    fi
else
    fail "camstream.service is NOT running"
    info "Fix: sudo systemctl start camstream"
    info "Recent logs:"
    journalctl -u camstream -n 15 --no-pager 2>/dev/null
fi

if systemctl is-enabled --quiet camstream; then
    pass "camstream.service is enabled (auto-starts on reboot)"
else
    warn "camstream.service is NOT enabled"
    info "Fix: sudo systemctl enable camstream"
fi

# Check for ffmpeg process
if pgrep -x ffmpeg >/dev/null 2>&1; then
    pass "ffmpeg process is running"
    FFMPEG_CMD=$(pgrep -xa ffmpeg 2>/dev/null | head -1)
    info "Command: ${FFMPEG_CMD:0:120}..."
else
    fail "No ffmpeg process found"
    info "camstream.service may have failed to start ffmpeg"
fi

# Check recent camstream errors
RECENT_ERRORS=$(journalctl -u camstream --since "5 minutes ago" --no-pager 2>/dev/null | \
    grep -i "error\|failed\|refused\|timeout\|unreachable" | tail -5)
if [[ -n "$RECENT_ERRORS" ]]; then
    warn "Recent camstream errors:"
    echo "$RECENT_ERRORS" | while IFS= read -r line; do info "  $line"; done
else
    pass "No recent errors in camstream logs"
fi

# Show last 5 log lines regardless
info "Last 5 camstream log lines:"
journalctl -u camstream -n 5 --no-pager 2>/dev/null | while IFS= read -r line; do
    info "  $line"
done

# ─── 4. Camera RTSP Reachability ────────────────────────────────────────────
section "4. Camera RTSP Reachability"

if [[ -n "$CAMERA_IP" ]]; then
    # Ping camera
    if ping -c 2 -W 3 "$CAMERA_IP" &>/dev/null; then
        pass "Camera IP ${CAMERA_IP} is reachable (ping OK)"
    else
        fail "Camera IP ${CAMERA_IP} is NOT reachable — check Ethernet/LAN cable"
    fi

    # Check RTSP port 554
    if command -v nc &>/dev/null; then
        if nc -z -w 5 "$CAMERA_IP" 554 2>/dev/null; then
            pass "Camera port 554 (RTSP) is open"
        else
            fail "Camera port 554 (RTSP) is NOT open on ${CAMERA_IP}"
            info "Is the camera powered on and connected?"
        fi
    else
        # Use /dev/tcp as fallback
        if timeout 5 bash -c ">/dev/tcp/${CAMERA_IP}/554" 2>/dev/null; then
            pass "Camera port 554 (RTSP) is open (via /dev/tcp)"
        else
            fail "Camera port 554 (RTSP) is NOT open on ${CAMERA_IP}"
        fi
    fi

    # Try probing RTSP URL with ffprobe
    if command -v ffprobe &>/dev/null && [[ -n "$CAMERA_USER" ]]; then
        CAMERA_PASS_VAL=$(grep "^CAMERA_PASS=" "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
        RTSP_URL="rtsp://${CAMERA_USER}:${CAMERA_PASS_VAL}@${CAMERA_IP}:554/${CAMERA_RTSP_PATH}"
        info "Probing RTSP stream (10s timeout)..."
        PROBE_OUT=$(timeout 10 ffprobe -rtsp_transport tcp \
            -v quiet -print_format json -show_streams \
            "$RTSP_URL" 2>&1)
        if echo "$PROBE_OUT" | grep -q '"codec_type"'; then
            pass "ffprobe: RTSP stream is accessible and has valid streams!"
            CODEC=$(echo "$PROBE_OUT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for s in d.get('streams',[]):
    print(f\"  {s.get('codec_type','?')} — codec={s.get('codec_name','?')} width={s.get('width','?')} height={s.get('height','?')}\")" 2>/dev/null)
            echo "$CODEC" | while IFS= read -r line; do info "$line"; done
        elif echo "$PROBE_OUT" | grep -qi "refused\|timeout\|unauthorized\|401"; then
            fail "ffprobe: Cannot access RTSP — $(echo "$PROBE_OUT" | grep -i 'error\|refused\|401' | head -2)"
        else
            warn "ffprobe probe inconclusive: $(echo "$PROBE_OUT" | tail -3)"
        fi
    else
        skip "ffprobe not available — cannot test RTSP stream quality"
    fi
else
    warn "CAMERA_IP not set — skipping camera reachability tests"
fi

# ─── 5. VPS Reachability from Pi ────────────────────────────────────────────
section "5. VPS Reachability from Pi"

# Get VPS_IP from env or try to resolve from env
if [[ -z "$VPS_IP" ]]; then
    VPS_IP=$(grep "^VPS_IP=" "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
fi

if [[ -n "$VPS_IP" ]]; then
    if ping -c 2 -W 5 "$VPS_IP" &>/dev/null; then
        pass "VPS ${VPS_IP} is reachable (ping OK)"
    else
        warn "VPS ${VPS_IP} might not respond to ping (may be blocked by firewall)"
    fi

    # Check RTSP publish port 8554
    if command -v nc &>/dev/null; then
        if nc -z -w 10 "$VPS_IP" 8554 2>/dev/null; then
            pass "VPS port 8554 (RTSP publish) is open from Pi"
        else
            fail "VPS port 8554 (RTSP) is NOT reachable from Pi — firewall or MediaMTX issue"
        fi
    else
        if timeout 10 bash -c ">/dev/tcp/${VPS_IP}/8554" 2>/dev/null; then
            pass "VPS port 8554 (RTSP) reachable from Pi"
        else
            fail "VPS port 8554 (RTSP) NOT reachable from Pi"
        fi
    fi
else
    warn "VPS_IP not set in env — skipping VPS reachability from Pi"
fi

# ─── 6. Network Interface ───────────────────────────────────────────────────
section "6. Network Interface"

ip addr show 2>/dev/null | grep -E "inet |link/ether" | while IFS= read -r line; do
    info "  $line"
done

# Default gateway
GW=$(ip route show default 2>/dev/null | awk '{print $3}')
if [[ -n "$GW" ]]; then
    pass "Default gateway: $GW"
    if ping -c 1 -W 3 "$GW" &>/dev/null; then
        pass "Default gateway ${GW} is reachable"
    else
        warn "Default gateway ${GW} not responding to ping"
    fi
else
    fail "No default gateway found — Pi has no internet route"
fi

# DNS
DNS_TEST=$(nslookup thanganat25.com 2>/dev/null | grep "Address:" | tail -1)
if [[ -n "$DNS_TEST" ]]; then
    pass "DNS resolution working: $DNS_TEST"
else
    warn "DNS resolution may be having issues"
fi

# ─── 7. Sensor Service ──────────────────────────────────────────────────────
section "7. Sensor Service (GPS/IMU)"

if systemctl is-active --quiet sensor-service 2>/dev/null || \
   systemctl is-active --quiet sensor_service 2>/dev/null; then
    pass "sensor-service is RUNNING"
else
    warn "sensor-service is NOT running (GPS/IMU won't update Firebase)"
    info "This won't affect camera stream but will affect bus tracking"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────────"
if [[ $FAILURES -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "  ${GREEN}${BOLD}ALL PI CHECKS PASSED${NC}"
elif [[ $FAILURES -eq 0 ]]; then
    echo -e "  ${YELLOW}${BOLD}PI CHECKS: PASSED WITH WARNINGS${NC} (${WARNINGS} warnings)"
else
    echo -e "  ${RED}${BOLD}PI CHECKS FAILED${NC} (${FAILURES} failures, ${WARNINGS} warnings)"
fi
echo "──────────────────────────────────────────────────────"

exit $FAILURES
REMOTE_SCRIPT

REMOTE_EXIT=$?
print_summary "check_pi.sh"
echo -e "${DIM}Log saved to: ${LOG_FILE}${NC}"
exit $REMOTE_EXIT
