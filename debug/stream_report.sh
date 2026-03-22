#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Campus Compass — Live Stream Status Report
#
# Generates a concise, readable report of the current stream health
# by polling all components and aggregating results into a single view.
#
# Usage: bash debug/stream_report.sh
# Output: debug/logs/stream_report_<timestamp>.txt  +  printed to terminal
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
REPORT_FILE="$LOG_DIR/${TIMESTAMP}_stream_report.txt"

# ─── Read config ────────────────────────────────────────────────────────────
ENV_FILE="$PROJECT_ROOT/.env.local"
VPS_DOMAIN=$(grep "^NEXT_PUBLIC_VPS_DOMAIN=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"')
VPS_DOMAIN="${VPS_DOMAIN:-thanganat25.com}"
BACKEND_URL=$(grep "^NEXT_PUBLIC_BACKEND_URL=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"')
BACKEND_URL="${BACKEND_URL:-https://${VPS_DOMAIN}}"
STREAM_PATH=$(grep "^NEXT_PUBLIC_STREAM_PATH=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"')
STREAM_PATH="${STREAM_PATH:-live_bus-1}"

# ─── Quick status helpers ───────────────────────────────────────────────────
STATUS_OK="✔"
STATUS_FAIL="✘"
STATUS_WARN="⚠"
STATUS_UNKNOWN="–"

check_http() {
    local URL="$1"
    local EXPECTED_STATUS="${2:-200}"
    local EXTRA_ARGS="${3:-}"
    
    local RESP
    RESP=$(curl -s -o /tmp/cc_report_resp.txt -w "%{http_code}" \
        --connect-timeout 8 --max-time 12 \
        $EXTRA_ARGS \
        "$URL" 2>/dev/null)
    echo "$RESP"
}

check_tcp() {
    local HOST="$1"
    local PORT="$2"
    if command -v nc &>/dev/null; then
        nc -z -w 8 "$HOST" "$PORT" &>/dev/null && echo "open" || echo "closed"
    elif timeout 8 bash -c ">/dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
        echo "open"
    else
        echo "closed"
    fi
}

CHECK_SSH_VPS=false
CHECK_SSH_PI=false

# ─── Report output setup ─────────────────────────────────────────────────────
{
echo "════════════════════════════════════════════════════════════"
echo "  CAMPUS COMPASS — LIVE STREAM STATUS REPORT"
echo "  Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "  VPS: ${VPS_DOMAIN}"
echo "  Stream: ${STREAM_PATH}"
echo "════════════════════════════════════════════════════════════"
echo ""

# ─── Layer 1: Network / Ports ───────────────────────────────────────────────
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  LAYER 1: Network Ports                                  │"
echo "└──────────────────────────────────────────────────────────┘"

PORT_443=$(check_tcp "$VPS_DOMAIN" 443)
PORT_8554=$(check_tcp "$VPS_DOMAIN" 8554)
PORT_80=$(check_tcp "$VPS_DOMAIN" 80)

echo "  Port 443 (HTTPS/WHEP via Nginx) : ${PORT_443}"
echo "  Port 80  (HTTP redirect)         : ${PORT_80}"
echo "  Port 8554 (RTSP—Pi publisher)   : ${PORT_8554}"
echo ""

# ─── Layer 2: Backend Health ────────────────────────────────────────────────
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  LAYER 2: Backend (campus-compass service)               │"
echo "└──────────────────────────────────────────────────────────┘"

HEALTH_STATUS=$(check_http "${BACKEND_URL}/api/health")
HEALTH_BODY=$(cat /tmp/cc_report_resp.txt 2>/dev/null)

if [[ "$HEALTH_STATUS" == "200" ]]; then
    echo "  ${STATUS_OK} Backend health: OK (HTTP 200)"
    UPTIME=$(echo "$HEALTH_BODY" | grep -o '"uptime":[0-9.]*' | cut -d: -f2 | awk '{printf "%.0f", $1}')
    if [[ -n "$UPTIME" ]]; then
        echo "     Uptime: ${UPTIME}s ($(( UPTIME / 3600 ))h $(( (UPTIME % 3600) / 60 ))m)"
    fi
else
    echo "  ${STATUS_FAIL} Backend health: FAILED (HTTP ${HEALTH_STATUS:-TIMEOUT})"
fi

TOKEN_STATUS=$(check_http "${BACKEND_URL}/api/stream-token?stream=${STREAM_PATH}")
if [[ "$TOKEN_STATUS" == "401" ]]; then
    echo "  ${STATUS_OK} /api/stream-token: Reachable + auth enforced (401)"
elif [[ "$TOKEN_STATUS" == "200" ]]; then
    echo "  ${STATUS_WARN} /api/stream-token: Returns 200 WITHOUT auth — check config!"
else
    echo "  ${STATUS_FAIL} /api/stream-token: Unreachable (HTTP ${TOKEN_STATUS:-TIMEOUT})"
fi
echo ""

# ─── Layer 3: Nginx / WHEP Proxy ────────────────────────────────────────────
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  LAYER 3: Nginx + WHEP Proxy (/stream/)                  │"
echo "└──────────────────────────────────────────────────────────┘"

WHEP_STATUS=$(check_http \
    "https://${VPS_DOMAIN}/stream/${STREAM_PATH}/whep" \
    "401" \
    "-X POST -H 'Content-Type: application/sdp' --data ''")

case "$WHEP_STATUS" in
    "401") echo "  ${STATUS_OK} WHEP endpoint: Auth enforced (401 correct — no token)" ;;
    "404") echo "  ${STATUS_FAIL} WHEP endpoint: 404 — stream path '${STREAM_PATH}' not found" ;;
    "200"|"201") echo "  ${STATUS_WARN} WHEP endpoint: 200 without token — auth NOT enforced!" ;;
    "502") echo "  ${STATUS_FAIL} WHEP endpoint: 502 Bad Gateway — MediaMTX or Nginx down" ;;
    "000") echo "  ${STATUS_FAIL} WHEP endpoint: Connection failed — Nginx down?" ;;
    *)     echo "  ${STATUS_WARN} WHEP endpoint: HTTP ${WHEP_STATUS:-?}" ;;
