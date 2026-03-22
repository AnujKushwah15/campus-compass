#!/usr/bin/env bash
# ─── ANSI color helpers ───────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'  # No Color

# Section header
section() {
    echo ""
    echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════${NC}"
}

# Sub-section
subsection() {
    echo ""
    echo -e "${CYAN}  ── $1 ──${NC}"
}

# Result helpers
pass() { echo -e "  ${GREEN}✔${NC}  $1"; }
fail() { echo -e "  ${RED}✘${NC}  $1"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; WARNINGS=$((WARNINGS + 1)); }
info() { echo -e "  ${DIM}ℹ${NC}  $1"; }
skip() { echo -e "  ${DIM}–${NC}  ${DIM}$1${NC}"; }

# Initialize counters (call at the top of each script)
init_counters() {
    FAILURES=0
    WARNINGS=0
    CHECKS=0
}

# Summary line
print_summary() {
    local script_name="$1"
    echo ""
    echo -e "${BOLD}${BLUE}──────────────────────────────────────────────────────${NC}"
    if [[ $FAILURES -eq 0 && $WARNINGS -eq 0 ]]; then
        echo -e "  ${GREEN}${BOLD}ALL CHECKS PASSED${NC} — ${script_name}"
    elif [[ $FAILURES -eq 0 ]]; then
        echo -e "  ${YELLOW}${BOLD}PASSED WITH WARNINGS${NC} — ${script_name} (${WARNINGS} warnings)"
    else
        echo -e "  ${RED}${BOLD}FAILED${NC} — ${script_name} (${FAILURES} failures, ${WARNINGS} warnings)"
    fi
    echo -e "${BOLD}${BLUE}──────────────────────────────────────────────────────${NC}"
}
