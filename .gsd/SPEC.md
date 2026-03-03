# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
Campus Compass is a distributed, production-oriented transportation monitoring infrastructure for educational institutions. It connects edge hardware (Raspberry Pi on buses) with centralized cloud infrastructure (VPS) to create a reliable, observable, and controllable system featuring live RTSP video streaming and synchronized GPS/IMU tracking.

## Goals
1. **Edge Telemetry & Streaming:** Establish a reliable, auto-recovering pipeline where an on-bus Raspberry Pi pushes RTSP video via `camstream.service` and GPS/IMU telemetry via `sensor_service.service` to a central server.
2. **Centralized Cloud Control:** Run MediaMTX and a Node.js backend on a VPS to ingest, route, and distribute streams while monitoring edge device health (heartbeats, GPS fix, IMU status).
3. **Role-Based Security:** Enforce strict access control where users (Admins, Drivers, Parents, Students) authenticate via the backend, which in turn issues short-lived stream tokens validated by MediaMTX webhooks.
4. **Observability & Self-Healing:** Implement systemd-based supervision on both the edge and cloud layers to ensure auto-restarts on failure, coupled with backend monitoring that logs and alerts on stream downtime or stale heartbeats.

## Non-Goals (Out of Scope)
- Edge-based AI fire detection or hazard warnings.
- On-device computer vision processing.
- Heavy machine learning workloads on the Raspberry Pi edge nodes.
- Direct public access or user connections to the Raspberry Pi.

## Users
- **System Administrators/Staff:** Need full observability into bus locations, stream health, device uptime, and the ability to manage access.
- **Drivers:** Use the system (via a mounted phone) to view their assigned route and provide fallback GPS tracking, but don't configure the underlying Pi hardware.
- **Parents/Students:** Need reliable, real-time access to the location and video feed of their specifically assigned bus.

## Constraints
- **Hardware Limitations:** Raspberry Pi has limited compute and SD card write-cycles (requires read-only filesystem strategies).
- **Network Variability:** Edge devices rely on cellular connections which are prone to drops, requiring robust buffering and reconnect logic.
- **Security:** RTSP streams must never be exposed publicly; all access must pass through MediaMTX authentication tied to Firebase JWTs.

## Success Criteria
- [ ] `camstream.service` and `sensor_service.service` reliably push data to the VPS and automatically recover from simulated network or process crashes.
- [ ] MediaMTX successfully validates stream access requests against the Node.js backend webhook (`/stream-auth`).
- [ ] The backend accurately tracks Pi heartbeats and marks devices offline when telemetry is stale.
- [ ] A user with a 'parent' role can only access the stream for their assigned student's bus, while an 'admin' can access all streams.
- [ ] End-to-end latency from Pi camera to frontend StreamPlayer is within acceptable bounds (sub-3 seconds) over a stable connection.
