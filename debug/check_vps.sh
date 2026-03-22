#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Campus Compass — VPS Stream Debug
# SSH alias: 'ssh vps'
# Tests: Nginx, campus-compass service, MediaMTX, backend API, JWT config
# Run: bash debug/check_vps.sh
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date '+%Y-%m-%d_%H-%M-%S')_check_vps.log"
exec > >(tee -a "$LOG_FILE") 2>&1

init_counters
echo -e "${BOLD}${MAGENTA}Campus Compass — VPS Check${NC}"
echo -e "${DIM}$(date)${NC}"
echo -e "${DIM}SSH alias: ssh vps${NC}"

# Verify SSH alias works
section "0. SSH Connectivity"
if ssh -o ConnectTimeout=10 -o BatchMode=yes vps "echo ok" &>/dev/null; then
    pass "'ssh vps' alias works"
else
    fail "'ssh vps' failed — check ~/.ssh/config and VPS connectivity"
    echo ""
    echo -e "${RED}Cannot reach VPS. All VPS checks skipped.${NC}"
    print_summary "check_vps.sh"
    exit 1
fi

# ─── Run all checks via single SSH session ─────────────────────────────────
section "Running checks on VPS via SSH..."
echo -e "${DIM}(Executing remote diagnostics — this may take 20–30 seconds)${NC}"

ssh vps bash << 'REMOTE_SCRIPT'
#!/bin/bash
set -o pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

FAILURES=0; WARNINGS=0

section()    { echo ""; echo -e "${BOLD}${BLUE}══ $1 ══${NC}"; }
subsection() { echo -e "${CYAN}  ── $1 ──${NC}"; }
pass()  { echo -e "  ${GREEN}✔${NC}  $1"; }
fail()  { echo -e "  ${RED}✘${NC}  $1"; FAILURES=$((FAILURES+1)); }
warn()  { echo -e "  ${YELLOW}⚠${NC}  $1"; WARNINGS=$((WARNINGS+1)); }
info()  { echo -e "  ${DIM}ℹ${NC}  $1"; }

echo -e "${BOLD}${MAGENTA}=== VPS Diagnostics ===${NC}"
echo "Host: $(hostname) | $(date)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"

# ─── 1. System Resources ────────────────────────────────────────────────────
section "1. System Resources"

DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [[ "$DISK_USAGE" -lt 85 ]]; then
    pass "Disk usage: ${DISK_USAGE}% (OK)"
else
    warn "Disk usage: ${DISK_USAGE}% — consider cleaning up"
fi

MEM_AVAIL=$(free -m | awk 'NR==2{print $7}')
if [[ "$MEM_AVAIL" -gt 200 ]]; then
    pass "Available memory: ${MEM_AVAIL}MB (OK)"
else
    warn "Low available memory: ${MEM_AVAIL}MB"
fi

# ─── 2. Nginx ───────────────────────────────────────────────────────────────
section "2. Nginx"

if systemctl is-active --quiet nginx; then
    pass "nginx.service is RUNNING"
else
    fail "nginx.service is NOT running"
    info "Fix: sudo systemctl restart nginx"
    info "Last error: $(journalctl -u nginx -n 5 --no-pager 2>/dev/null | tail -5)"
fi

if systemctl is-enabled --quiet nginx; then
    pass "nginx.service is enabled (auto-starts on reboot)"
else
    warn "nginx.service is NOT enabled — won't auto-start on reboot"
    info "Fix: sudo systemctl enable nginx"
fi

# Test nginx config
if nginx -t 2>/dev/null; then
    pass "Nginx config syntax OK"
else
    fail "Nginx config has syntax errors:"
    nginx -t 2>&1 | tail -10
fi

