#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Campus Compass — Master Stream Debug Orchestrator
#
# Runs all stream diagnostic checks in sequence and produces a final report.
# Usage: bash debug/debug_stream.sh [--skip-pi] [--skip-vps] [--local-only]
#
# Options:
#   --skip-pi     Do not SSH into Raspberry Pi
#   --skip-vps    Do not SSH into VPS
#   --local-only  Only run local/network checks
#
# Run from project root with Git Bash or WSL on Windows.
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
MASTER_LOG="$LOG_DIR/${TIMESTAMP}_debug_stream.log"

# ─── Option parsing ─────────────────────────────────────────────────────────
SKIP_PI=false
SKIP_VPS=false
LOCAL_ONLY=false

for arg in "$@"; do
    case "$arg" in
        --skip-pi)    SKIP_PI=true ;;
        --skip-vps)   SKIP_VPS=true ;;
        --local-only) LOCAL_ONLY=true; SKIP_PI=true; SKIP_VPS=true ;;
    esac
done

# ─── Header ─────────────────────────────────────────────────────────────────
print_banner() {
    echo ""
    echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║   Campus Compass — Stream Diagnostics               ║${NC}"
    echo -e "${BOLD}${BLUE}║   $(date '+%Y-%m-%d %H:%M:%S')                           ║${NC}"
    echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    if [[ "$SKIP_PI" == "true" ]]; then echo -e "${YELLOW}  ⚠ Pi checks SKIPPED${NC}"; fi
    if [[ "$SKIP_VPS" == "true" ]]; then echo -e "${YELLOW}  ⚠ VPS checks SKIPPED${NC}"; fi
    echo ""
}

# ─── Run a check script and collect results ─────────────────────────────────
declare -A CHECK_RESULTS
declare -A CHECK_STATUS   # 0=pass, 1=fail, 2=skip

run_check() {
    local NAME="$1"
    local SCRIPT="$2"
    local SKIP="$3"  # 'true' to skip

    echo ""
    echo -e "${BOLD}${CYAN}▶ Running: ${NAME}${NC}"
    echo -e "${DIM}  Script: ${SCRIPT}${NC}"

    if [[ "$SKIP" == "true" ]]; then
        echo -e "  ${DIM}– SKIPPED${NC}"
        CHECK_STATUS[$NAME]=2
        return 0
    fi

    if [[ ! -f "$SCRIPT" ]]; then
        echo -e "  ${RED}✘ Script not found: ${SCRIPT}${NC}"
        CHECK_STATUS[$NAME]=1
        return 1
    fi

    # Run the check, capture output to both terminal and master log
    bash "$SCRIPT" 2>&1 | tee -a "$MASTER_LOG"
    local EXIT_CODE=${PIPESTATUS[0]}

    if [[ $EXIT_CODE -eq 0 ]]; then
        CHECK_STATUS[$NAME]=0
    else
        CHECK_STATUS[$NAME]=1
    fi

    return $EXIT_CODE
}

# ─── Architecture Overview ──────────────────────────────────────────────────
print_architecture() {
    echo -e "${DIM}"
    echo "  Stream Pipeline:"
    echo "  ┌─────────────┐    RTSP (TCP)     ┌─────────────────────────────┐"
    echo "  │  IP Camera  │ ──────────────→  │  Raspberry Pi (ffmpeg)      │"
    echo "  └─────────────┘                   └──────────────┬──────────────┘"
    echo "                                                    │ RTSP :8554"
    echo "                                                    ↓"
    echo "  ┌─────────────────────────────────────────────────────────────────┐"
    echo "  │  VPS                                                             │"
    echo "  │   MediaMTX :8554 ──→ :8189 (WHEP) ──→ Nginx :443/stream/      │"
    echo "  │   Backend  :3001 ← /api/ ← Nginx                               │"
    echo "  └─────────────────────────────────────────────────────────────────┘"
    echo "                                    ↓ HTTPS / WebRTC"
    echo "  ┌─────────────────────────────────────────────────────────────────┐"
    echo "  │  Browser (Frontend)                                              │"
    echo "  │   1. GET /api/stream-token  (Firebase ID token → JWT)           │"
    echo "  │   2. POST /stream/.../whep?token=JWT  (WHEP negotiate)          │"
    echo "  │   3. WebRTC ICE → video stream                                  │"
    echo "  └─────────────────────────────────────────────────────────────────┘"
    echo -e "${NC}"
}

