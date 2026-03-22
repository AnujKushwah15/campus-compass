#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Campus Compass — Network / Connectivity Debug
# Tests: port reachability, CORS headers, WHEP flow, WebRTC ICE, latency
# Run from local machine: bash debug/check_network.sh
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date '+%Y-%m-%d_%H-%M-%S')_check_network.log"
exec > >(tee -a "$LOG_FILE") 2>&1

init_counters
echo -e "${BOLD}${MAGENTA}Campus Compass — Network / Connectivity Check${NC}"
echo -e "${DIM}$(date)${NC}"

# Get VPS domain
VPS_DOMAIN=$(grep "^NEXT_PUBLIC_VPS_DOMAIN=" "$PROJECT_ROOT/.env.local" 2>/dev/null | cut -d= -f2- | tr -d '"')
VPS_DOMAIN="${VPS_DOMAIN:-thanganat25.com}"
STREAM_PATH=$(grep "^NEXT_PUBLIC_STREAM_PATH=" "$PROJECT_ROOT/.env.local" 2>/dev/null | cut -d= -f2- | tr -d '"')
STREAM_PATH="${STREAM_PATH:-live_bus-1}"
BACKEND_URL=$(grep "^NEXT_PUBLIC_BACKEND_URL=" "$PROJECT_ROOT/.env.local" 2>/dev/null | cut -d= -f2- | tr -d '"')
BACKEND_URL="${BACKEND_URL:-https://${VPS_DOMAIN}}"

info "VPS Domain : ${VPS_DOMAIN}"
info "Backend URL: ${BACKEND_URL}"
info "Stream Path: ${STREAM_PATH}"

# ─── 1. Basic Connectivity ──────────────────────────────────────────────────
section "1. Basic Connectivity"

if ping -c 3 -W 5 "$VPS_DOMAIN" &>/dev/null 2>&1 || \
   ping -n 3 "$VPS_DOMAIN" &>/dev/null 2>&1; then
    RTT=$(ping -c 3 "$VPS_DOMAIN" 2>/dev/null | tail -1 | grep -oP 'avg = \K[0-9.]+' || \
          ping -c 3 "$VPS_DOMAIN" 2>/dev/null | tail -1 | awk -F'/' '{print $5}')
    pass "Ping to ${VPS_DOMAIN} OK (avg RTT: ${RTT:-?}ms)"
else
    warn "Ping to ${VPS_DOMAIN} failed (may be blocked by firewall, trying TCP checks)"
fi

# DNS resolution
if command -v nslookup &>/dev/null; then
    DNS_RESULT=$(nslookup "$VPS_DOMAIN" 2>/dev/null | grep "Address:" | grep -v "#" | tail -1)
    if [[ -n "$DNS_RESULT" ]]; then
        pass "DNS resolution: ${VPS_DOMAIN} → $DNS_RESULT"
    else
        fail "DNS resolution failed for ${VPS_DOMAIN}"
    fi
elif command -v dig &>/dev/null; then
    DNS_RESULT=$(dig +short "$VPS_DOMAIN" 2>/dev/null | tail -1)
    if [[ -n "$DNS_RESULT" ]]; then
        pass "DNS resolution: ${VPS_DOMAIN} → ${DNS_RESULT}"
    else
        fail "DNS resolution failed for ${VPS_DOMAIN}"
    fi
fi

# ─── 2. Port Reachability ───────────────────────────────────────────────────
section "2. Port Reachability from Local Machine"