# SSL Certificate
CERT_FILE=$(nginx -T 2>/dev/null | grep ssl_certificate | grep -v key | head -1 | awk '{print $2}' | tr -d ';')
if [[ -n "$CERT_FILE" ]]; then
    if [[ -f "$CERT_FILE" ]]; then
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo 0)
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
        if [[ "$DAYS_LEFT" -gt 7 ]]; then
            pass "SSL cert valid for ${DAYS_LEFT} days (expires: ${EXPIRY})"
        elif [[ "$DAYS_LEFT" -gt 0 ]]; then
            warn "SSL cert expires in ${DAYS_LEFT} days! Renew with: certbot renew"
        else
            fail "SSL cert has EXPIRED"
        fi
    else
        fail "SSL cert file not found: $CERT_FILE"
    fi
fi

# CORS origin map from nginx
if grep -q "cors_origin" /etc/nginx/nginx.conf 2>/dev/null || \
   grep -rq "cors_origin" /etc/nginx/sites-enabled/ 2>/dev/null ||
   grep -rq "cors_origin" /etc/nginx/conf.d/ 2>/dev/null; then
    pass "CORS origin map configured in Nginx"
    info "Allowed origins:"
    grep -r "http_origin\|localhost\|campus-compass\|vercel" /etc/nginx/ 2>/dev/null | head -10 | while read -r line; do
        info "  $line"
    done
else
    warn "No CORS origin map found in Nginx config"
fi

# Check /stream/ proxy location
if grep -rq "location /stream/" /etc/nginx/ 2>/dev/null; then
    pass "/stream/ location block found in Nginx config"
    TARGET=$(grep -rA3 "location /stream/" /etc/nginx/ 2>/dev/null | grep proxy_pass | head -1)
    info "  Proxying to: $TARGET"
else
    fail "No /stream/ location block in Nginx config — WHEP cannot be reached!"
fi

if grep -rq "location /api/" /etc/nginx/ 2>/dev/null; then
    pass "/api/ location block found in Nginx config"
else
    warn "No /api/ location block — token endpoint may not be proxied"
fi

# ─── 3. Campus Compass Backend ──────────────────────────────────────────────
section "3. Campus Compass Backend (Node.js)"

if systemctl is-active --quiet campus-compass; then
    pass "campus-compass.service is RUNNING"
    info "PID: $(systemctl show -p MainPID campus-compass | cut -d= -f2)"
    info "Uptime: $(systemctl show -p ActiveEnterTimestamp campus-compass | cut -d= -f2)"
else
    fail "campus-compass.service is NOT running"
    info "Fix: sudo systemctl restart campus-compass"
    info "Last 10 log lines:"
    journalctl -u campus-compass -n 10 --no-pager 2>/dev/null
fi

if systemctl is-enabled --quiet campus-compass; then
    pass "campus-compass.service is enabled"
else
    warn "campus-compass.service is NOT enabled"
fi

# Check environment file
ENV_FILE="/etc/campus-compass.env"
if [[ -f "$ENV_FILE" ]]; then
    pass "Environment file exists: $ENV_FILE"

    # Check JWT secret
    if grep -q "STREAM_JWT_SECRET" "$ENV_FILE" && \
       [[ -n "$(grep 'STREAM_JWT_SECRET' "$ENV_FILE" | cut -d= -f2)" ]]; then
        JWT_LEN=$(grep 'STREAM_JWT_SECRET' "$ENV_FILE" | cut -d= -f2 | wc -c)
        if [[ "$JWT_LEN" -gt 20 ]]; then
            pass "STREAM_JWT_SECRET is set (${JWT_LEN} chars)"
        else
            fail "STREAM_JWT_SECRET looks too short (${JWT_LEN} chars) — use a longer secret"
        fi
    else
        fail "STREAM_JWT_SECRET is NOT set in $ENV_FILE — backend will crash!"
    fi

    # Check VPS domain
    if grep -q "VPS_DOMAIN" "$ENV_FILE"; then
        VPS_DOMAIN_VAL=$(grep "VPS_DOMAIN" "$ENV_FILE" | cut -d= -f2)
        pass "VPS_DOMAIN=${VPS_DOMAIN_VAL}"
    else
        warn "VPS_DOMAIN not set in $ENV_FILE — defaults to thanganat25.com"
    fi

    # Check CORS_ORIGINS
    if grep -q "CORS_ORIGINS" "$ENV_FILE"; then
        CORS_VAL=$(grep "CORS_ORIGINS" "$ENV_FILE" | cut -d= -f2)
        pass "CORS_ORIGINS=${CORS_VAL}"
    else
        warn "CORS_ORIGINS not set — defaults to http://localhost:3000 only"
    fi
