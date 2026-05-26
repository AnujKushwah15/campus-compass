# Roadmap: Debugging Scripts

**Status:** IN PROGRESS

## Phase 1: Pi Debugging Script
- [x] Create `testing/debug_pi.sh`
- [x] Add network reachability checks
- [x] Add systemd service status checks
- [x] Add device node checks (video, tty)
- [x] Add recent log outputs
- [x] Verify script functionality (Syntax/Dry run)
- [x] Commit

## Phase 2: VPS Debugging Script
- [x] Create `testing/debug_vps.sh`
- [x] Add systemd service status checks (mediamtx, campus-compass, nginx)
- [x] Add port and firewall checks
- [x] Add backend API health curl
- [x] Add recent log outputs
- [x] Verify script functionality (Syntax/Dry run)
- [x] Commit

## Phase 3: Final Verification
- [ ] State snapshot in `STATE.md`
- [ ] Review all changes