check_tcp_port() {
    local HOST="$1"
    local PORT="$2"
    local DESC="$3"

    if command -v nc &>/dev/null; then
        if nc -z -w 10 "$HOST" "$PORT" 2>/dev/null; then
            pass "Port ${PORT} (${DESC}) is reachable"
            return 0
        else
            fail "Port ${PORT} (${DESC}) is NOT reachable"
            return 1
        fi
    elif command -v curl &>/dev/null; then
        # Use curl --connect-timeout as port probe
        curl -s --connect-timeout 8 -o /dev/null "telnet://${HOST}:${PORT}" 2>/dev/null
        EXIT=$?
        if [[ $EXIT -eq 0 || $EXIT -eq 56 ]]; then  # 56 = recv failure (port open but protocol mismatch)
            pass "Port ${PORT} (${DESC}) is reachable"
            return 0
        else
            fail "Port ${PORT} (${DESC}) is NOT reachable"
            return 1
        fi
    else
        # /dev/tcp fallback
        if timeout 10 bash -c ">/dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
            pass "Port ${PORT} (${DESC}) is reachable"
            return 0
        else
            fail "Port ${PORT} (${DESC}) is NOT reachable"
            return 1
        fi
    fi
}

check_tcp_port "$VPS_DOMAIN" 443  "HTTPS / Nginx"
check_tcp_port "$VPS_DOMAIN" 80   "HTTP (redirect to HTTPS)"
check_tcp_port "$VPS_DOMAIN" 8554 "MediaMTX RTSP (for Pi publisher)"

info "Note: Port 8189 (WebRTC WHEP) is proxied via Nginx on 443 — no direct check needed"
info "Note: Port 9997 (MediaMTX API) should be localhost-only on VPS (not externally reachable)"

# Check that API port is NOT externally reachable (security check)
if command -v nc &>/dev/null; then
    if nc -z -w 5 "$VPS_DOMAIN" 9997 2>/dev/null; then
        fail "SECURITY: Port 9997 (MediaMTX API) is externally reachable — should be localhost only!"
    else
        pass "Security: Port 9997 (MediaMTX API) is NOT externally reachable (correct)"
    fi
fi

if command -v nc &>/dev/null; then
    if nc -z -w 5 "$VPS_DOMAIN" 3001 2>/dev/null; then
        warn "Port 3001 (backend) is directly reachable from internet — should be proxied via Nginx only"
    else
        pass "Security: Port 3001 (backend) is NOT directly exposed (correct, proxied via Nginx)"
    fi
fi

# ─── 3. SSL / HTTPS ─────────────────────────────────────────────────────────
section "3. SSL Certificate"

if command -v openssl &>/dev/null; then
    SSL_INFO=$(echo | timeout 10 openssl s_client -connect "${VPS_DOMAIN}:443" -servername "$VPS_DOMAIN" 2>/dev/null)
    
    if echo "$SSL_INFO" | grep -q "CONNECTED"; then
        pass "SSL handshake succeeded with ${VPS_DOMAIN}"
        
        EXPIRY=$(echo "$SSL_INFO" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        if [[ -n "$EXPIRY" ]]; then
            EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || \
                           python3 -c "import datetime; print(int(datetime.datetime.strptime('$EXPIRY','%b %d %H:%M:%S %Y %Z').timestamp()))" 2>/dev/null)
            NOW_EPOCH=$(date +%s)
            if [[ -n "$EXPIRY_EPOCH" ]]; then
                DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
                if [[ "$DAYS_LEFT" -gt 14 ]]; then
                    pass "SSL cert valid for ${DAYS_LEFT} days"
                elif [[ "$DAYS_LEFT" -gt 0 ]]; then
                    warn "SSL cert expires in ${DAYS_LEFT} days — renew soon!"
                else
                    fail "SSL cert has EXPIRED"
                fi
            else
                info "SSL expiry: $EXPIRY"
            fi
        fi
        
        # Check cert chain
        CN=$(echo "$SSL_INFO" | openssl x509 -noout -subject 2>/dev/null | grep -o "CN=.*" | head -1)
        info "Certificate: $CN"
    else
        fail "SSL handshake failed with ${VPS_DOMAIN}"
    fi
else
    skip "openssl not available — skipping SSL cert check"
fi

# ─── 4. CORS Header Validation ──────────────────────────────────────────────
section "4. CORS Header Validation"

