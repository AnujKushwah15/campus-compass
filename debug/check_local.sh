#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Campus Compass — Local / Frontend Stream Debug
# Checks: .env vars, Next.js config rewrites, token endpoint, CORS
# Run from project root: bash debug/check_local.sh
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date '+%Y-%m-%d_%H-%M-%S')_check_local.log"
exec > >(tee -a "$LOG_FILE") 2>&1

init_counters
echo -e "${BOLD}${MAGENTA}Campus Compass — Local / Frontend Check${NC}"
echo -e "${DIM}$(date)${NC}"

# ─── 1. Environment Variables ──────────────────────────────────────────────
section "1. Environment Variables (.env.local)"

ENV_FILE="$PROJECT_ROOT/.env.local"
if [[ -f "$ENV_FILE" ]]; then
    pass ".env.local exists at $ENV_FILE"
else
    fail ".env.local NOT FOUND at $ENV_FILE"
    warn "Copy .env.example to .env.local and fill in values"
fi

REQUIRED_VARS=(
    "NEXT_PUBLIC_VPS_DOMAIN"
    "NEXT_PUBLIC_BACKEND_URL"
    "NEXT_PUBLIC_STREAM_PATH"
)

for VAR in "${REQUIRED_VARS[@]}"; do
    VAL=$(grep "^${VAR}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
    if [[ -n "$VAL" ]]; then
        pass "${VAR}=${VAL}"
    else
        # Also check from actual environment
        VAL="${!VAR}"
        if [[ -n "$VAL" ]]; then
            pass "${VAR}=${VAL} (from environment)"
        else
            warn "${VAR} is not set in .env.local"
        fi
    fi
done

# Detect VPS domain from env file
VPS_DOMAIN=$(grep "^NEXT_PUBLIC_VPS_DOMAIN=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"')
BACKEND_URL=$(grep "^NEXT_PUBLIC_BACKEND_URL=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"')
STREAM_PATH=$(grep "^NEXT_PUBLIC_STREAM_PATH=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"')

# Fallbacks
VPS_DOMAIN="${VPS_DOMAIN:-thanganat25.com}"
BACKEND_URL="${BACKEND_URL:-https://thanganat25.com}"
STREAM_PATH="${STREAM_PATH:-live_bus-1}"

info "Using VPS_DOMAIN=${VPS_DOMAIN}"
info "Using BACKEND_URL=${BACKEND_URL}"
info "Using STREAM_PATH=${STREAM_PATH}"

# ─── 2. Next.js / next.config.mjs ─────────────────────────────────────────
section "2. Next.js Config (next.config.mjs)"

NEXT_CONFIG="$PROJECT_ROOT/next.config.mjs"
if [[ -f "$NEXT_CONFIG" ]]; then
    pass "next.config.mjs found"

    # Check for rewrites / api proxy configured
    if grep -q "stream" "$NEXT_CONFIG" 2>/dev/null; then
        pass "stream-related config found in next.config.mjs"
        info "$(grep -i 'stream' "$NEXT_CONFIG" | head -5)"
    else
        warn "No 'stream' entries found in next.config.mjs — check rewrites/headers"
    fi

    if grep -q "api" "$NEXT_CONFIG" 2>/dev/null; then
        pass "api-related config found in next.config.mjs"
    else
        warn "No 'api' entries found in next.config.mjs"
    fi
else
    fail "next.config.mjs NOT FOUND"
fi

# ─── 3. Stream Token Endpoint (Backend Health) ─────────────────────────────
section "3. Backend Connectivity — Health Check"

HEALTH_URL="${BACKEND_URL}/api/health"
info "Testing: ${HEALTH_URL}"

if command -v curl &>/dev/null; then
    HTTP_STATUS=$(curl -s -o /tmp/cc_health_resp.json -w "%{http_code}" \
        --connect-timeout 10 --max-time 15 "${HEALTH_URL}" 2>/dev/null)

    if [[ "$HTTP_STATUS" == "200" ]]; then
        pass "Backend health check returned HTTP 200"
        info "Response: $(cat /tmp/cc_health_resp.json 2>/dev/null)"
    else
        fail "Backend health check returned HTTP ${HTTP_STATUS:-TIMEOUT} (expected 200)"
        info "Check: Is VPS reachable? Is campus-compass service running?"
    fi
else
    skip "curl not available — skipping HTTP tests"
fi

# ─── 4. Stream Token Endpoint (unauthenticated — expect 401) ──────────────
section "4. Stream Token Endpoint — /api/stream-token"

TOKEN_URL="${BACKEND_URL}/api/stream-token?stream=${STREAM_PATH}"
info "Testing: ${TOKEN_URL}"

if command -v curl &>/dev/null; then
    HTTP_STATUS=$(curl -s -o /tmp/cc_token_resp.json -w "%{http_code}" \
        --connect-timeout 10 --max-time 15 "${TOKEN_URL}" 2>/dev/null)

    if [[ "$HTTP_STATUS" == "401" ]]; then
        pass "/api/stream-token returned 401 (correct — no Firebase token supplied)"
        info "Response: $(cat /tmp/cc_token_resp.json 2>/dev/null)"
    elif [[ "$HTTP_STATUS" == "200" ]]; then
        warn "/api/stream-token returned 200 without auth (endpoint may be open!)"
    elif [[ "$HTTP_STATUS" == "000" ]]; then
        fail "/api/stream-token — Connection refused or timeout"
        info "Backend may be down. Check VPS."
    else
        warn "/api/stream-token returned unexpected HTTP ${HTTP_STATUS}"
        info "Response: $(cat /tmp/cc_token_resp.json 2>/dev/null)"
    fi
else
    skip "curl not available — skipping HTTP tests"
fi

# ─── 5. WHEP Endpoint Reachability ────────────────────────────────────────
section "5. WHEP Endpoint Reachability"

WHEP_URL="https://${VPS_DOMAIN}/stream/${STREAM_PATH}/whep"
info "Testing: ${WHEP_URL}"

if command -v curl &>/dev/null; then
    HTTP_STATUS=$(curl -s -o /tmp/cc_whep_resp.txt -w "%{http_code}" \
        --connect-timeout 10 --max-time 15 \
        -X POST \
        -H "Content-Type: application/sdp" \
        --data "" \
        "${WHEP_URL}" 2>/dev/null)

    if [[ "$HTTP_STATUS" == "401" ]]; then
        pass "WHEP endpoint returned 401 (correct — no token supplied)"
    elif [[ "$HTTP_STATUS" == "404" ]]; then
        fail "WHEP endpoint returned 404 — stream path '${STREAM_PATH}' not found on MediaMTX"
    elif [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]]; then
        warn "WHEP returned ${HTTP_STATUS} without token — auth may not be enforced!"
    elif [[ "$HTTP_STATUS" == "000" ]]; then
        fail "WHEP endpoint — Connection refused or timeout (is Nginx/MediaMTX running?)"
    else
        warn "WHEP endpoint returned HTTP ${HTTP_STATUS}"
        info "Response: $(cat /tmp/cc_whep_resp.txt 2>/dev/null | head -5)"
    fi
else
    skip "curl not available — skipping WHEP test"
fi

# ─── 6. CORS Headers Check ────────────────────────────────────────────────
section "6. CORS Headers on Backend"

if command -v curl &>/dev/null; then
    ORIGIN="http://localhost:3000"
    info "Checking CORS headers from Origin: ${ORIGIN}"

    CORS_HEADERS=$(curl -s -I -o /dev/null \
        -H "Origin: ${ORIGIN}" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Authorization" \
        --connect-timeout 10 --max-time 15 \
        -X OPTIONS \
        "${BACKEND_URL}/api/stream-token" 2>/dev/null)

    ALLOW_ORIGIN=$(curl -s -D - -o /dev/null \
        -H "Origin: ${ORIGIN}" \
        --connect-timeout 10 --max-time 15 \
        "${BACKEND_URL}/health" 2>/dev/null | grep -i "access-control-allow-origin")

    if [[ -n "$ALLOW_ORIGIN" ]]; then
        pass "CORS header present: $ALLOW_ORIGIN"
    else
        warn "No Access-Control-Allow-Origin header found on /health"
        info "Check: Nginx CORS config / cors_origin map in vps_nginx.conf"
    fi
else
    skip "curl not available — skipping CORS check"
fi

# ─── 7. Frontend Component Files ──────────────────────────────────────────
section "7. Frontend Stream Component Files"

# Look for the video/stream component
STREAM_COMPONENTS=$(find "$PROJECT_ROOT" -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" 2>/dev/null | \
    grep -i -v "node_modules\|\.next" | \
    xargs grep -l -i "whep\|stream-token\|mediamtx\|WHEPClient\|VideoPlayer" 2>/dev/null)

if [[ -n "$STREAM_COMPONENTS" ]]; then
    pass "Stream component files found:"
    echo "$STREAM_COMPONENTS" | while read -r f; do
        info "  $f"
    done
else
    warn "Could not find any file referencing 'whep', 'stream-token', or 'WHEPClient'"
fi

# Check for WHEP player implementation
WHEP_FILES=$(find "$PROJECT_ROOT" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
    grep -i -v "node_modules\|\.next" | \
    xargs grep -l -i "WHEPClient\|new RTCPeerConnection\|ice" 2>/dev/null)

if [[ -n "$WHEP_FILES" ]]; then
    pass "WHEP/WebRTC player implementation found:"
    echo "$WHEP_FILES" | while read -r f; do
        info "  $f"
    done
else
    warn "No WHEP/WebRTC client implementation found in frontend"
fi

# ─── 8. Dev Server Check ─────────────────────────────────────────────────
section "8. Local Dev Server"

if command -v curl &>/dev/null; then
    DEV_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        --connect-timeout 3 --max-time 5 \
        "http://localhost:3000" 2>/dev/null)

    if [[ "$DEV_STATUS" == "200" || "$DEV_STATUS" == "307" || "$DEV_STATUS" == "304" ]]; then
        pass "Next.js dev server running at http://localhost:3000 (HTTP ${DEV_STATUS})"
    else
        warn "Next.js dev server not responding at http://localhost:3000 (HTTP ${DEV_STATUS:-timeout})"
        info "Start it with: npm run dev"
    fi
else
    skip "curl not available — skipping dev server check"
fi

# ─── Summary ──────────────────────────────────────────────────────────────
print_summary "check_local.sh"
echo -e "${DIM}Log saved to: ${LOG_FILE}${NC}"

exit $FAILURES
