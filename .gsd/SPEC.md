# Project Specification: Debugging Scripts

**Status:** FINALIZED

## Objective
Create two comprehensive bash scripts that act as a debugging system. These scripts will verify that all required services, network connections, and data flows are operating correctly on both the Raspberry Pi (Edge Node) and the VPS (Central Server) in case any component stops working.

## Requirements

### 1. Pi Debugging Script (`testing/debug_pi.sh`)
Must check and report on:
- Network reachability to the VPS and Internet.
- Status of `camstream.service` and `sensor_service.service`.
- Availability of camera device (`/dev/video*`).
- Availability of GPS/IMU sensor devices (`/dev/tty*`).
- Recent errors from systemd journal for both services.

### 2. VPS Debugging Script (`testing/debug_vps.sh`)
Must check and report on:
- Status of `mediamtx.service`, `campus-compass.service` (Node backend), and `nginx`.
- Firewall rules and port reachability:
  - Port 8554 (RTSP publish)
  - Port 8889 (WebRTC)
  - Port 3001 (Internal backend API)
- Backend API health by curling `http://localhost:3001/api/health`.
- Recent error logs from MediaMTX and the backend service.

## Usage constraints
- Must be executable directly via SSH:
  - `ssh 10.34.25.238 'bash -s' < testing/debug_pi.sh`
  - `ssh vps 'bash -s' < testing/debug_vps.sh`
- Must produce clear `[PASS]`, `[FAIL]`, and `[WARN]` outputs.