if command -v curl &>/dev/null; then
    for ORIGIN in "http://localhost:3000" "https://campus-compass-vercel.app" "https://thanganat25.com"; do
        RESP_HEADERS=$(curl -s -D - -o /dev/null \
            -H "Origin: ${ORIGIN}" \
            --connect-timeout 10 --max-time 15 \
            "${BACKEND_URL}/health" 2>/dev/null)

        ALLOW_ORIGIN=$(echo "$RESP_HEADERS" | grep -i "access-control-allow-origin" | head -1)
        
        if [[ -n "$ALLOW_ORIGIN" ]]; then
            if echo "$ALLOW_ORIGIN" | grep -q "$ORIGIN\|\*"; then
                pass "CORS OK for origin: ${ORIGIN}"
                info "  Header: $(echo "$ALLOW_ORIGIN" | tr -d '\r')"
            else
                ACTUAL=$(echo "$ALLOW_ORIGIN" | tr -d '\r')
                warn "CORS mismatch for origin: ${ORIGIN}"
                info "  Expected origin in header, got: ${ACTUAL}"
            fi
        else
            warn "No CORS header for origin: ${ORIGIN}"
            info "  Check: cors_origin map in Nginx config for this origin"
        fi
    done
fi

# ─── 5. Nginx Proxy Routing ─────────────────────────────────────────────────
section "5. Nginx Proxy Routing"

