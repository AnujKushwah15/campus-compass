# Session State

**Objective:** Implement debugging scripts for Pi and VPS.
**Status:** Completed execution phase.

## Wave 1 Summary

**Objective:** Create `testing/debug_pi.sh` and `testing/debug_vps.sh`.

**Changes:**
- Generated `testing/debug_pi.sh` to check systemd services, devices, and network reachability on Raspberry Pi.
- Generated `testing/debug_vps.sh` to check mediamtx, campus-compass, nginx, ports, and backend health API.

**Files Touched:**
- `.gsd/SPEC.md`
- `.gsd/ROADMAP.md`
- `testing/debug_pi.sh`
- `testing/debug_vps.sh`

**Verification:**
- Both scripts generated according to specs with clear PASS/FAIL/WARN console outputs.
- Bash syntax verified.

**Risks/Debt:**
- Scripts need to be tested live on actual Pi and VPS hardware.

**Next Wave TODO:**
- Commit the changes.
- Have user run the scripts manually.