# ─── Final Summary ──────────────────────────────────────────────────────────
print_final_summary() {
    echo ""
    echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║   DIAGNOSTIC SUMMARY                                 ║${NC}"
    echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""

    local TOTAL_FAIL=0
    local TOTAL_SKIP=0

    for CHECK in "Local/Frontend" "VPS" "Raspberry Pi" "Network"; do
        STATUS="${CHECK_STATUS[$CHECK]:-2}"
        case "$STATUS" in
            0) echo -e "  ${GREEN}✔${NC}  ${CHECK}" ;;
            1) echo -e "  ${RED}✘${NC}  ${CHECK}"; TOTAL_FAIL=$((TOTAL_FAIL+1)) ;;
            2) echo -e "  ${DIM}–${NC}  ${DIM}${CHECK} (skipped)${NC}"; TOTAL_SKIP=$((TOTAL_SKIP+1)) ;;
        esac
    done

    echo ""
    if [[ $TOTAL_FAIL -eq 0 ]]; then
        echo -e "  ${GREEN}${BOLD}All checks PASSED — pipeline should be working!${NC}"
        echo ""
        echo -e "  ${DIM}If the stream still doesn't appear in the browser:${NC}"
        echo -e "  ${DIM}  1. Open browser DevTools → Console tab${NC}"
        echo -e "  ${DIM}  2. Look for WebRTC ICE errors or failed fetch() on /api/stream-token${NC}"
        echo -e "  ${DIM}  3. Check the RTCPeerConnection iceConnectionState${NC}"
        echo -e "  ${DIM}  4. Verify the frontend Firebase ID token is fresh (not expired)${NC}"
    else
        echo -e "  ${RED}${BOLD}${TOTAL_FAIL} check(s) FAILED — see details above${NC}"
        echo ""
        echo -e "  ${BOLD}Quick fix guide:${NC}"
        
        # Pi hints
        if [[ "${CHECK_STATUS['Raspberry Pi']}" == "1" ]]; then
            echo -e "  ${YELLOW}▸ Pi issues detected:${NC}"
            echo -e "    • SSH to Pi: ${CYAN}ssh pi${NC}"
            echo -e "    • Restart camera service: ${CYAN}sudo systemctl restart camstream${NC}"
            echo -e "    • Check logs: ${CYAN}sudo journalctl -u camstream -f${NC}"
            echo -e "    • Verify camera is on LAN and RTSP works"
        fi

        # VPS hints
        if [[ "${CHECK_STATUS['VPS']}" == "1" ]]; then
            echo -e "  ${YELLOW}▸ VPS issues detected:${NC}"
            echo -e "    • SSH to VPS: ${CYAN}ssh vps${NC}"
            echo -e "    • Restart backend: ${CYAN}sudo systemctl restart campus-compass${NC}"
            echo -e "    • Restart MediaMTX: ${CYAN}sudo systemctl restart mediamtx${NC}"
            echo -e "    • Restart Nginx: ${CYAN}sudo systemctl restart nginx${NC}"
            echo -e "    • Check JWT secret: ${CYAN}grep STREAM_JWT_SECRET /etc/campus-compass.env${NC}"
        fi

        # Network hints
        if [[ "${CHECK_STATUS['Network']}" == "1" ]]; then
            echo -e "  ${YELLOW}▸ Network/CORS issues detected:${NC}"
            echo -e "    • Check Nginx CORS map in nginx config on VPS"
            echo -e "    • Verify frontend origin is in allowed list"
            echo -e "    • Ensure ports 443, 8554 are open in VPS firewall"
        fi
    fi

    echo ""
    echo -e "  ${DIM}Full log: ${MASTER_LOG}${NC}"
    echo ""
}

# ─── Bootstrap ──────────────────────────────────────────────────────────────
exec > >(tee -a "$MASTER_LOG") 2>&1

print_banner
print_architecture

# ─── Run Checks ─────────────────────────────────────────────────────────────
# Check 1: Local / Frontend
run_check "Local/Frontend" "$SCRIPT_DIR/check_local.sh" "false"

# Check 2: Network connectivity
run_check "Network" "$SCRIPT_DIR/check_network.sh" "false"

# Check 3: VPS (via SSH)
run_check "VPS" "$SCRIPT_DIR/check_vps.sh" "$SKIP_VPS"

# Check 4: Pi (via SSH)
run_check "Raspberry Pi" "$SCRIPT_DIR/check_pi.sh" "$SKIP_PI"

# ─── Final Summary ──────────────────────────────────────────────────────────
print_final_summary

# Exit with failure if any check failed
for CHECK in "Local/Frontend" "VPS" "Raspberry Pi" "Network"; do
    if [[ "${CHECK_STATUS[$CHECK]}" == "1" ]]; then
        exit 1
    fi
done

exit 0