if command -v curl &>/dev/null; then
    # /api/health → backend
    subsection "/api/health endpoint"
    STATUS=$(curl -s -o /tmp/cc_net_health.json -w "%{http_code}" \
        --connect-timeout 10 --max-time 15 \
        "${BACKEND_URL}/api/health" 2>/dev/null)
    if [[ "$STATUS" == "200" ]]; then
        pass "GET /api/health → 200 OK (Nginx→Backend proxy OK)"
    else
        fail "GET /api/health → HTTP ${STATUS} (expected 200)"
    fi

    # /api/stream-token → backend (expect 401 without token)
    subsection "/api/stream-token endpoint"
    STATUS=$(curl -s -o /tmp/cc_net_token.json -w "%{http_code}" \
        --connect-timeout 10 --max-time 15 \
        "${BACKEND_URL}/api/stream-token?stream=${STREAM_PATH}" 2>/dev/null)
    if [[ "$STATUS" == "401" ]]; then
        pass "GET /api/stream-token → 401 (Nginx→Backend proxy OK, auth required)"
    elif [[ "$STATUS" == "200" ]]; then
        warn "GET /api/stream-token → 200 WITHOUT auth token — check auth config!"
    else
        fail "GET /api/stream-token → HTTP ${STATUS} (expected 401)"
        info "Response: $(cat /tmp/cc_net_token.json 2>/dev/null)"
    fi

    # /stream/ → MediaMTX (WHEP OPTIONS preflight)
    subsection "/stream/ WHEP endpoint"
    STATUS=$(curl -s -o /tmp/cc_net_whep.txt -w "%{http_code}" \
        --connect-timeout 10 --max-time 15 \
        -X OPTIONS \
        -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: POST" \
        "https://${VPS_DOMAIN}/stream/${STREAM_PATH}/whep" 2>/dev/null)
    
    if [[ "$STATUS" == "204" || "$STATUS" == "200" ]]; then
        pass "OPTIONS /stream/${STREAM_PATH}/whep → ${STATUS} (CORS preflight OK)"
    elif [[ "$STATUS" == "404" ]]; then
        fail "OPTIONS /stream/${STREAM_PATH}/whep → 404 (stream path not found)"
        info "Check: Is '${STREAM_PATH}' configured in mediamtx.yml paths?"
    elif [[ "$STATUS" == "000" ]]; then
        fail "OPTIONS /stream/.../whep → Connection failed (Nginx may be down)"
    else
        warn "OPTIONS /stream/${STREAM_PATH}/whep → HTTP ${STATUS}"
        info "Response: $(cat /tmp/cc_net_whep.txt 2>/dev/null | head -3)"
    fi

    # Test actual WHEP POST without token — should get 401
    STATUS=$(curl -s -o /tmp/cc_net_whep2.txt -w "%{http_code}" \
        --connect-timeout 10 --max-time 15 \
        -X POST \
        -H "Content-Type: application/sdp" \
        --data "" \
        "https://${VPS_DOMAIN}/stream/${STREAM_PATH}/whep" 2>/dev/null)

    if [[ "$STATUS" == "401" ]]; then
        pass "POST /stream/${STREAM_PATH}/whep → 401 (auth enforced correctly)"
    elif [[ "$STATUS" == "404" ]]; then
        fail "POST /stream/${STREAM_PATH}/whep → 404 (stream not found or no publisher)"
        info "Ensure Pi camstream.service is running and pushing to this path"
    elif [[ "$STATUS" == "200" || "$STATUS" == "201" ]]; then
        warn "WHEP POST succeeded without a token — auth may not be configured!"
    else
        warn "POST /stream/${STREAM_PATH}/whep → HTTP ${STATUS}"
        info "$(cat /tmp/cc_net_whep2.txt 2>/dev/null | head -3)"
    fi
fi

# ─── 6. WHEP End-to-End Token Flow Simulation ───────────────────────────────
section "6. WHEP Token Flow Simulation (with mock token)"

if command -v curl &>/dev/null; then
    # We can't get a real Firebase token from here, but we can test the flow
    # with a fake token to verify the error behavior is correct
    FAKE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ0ZXN0IiwiaWF0IjoxfQ.test"
    
    STATUS=$(curl -s -o /tmp/cc_net_tktest.json -w "%{http_code}" \
        --connect-timeout 10 --max-time 15 \
        -H "Authorization: Bearer ${FAKE_TOKEN}" \
        "${BACKEND_URL}/api/stream-token?stream=${STREAM_PATH}" 2>/dev/null)
    RESP=$(cat /tmp/cc_net_tktest.json 2>/dev/null)

    if [[ "$STATUS" == "401" ]]; then
        pass "Token endpoint correctly rejects invalid Firebase token (401)"
        info "Response: $RESP"
    elif [[ "$STATUS" == "500" ]]; then
        warn "Token endpoint returned 500 — may indicate Firebase Admin SDK issue"
        info "Response: $RESP"
    else
        warn "Token endpoint returned HTTP ${STATUS} for invalid token"
        info "Response: $RESP"
    fi
fi

# ─── 7. ICE / STUN Connectivity (WebRTC) ───────────────────────────────────
section "7. WebRTC / ICE STUN Reachability"

# Test common STUN servers
STUN_SERVERS=("stun.l.google.com:19302" "stun1.l.google.com:19302")
for STUN in "${STUN_SERVERS[@]}"; do
    STUN_HOST="${STUN%%:*}"
    STUN_PORT="${STUN##*:}"
    if command -v nc &>/dev/null; then
        if nc -z -u -w 5 "$STUN_HOST" "$STUN_PORT" 2>/dev/null; then
            pass "STUN ${STUN} reachable (UDP)"
        else
            # UDP probes often fail via nc — just check if host resolves
            if nslookup "$STUN_HOST" &>/dev/null 2>&1; then
                info "STUN ${STUN_HOST} DNS resolves (UDP check unreliable with nc)"
            else
                warn "Cannot resolve STUN server: ${STUN_HOST}"
            fi
        fi
    else
        if nslookup "$STUN_HOST" &>/dev/null 2>&1; then
            pass "STUN server ${STUN_HOST} DNS resolves"
        else
            warn "Cannot resolve STUN server: ${STUN_HOST}"
        fi
    fi
done

info "Note: Full ICE connectivity is browser-specific and cannot be tested from shell"
info "      Open browser console and check RTCPeerConnection iceConnectionState"

# ─── Summary ──────────────────────────────────────────────────────────────
print_summary "check_network.sh"
echo -e "${DIM}Log saved to: ${LOG_FILE}${NC}"

exit $FAILURES
