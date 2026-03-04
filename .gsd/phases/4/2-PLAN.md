---
phase: 4
plan: 2
wave: 1
---

# Plan 4.2: Edge Integration & Auto-Recovery Verification

## Objective
Finalize and document the Edge Integration (Raspberry Pi) setup, ensuring that `camstream.service` and `sensor_service.service` are properly configured with systemd for auto-recovery and load the correct environment variables, pushing telemetry to the VPS.

## Context
- .gsd/SPEC.md
- backend/pi/README.md
- backend/pi/init_pi.sh
- backend/pi/camstream.service
- backend/pi/sensor_service.service

## Tasks

<task type="auto">
  <name>Verify Systemd Auto-Recovery Configurations</name>
  <files>
    - backend/pi/camstream.service
    - backend/pi/sensor_service.service
    - backend/pi/init_pi.sh
  </files>
  <action>
    - Inspect `camstream.service` and `sensor_service.service` to ensure both have `Restart=always` and a reasonable `RestartSec` defined to handle hardware/network disconnects gracefully.
    - Check the deployment script (`init_pi.sh`) to guarantee these services are copied to `/etc/systemd/system/` and enabled on boot via `systemctl enable`.
    - If any configurations for logging or restart policies are sub-optimal, apply the fixes directly.
  </action>
  <verify>grep "Restart=always" backend/pi/*.service</verify>
  <done>Both systemd service files contain proper auto-recovery configurations, and `init_pi.sh` handles enablement correctly.</done>
</task>

<task type="auto">
  <name>Finalize Edge Deployment Documentation</name>
  <files>
    - backend/pi/README.md
  </files>
  <action>
    - Ensure `backend/pi/README.md` correctly references `camstream.service` and `sensor_service.service`. 
    - Verify that instructions for installation outline the automated `init_pi.sh` method as the primary provisioning flow.
    - Make any necessary updates to improve clarity around the auto-recovery behavior.
  </action>
  <verify>cat backend/pi/README.md</verify>
  <done>The README document is comprehensive and lists the correct initialization approach for systemd auto-recovery.</done>
</task>

## Success Criteria
- [ ] Edge systemd service files represent production-ready auto-recovery parameters.
- [ ] `init_pi.sh` provides a complete shell setup flow, requiring no manual service enablement by the user.
- [ ] The `README.md` serves as a source of truth for pi edge deployment.