esac

# CORS check
CORS_HEADER=$(curl -s -D - -o /dev/null \
    -H "Origin: http://localhost:3000" \
    --connect-timeout 8 --max-time 12 \
    "${BACKEND_URL}/api/health" 2>/dev/null | \
    grep -i "access-control-allow-origin" | \
    tr -d '\r')
if [[ -n "$CORS_HEADER" ]]; then
    echo "  ${STATUS_OK} CORS header present: ${CORS_HEADER}"
else
    echo "  ${STATUS_WARN} No CORS header found — browser may be blocked"
fi
echo ""

# ─── Layer 4: SSL ───────────────────────────────────────────────────────────
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  LAYER 4: SSL Certificate                                │"
echo "└──────────────────────────────────────────────────────────┘"

if command -v openssl &>/dev/null; then
    SSL_OUT=$(echo | timeout 10 openssl s_client \
        -connect "${VPS_DOMAIN}:443" \
        -servername "$VPS_DOMAIN" 2>/dev/null)
    
    if echo "$SSL_OUT" | grep -q "CONNECTED"; then
        EXPIRY=$(echo "$SSL_OUT" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo 0)
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
        echo "  ${STATUS_OK} SSL: Connected (expires: ${EXPIRY:-?})"
        if [[ $DAYS_LEFT -gt 14 ]]; then
            echo "     Days remaining: ${DAYS_LEFT}"
        elif [[ $DAYS_LEFT -gt 0 ]]; then
            echo "  ${STATUS_WARN} SSL cert expires in ${DAYS_LEFT} days — RENEW SOON"
        else
            echo "  ${STATUS_FAIL} SSL cert has EXPIRED"
        fi
    else
        echo "  ${STATUS_FAIL} SSL: Could not connect to ${VPS_DOMAIN}:443"
    fi
else
    echo "  ${STATUS_UNKNOWN} openssl not available"
fi
echo ""

# ─── Layer 5: VPS Services (via SSH) ────────────────────────────────────────
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  LAYER 5: VPS Services (SSH)                             │"
echo "└──────────────────────────────────────────────────────────┘"

