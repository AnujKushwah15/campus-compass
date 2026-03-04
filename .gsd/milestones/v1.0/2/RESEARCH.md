# Phase 2 Research: Cloud Layer Consolidation

## 1. Goal
Modernize the VPS deployment architecture from raw systemd/bash scripts to a containerized, declarative model using Docker Compose and a hardened Nginx reverse proxy.

## 2. Current State Analysis
- **Backend**: Node.js app using `express`, `cors`, `firebase-admin`, `jsonwebtoken`. Deployed via `deploy.sh` copying `index.js` and a systemd file.
- **MediaMTX**: Installed directly to `/usr/local/bin` using `setup_mediamtx_vps.sh`. Uses `/opt/mediamtx_dir/mediamtx.yml`.
- **Frontend/Reverse Proxy**: An nginx setup scripts exists (`setup_nginx_ssl.sh`) but the exact state of Nginx is unmanaged by compose.
- **Security Check**: MediaMTX API is exposed on 9997 (basic auth), RTSP on 8554, WebRTC on 8889. Backend on 3001. 

## 3. Dockerization Strategy (Docker Compose)

Moving to Docker Compose allows us to define the entire cloud stack in a single `docker-compose.yml` file.

### 3.1 MediaMTX Container
- **Image**: `bluenviron/mediamtx:1.9.1` (matching existing install script).
- **Network**: Bridge network (`campus-net`).
- **Volumes**: Mount the existing/modified `mediamtx.yml`.
- **Ports**: 
  - `8554:8554` (RTSP Ingest from Pi)
  - `8889:8889` (WebRTC egress to Frontend)
  - `8888:8888` (HLS egress - optional/future)
  - *Do not expose 9997 (API) to the host.* Keep it internal to the Docker network for the backend to poll.

### 3.2 Backend Container
- **Base**: `node:20-alpine` (standard, lightweight).
- **Build**: Needs a `Dockerfile` in `backend/`.
- **Network**: `campus-net`.
- **Environment**: Needs `VPS_IP`, `STREAM_JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT` (mounted via volume), etc.
- **Ports**: 
  - `3001:3001` (Exposed to localhost only for Nginx proxying, or strictly through Nginx container).

### 3.3 Auth Webhook Networking
- Currently, `mediamtx.yml` points to `http://localhost:3001/stream-auth`.
- In Docker Compose, this must change to `http://backend:3001/stream-auth` using the docker internal DNS.

## 4. Reverse Proxy (Nginx)

Nginx is crucial for:
1. Terminating SSL for the Next.js frontend (if hosted here) and the Node.js API.
2. Proxying WebRTC (optional, MediaMTX handles this well directly, but API calls need SSL).
3. Providing a secure firewall.

### Strategy
Dockerize Nginx alongside the backend and MediaMTX, or configure the host Nginx to reverse-proxy to the Docker containers.
*Decision for Phase 2*: Use the host Nginx (configured via an updated script or manual config) to proxy to the Docker `backend` container map (e.g., `127.0.0.1:3001`). Exposing RTSP(8554) and WebRTC(8889) directly via Docker host ports is preferred for streaming performance over proxying TCP/UDP streams through Nginx.

## 5. Security & Risk Assessment
*   **MediaMTX API Risk**: Exposing port 9997 previously relied on host port binding (`127.0.0.1:9997`). In Docker, if we don't bind it in `ports:`, it's naturally isolated to the Docker bridge network. The backend container can access it via `http://mediamtx:9997`.
*   **Service Account JSON**: The backend needs `service-account.json`. This should be mounted as a read-only volume in the `docker-compose.yml`.

## 6. Execution Plan Outline (Next Steps)
1. Write `backend/Dockerfile`.
2. Write `docker-compose.yml` at the project root.
3. Update `mediamtx.yml` to use Docker DNS names (`backend` instead of `localhost`).
4. Update backend `index.js` to look for MediaMTX API at `http://mediamtx:9997`.