else
    fail "Environment file NOT FOUND: $ENV_FILE"
    info "Create it with the required env vars (STREAM_JWT_SECRET, VPS_DOMAIN, CORS_ORIGINS)"
fi

# Local health check
HEALTH=$(curl -s --connect-timeout 5 http://localhost:3001/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    pass "Backend /api/health returned OK"
    UPTIME=$(echo "$HEALTH" | grep -o '"uptime":[0-9.]*' | cut -d: -f2)
    info "Backend uptime: ${UPTIME}s"
else
    fail "Backend /api/health check FAILED — service may be down or crashed"
    info "Response: $HEALTH"
fi

# Check backend is listening on port 3001
if ss -tlnp 2>/dev/null | grep ":3001" | grep -q LISTEN || \
   netstat -tlnp 2>/dev/null | grep ":3001" | grep -q LISTEN; then
    pass "Backend listening on port 3001"
else
    fail "Backend NOT listening on port 3001"
fi

# Check recent backend logs for errors
RECENT_ERRORS=$(journalctl -u campus-compass --since "10 minutes ago" --no-pager 2>/dev/null | grep -i "error\|fatal\|crash" | tail -5)
if [[ -n "$RECENT_ERRORS" ]]; then
    warn "Recent backend errors found:"
    echo "$RECENT_ERRORS" | while IFS= read -r line; do info "  $line"; done
else
    pass "No errors in backend logs (last 10 min)"
fi

# Recent stream-auth logs
info "Recent stream-auth events (last 5):"
journalctl -u campus-compass --since "1 hour ago" --no-pager 2>/dev/null | \
    grep "stream-auth\|stream-token" | tail -5 | while IFS= read -r line; do
    info "  $line"
done

# ─── 4. MediaMTX ────────────────────────────────────────────────────────────
section "4. MediaMTX"

MTX_SERVICE="mediamtx"
# Try common service names
for svc in mediamtx mediamtx.service; do
    if systemctl list-units --type=service 2>/dev/null | grep -q "$svc"; then
        MTX_SERVICE="$svc"
        break
    fi
done

if systemctl is-active --quiet "$MTX_SERVICE" 2>/dev/null; then
    pass "${MTX_SERVICE} is RUNNING"
else
    fail "${MTX_SERVICE} is NOT running"
    info "Fix: sudo systemctl restart mediamtx"
    info "Check config: /root/campus-compass-backend/mediamtx.yml or /etc/mediamtx/mediamtx.yml"
    info "Last 10 log lines:"
    journalctl -u "$MTX_SERVICE" -n 10 --no-pager 2>/dev/null
fi

# MediaMTX API
MTX_API_RESP=$(curl -s --connect-timeout 5 http://127.0.0.1:9997/v3/paths/list 2>/dev/null)
if [[ -n "$MTX_API_RESP" ]]; then
    pass "MediaMTX API responding (v3)"
    ACTIVE_PATHS=$(echo "$MTX_API_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    items = d.get('items', d.get('paths', []))
    print(f'Active paths: {len(items)}')
    for p in items:
        name = p.get('name','?')
        has_pub = bool(p.get('source') and p.get('source',{}).get('type',''))
        readers = len(p.get('readers',[]))
        print(f'  {name}: publisher={has_pub}, viewers={readers}')
except Exception as e:
    print(f'Parse error: {e}')
" 2>/dev/null)
    if [[ -n "$ACTIVE_PATHS" ]]; then
        echo "$ACTIVE_PATHS" | while IFS= read -r line; do info "  $line"; done
    fi

    # Check if live_bus-1 (or live) has a publisher
    if echo "$MTX_API_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d.get('items', d.get('paths', []))
live_paths = [p for p in items if 'live' in p.get('name','')]
has_pub = any(bool(p.get('source') and p.get('source',{}).get('type','')) for p in live_paths)
sys.exit(0 if has_pub else 1)
" 2>/dev/null; then
        pass "Pi publisher is connected to MediaMTX (stream is live!)"
    else
        fail "No publisher connected to MediaMTX — Pi is not streaming"
        info "Verify: Pi's camstream.service is running and ffmpeg is pushing RTSP"
    fi
else
    # Try v2 API
    MTX_API_RESP_V2=$(curl -s --connect-timeout 5 http://127.0.0.1:9997/v2/paths/list 2>/dev/null)
    if [[ -n "$MTX_API_RESP_V2" ]]; then
        pass "MediaMTX API responding (v2)"
    else
        fail "MediaMTX API not responding at http://127.0.0.1:9997"
        info "MediaMTX may be down or apiAddress is wrong in mediamtx.yml"
    fi
fi

# Check MediaMTX is listening on WHEP port
if ss -tlnp 2>/dev/null | grep ":8189" | grep -q LISTEN || \
   netstat -tlnp 2>/dev/null | grep ":8189" | grep -q LISTEN; then
    pass "MediaMTX WHEP/WebRTC listening on port 8189"
else
    fail "MediaMTX NOT listening on port 8189 — WebRTC/WHEP unavailable"
    info "Check webrtcAddress in mediamtx.yml"
fi

# Check RTSP port for publisher
if ss -tlnp 2>/dev/null | grep ":8554" | grep -q LISTEN || \
   netstat -tlnp 2>/dev/null | grep ":8554" | grep -q LISTEN; then
    pass "MediaMTX RTSP listening on port 8554 (Pi can publish)"
else
    fail "MediaMTX RTSP NOT listening on port 8554 — Pi cannot publish"
fi

# ─── 5. Firewall / Port Checks ──────────────────────────────────────────────
section "5. Firewall / Open Ports"

for port in 80 443 8554; do
    if ss -tlnp 2>/dev/null | grep ":${port}" | grep -q LISTEN || \
       netstat -tlnp 2>/dev/null | grep ":${port}" | grep -q LISTEN; then
        pass "Port ${port} is listening"
    else
        warn "Port ${port} is NOT listening"
    fi
done

# Check UFW if present
if command -v ufw &>/dev/null; then
    UFW_STATUS=$(ufw status 2>/dev/null | head -3)
    info "UFW status: $UFW_STATUS"
    if ufw status 2>/dev/null | grep -q "8554.*ALLOW"; then
        pass "UFW: port 8554 (RTSP) is allowed"
    else
        warn "UFW: port 8554 may be blocked — Pi won't be able to publish"
    fi
fi

# ─── 6. Summary ─────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────────"
if [[ $FAILURES -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "  ${GREEN}${BOLD}ALL VPS CHECKS PASSED${NC}"
elif [[ $FAILURES -eq 0 ]]; then
    echo -e "  ${YELLOW}${BOLD}VPS CHECKS: PASSED WITH WARNINGS${NC} (${WARNINGS} warnings)"
else
    echo -e "  ${RED}${BOLD}VPS CHECKS FAILED${NC} (${FAILURES} failures, ${WARNINGS} warnings)"
fi
echo "──────────────────────────────────────────────────────"

exit $FAILURES
REMOTE_SCRIPT

REMOTE_EXIT=$?

print_summary "check_vps.sh"
echo -e "${DIM}Log saved to: ${LOG_FILE}${NC}"

exit $REMOTE_EXIT
