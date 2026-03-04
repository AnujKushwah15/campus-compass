# REQUIREMENTS.md

## Format
| ID | Requirement | Source | Status |
|----|-------------|--------|--------|
| REQ-01 | Raspberry Pi must run `camstream.service` and `sensor_service.service` under systemd with auto-restart policies. | SPEC Goal 1 | Pending |
| REQ-02 | Pi services must push RTSP video to the VPS MediaMTX server and telemetry to Firebase RTDB. | SPEC Goal 1 | Pending |
| REQ-03 | The backend must provide a `/stream-auth` webhook to validate MediaMTX read/publish actions using JWTs. | SPEC Goal 2 & 3 | Pending |
| REQ-04 | The backend must monitor Pi heartbeats via Firebase RTDB and update device status (online/offline). | SPEC Goal 2 & 4 | Pending |
| REQ-05 | Role-based stream access must be enforced: Parents can only view assigned buses; Admins view all. | SPEC Goal 3 | Pending |
| REQ-06 | Edge devices (Raspberry Pis) must not expose any public web servers or direct stream access ports. | SPEC Constraints & Out of Scope | Pending |
| REQ-07 | System must recover gracefully from simulated MediaMTX or ffmpeg crashes without manual intervention. | SPEC Goal 4 | Pending |
| REQ-08 | System must include a dedicated admin dashboard UI that visualizes device health, GPS, and IMU status in a GUI. | User Request (Phase 3) | Pending |
