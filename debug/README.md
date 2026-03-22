# Campus Compass — Live Stream Debug System

Automated CI/CD diagnostic toolkit for the camera stream pipeline.

## Architecture Under Test

```
IP Camera (RTSP)
     ↓  [ffmpeg relay]
Raspberry Pi  ──── RTSP ──→  VPS:8554 (MediaMTX)
                                  ↓  [WHEP/WebRTC]
                             VPS:8189  ──→  Nginx :443/stream/
                                               ↓
                                          Frontend (browser)
```

Authentication flow:
```
Browser → GET /api/stream-token → Backend:3001 (JWT)
MediaMTX read? → POST /stream-auth → Backend:3001 (verify JWT)
```

## Prerequisites

- SSH aliases configured in `~/.ssh/config`:
  - `ssh vps` → VPS server
  - `ssh pi`  → Raspberry Pi
- Run scripts from **Git Bash** or **WSL** on Windows

## Quick Start

```bash
# Full diagnostic (recommended first run)
bash debug/debug_stream.sh

# Individual checks
bash debug/check_local.sh     # Frontend + env vars + token endpoint
bash debug/check_vps.sh       # VPS services, Nginx, MediaMTX, backend
bash debug/check_pi.sh        # Pi camera service, ffmpeg, network
bash debug/check_network.sh   # Connectivity, ports, CORS, WebRTC

# Generate consolidated report
bash debug/stream_report.sh
```

## Log Output

All runs save timestamped logs to `debug/logs/`:

```
debug/logs/
  YYYY-MM-DD_HH-MM-SS_debug_stream.log
  YYYY-MM-DD_HH-MM-SS_check_vps.log
  YYYY-MM-DD_HH-MM-SS_check_pi.log
  ...
```

## Test Coverage

| Layer | Tests |
|-------|-------|
| **Local/Frontend** | .env vars, next.config rewrites, token endpoint, CORS headers |
| **VPS — Nginx** | Service status, config syntax, SSL cert, port 443/80 open |
| **VPS — Backend** | Service status, health check, JWT secret set, /api/stream-token, /stream-auth |
| **VPS — MediaMTX** | Service status, API reachability, active streams, publisher connected |
| **Pi** | camstream.service status, ffmpeg process, camera RTSP reachable, env file |
| **Network** | VPS port reachability (443, 3001, 8554, 8189, 9997), WHEP endpoint, ICE candidates |
| **End-to-end** | Full token → WHEP URL flow simulation |

## Common Issues & Fixes

| Symptom | Likely Cause | Script that catches it |
|---------|-------------|------------------------|
| Black video / no stream | Pi ffmpeg not running | `check_pi.sh` |
| "No stream token" error | Backend JWT secret missing | `check_vps.sh` |
| CORS error in browser | Nginx CORS origin mismatch | `check_network.sh` |
| Token 401 / expired | Clock skew or short TTL | `check_vps.sh` |
| MediaMTX shows no publisher | Camera RTSP unreachable | `check_pi.sh` |
| WebRTC ICE failure | Port 8189 blocked | `check_network.sh` |
| Nginx 502 Bad Gateway | Backend or MediaMTX down | `check_vps.sh` |
