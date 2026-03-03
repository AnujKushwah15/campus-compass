# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: v1.0 (Infrastructure Stabilization & Reliability)

## Must-Haves (from SPEC)
- [ ] Fully automated edge device (Pi) provisioning and service supervision.
- [ ] Robust stream authentication pipeline (Token generation -> MediaMTX Webhook).
- [ ] Real-time device health monitoring (Heartbeats, GPS/IMU status).
- [ ] Role-based UI access to streams and tracking.

## Phases

### Phase 1: Edge Layer Hardening (Raspberry Pi)
**Status**: ⬜ Not Started
**Objective**: Automate Pi provisioning, implement read-only overlays to protect the SD card, and finalize `camstream` and `sensor_service` systemd configurations for maximum resilience.
**Requirements**: REQ-01, REQ-02, REQ-06

### Phase 2: Cloud Layer Consolidation (VPS)
**Status**: ⬜ Not Started
**Objective**: Containerize MediaMTX and the Node.js backend using Docker Compose for consistent deployment, and harden the Nginx reverse proxy configurations.
**Requirements**: REQ-03, REQ-07

### Phase 3: Arbitration & Health Monitoring
**Status**: ⬜ Not Started
**Objective**: Refine the Pi vs. Phone location arbitration logic to use IMU confidence metrics, and implement the heartbeat status watcher in the backend to detect stale/offline buses.
**Requirements**: REQ-04

### Phase 4: Security & Access Control
**Status**: ⬜ Not Started
**Objective**: Finalize the role-based JWT issuing in the backend and ensure the Next.js frontend properly handles token expiration, renewals, and stream access denials.
**Requirements**: REQ-05

### Phase 5: CI/CD & Production Polish
**Status**: ⬜ Not Started
**Objective**: Setup automated deployment workflows (GitHub actions) to push backend updates to the VPS, and implement application-wide error boundaries in the Next.js app.
**Requirements**: REQ-07