if ssh -o ConnectTimeout=10 -o BatchMode=yes vps "echo ok" &>/dev/null; then
    CHECK_SSH_VPS=true
    VPS_STATUS=$(ssh vps bash << 'EOF'
nginx_ok=$(systemctl is-active nginx 2>/dev/null)
backend_ok=$(systemctl is-active campus-compass 2>/dev/null)
mtx_ok=$(systemctl is-active mediamtx 2>/dev/null)
jwt_ok=$(grep -q 'STREAM_JWT_SECRET' /etc/campus-compass.env 2>/dev/null && echo yes || echo no)

# MediaMTX API
mtx_api=$(curl -s --connect-timeout 3 http://127.0.0.1:9997/v3/paths/list 2>/dev/null)
has_pub=no
if [[ -n "$mtx_api" ]]; then
    has_pub=$(echo "$mtx_api" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('items',d.get('paths',[]))
live=[p for p in items if 'live' in p.get('name','')]
pub=any(bool(p.get('source') and p.get('source',{}).get('type','')) for p in live)
print('yes' if pub else 'no')
" 2>/dev/null || echo "unknown")
fi

echo "nginx=${nginx_ok}"
echo "backend=${backend_ok}"
echo "mediamtx=${mtx_ok}"
echo "jwt_set=${jwt_ok}"
echo "has_publisher=${has_pub}"
EOF
)
    
    nginx_st=$(echo "$VPS_STATUS" | grep "nginx=" | cut -d= -f2)
    backend_st=$(echo "$VPS_STATUS" | grep "backend=" | cut -d= -f2)
    mediamtx_st=$(echo "$VPS_STATUS" | grep "mediamtx=" | cut -d= -f2)
    jwt_st=$(echo "$VPS_STATUS" | grep "jwt_set=" | cut -d= -f2)
    pub_st=$(echo "$VPS_STATUS" | grep "has_publisher=" | cut -d= -f2)

    echo "  Nginx          : ${nginx_st:-?}"
    echo "  campus-compass : ${backend_st:-?}"
    echo "  MediaMTX       : ${mediamtx_st:-?}"
    echo "  JWT Secret set : ${jwt_st:-?}"
    echo "  Pi Publisher   : ${pub_st:-?} (live stream publisher connected)"
else
    echo "  ${STATUS_WARN} SSH to VPS unavailable — manual checks required"
    echo "  Run: bash debug/check_vps.sh"
fi
echo ""

# ─── Layer 6: Pi Status (via SSH) ───────────────────────────────────────────
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  LAYER 6: Raspberry Pi (SSH)                             │"
echo "└──────────────────────────────────────────────────────────┘"

if ssh -o ConnectTimeout=12 -o BatchMode=yes pi "echo ok" &>/dev/null; then
    CHECK_SSH_PI=true
    PI_STATUS=$(ssh pi bash << 'EOF'
camstream=$(systemctl is-active camstream 2>/dev/null)
ffmpeg_count=$(pgrep -c ffmpeg 2>/dev/null || echo 0)
cam_ip=$(grep 'CAMERA_IP=' /etc/campus-compass.env 2>/dev/null | cut -d= -f2)
stream_path=$(grep 'STREAM_PATH=' /etc/campus-compass.env 2>/dev/null | cut -d= -f2)
vps_ip=$(grep 'VPS_IP=' /etc/campus-compass.env 2>/dev/null | cut -d= -f2)

cam_reachable=no
if [[ -n "$cam_ip" ]]; then
    ping -c 1 -W 3 "$cam_ip" &>/dev/null && cam_reachable=yes
fi

echo "camstream=${camstream}"
echo "ffmpeg_count=${ffmpeg_count}"
echo "camera_ip=${cam_ip}"
echo "stream_path=${stream_path}"
echo "camera_reachable=${cam_reachable}"
echo "vps_ip=${vps_ip}"
EOF
)
    cam_svc=$(echo "$PI_STATUS" | grep "camstream=" | cut -d= -f2)
    ffmpeg_n=$(echo "$PI_STATUS" | grep "ffmpeg_count=" | cut -d= -f2)
    cam_ip=$(echo "$PI_STATUS" | grep "camera_ip=" | cut -d= -f2)
    stream_p=$(echo "$PI_STATUS" | grep "stream_path=" | cut -d= -f2)
    cam_reach=$(echo "$PI_STATUS" | grep "camera_reachable=" | cut -d= -f2)
    vps_ip=$(echo "$PI_STATUS" | grep "vps_ip=" | cut -d= -f2)

    echo "  camstream.service : ${cam_svc:-?}"
    echo "  ffmpeg processes  : ${ffmpeg_n:-0}"
    echo "  Camera IP         : ${cam_ip:-not set}"
    echo "  Camera reachable  : ${cam_reach:-?}"
    echo "  Stream path       : ${stream_p:-not set}"
    echo "  VPS IP target     : ${vps_ip:-not set}"
else
    echo "  ${STATUS_WARN} SSH to Pi unavailable — manual checks required"
    echo "  Run: bash debug/check_pi.sh"
fi
echo ""

# ─── Diagnosis ──────────────────────────────────────────────────────────────
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  DIAGNOSIS                                               │"
echo "└──────────────────────────────────────────────────────────┘"
echo ""

ISSUES=0

# Network
if [[ "$PORT_443" != "open" ]]; then
    echo "  ✘ CRITICAL: Port 443 is not reachable → Nginx is down or firewall blocks it"
    ISSUES=$((ISSUES+1))
fi

# Backend
if [[ "$HEALTH_STATUS" != "200" ]]; then
    echo "  ✘ CRITICAL: Backend not responding → campus-compass service is likely down"
    echo "              Fix: ssh vps 'sudo systemctl restart campus-compass'"
    ISSUES=$((ISSUES+1))
fi

# WHEP
if [[ "$WHEP_STATUS" == "404" ]]; then
    echo "  ✘ ERROR: WHEP 404 → stream path '${STREAM_PATH}' not in MediaMTX"
    echo "           Fix: Check mediamtx.yml paths section on VPS"
    ISSUES=$((ISSUES+1))
elif [[ "$WHEP_STATUS" == "502" ]]; then
    echo "  ✘ CRITICAL: WHEP 502 → MediaMTX not running or port 8189 issue"
    echo "              Fix: ssh vps 'sudo systemctl restart mediamtx'"
    ISSUES=$((ISSUES+1))
elif [[ "$WHEP_STATUS" == "000" ]]; then
    echo "  ✘ CRITICAL: WHEP connection failed → Nginx is down"
    ISSUES=$((ISSUES+1))
fi

# Pi (if SSH worked)
if [[ "$CHECK_SSH_PI" == "true" ]]; then
    if [[ "$cam_svc" != "active" ]]; then
        echo "  ✘ CRITICAL: camstream.service is not active → Pi not streaming"
        echo "              Fix: ssh pi 'sudo systemctl restart camstream'"
        ISSUES=$((ISSUES+1))
    fi
    if [[ "$ffmpeg_n" == "0" ]]; then
        echo "  ✘ ERROR: No ffmpeg process on Pi → stream relay is not running"
        ISSUES=$((ISSUES+1))
    fi
    if [[ "$cam_reach" == "no" ]]; then
        echo "  ✘ ERROR: IP Camera not reachable from Pi (${cam_ip})"
        echo "           Fix: Check Ethernet cable between Pi and camera"
        ISSUES=$((ISSUES+1))
    fi
fi

# Publisher
if [[ "$CHECK_SSH_VPS" == "true" && "$pub_st" == "no" ]]; then
    echo "  ✘ ERROR: No publisher connected to MediaMTX — Pi is not pushing RTSP"
    echo "           Fix: Check Pi camstream.service"
    ISSUES=$((ISSUES+1))
fi

# CORS
if [[ -z "$CORS_HEADER" ]]; then
    echo "  ⚠ WARNING: No CORS header detected — browser may block stream"
    echo "             Fix: Check Nginx cors_origin map; add your frontend origin"
    ISSUES=$((ISSUES+1))
fi

if [[ $ISSUES -eq 0 ]]; then
    echo "  ✔ No critical issues detected in automated checks."
    echo ""
    echo "  If stream still doesn't show in browser:"
    echo "  1. Open DevTools Console → look for fetch() errors on /api/stream-token"
    echo "  2. Check RTCPeerConnection iceConnectionState in DevTools"
    echo "  3. Ensure user is logged in (Firebase ID token must be valid)"
    echo "  4. Check browser console for 'Token expired' then refresh the page"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Full details: bash debug/debug_stream.sh"
echo "  VPS deep-dive: bash debug/check_vps.sh"
echo "  Pi deep-dive: bash debug/check_pi.sh"
echo "════════════════════════════════════════════════════════════"

} | tee "$REPORT_FILE"

echo ""
echo -e "${DIM}Report saved to: ${REPORT_FILE}${NC}"
