# Phase 2, Plan 1: Cloud Layer Dockerization (MediaMTX & Backend)

## 1. Objective
Containerize the `backend` Node.js service and the `MediaMTX` RTSP server using Docker Compose to ensure consistent deployments, isolate environments, and simplify networking.

## 2. Pre-requisites & Context
- The VPS currently runs MediaMTX via a direct binary download and systemd (`mediamtx.service`).
- The Node.js backend runs via systemd (`campus-compass-backend.service`).
- They communicate over `localhost:3001` (MediaMTX calling backend webhook) and `localhost:9997` (backend polling MediaMTX API).

## 3. Implementation Steps

### Step 3.1: Create Backend Dockerfile
Create `backend/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Expose the API port
EXPOSE 3001
CMD ["node", "index.js"]
```

### Step 3.2: Create `docker-compose.yml`
Create `docker-compose.yml` in the project root (`d:\projects\campus-compass`):
```yaml
version: '3.8'

services:
  mediamtx:
    image: bluenviron/mediamtx:1.9.1
    container_name: campus_mediamtx
    restart: always
    network_mode: "host" # Use host networking for optimal RTSP/WebRTC UDP performance
    volumes:
      - ./backend/mediamtx.yml:/mediamtx.yml:ro
    # No ports needed when network_mode is host

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: campus_backend
    restart: always
    network_mode: "host" # Use host networking so it can talk to mediamtx on localhost without complex bridging for the API
    environment:
      - PORT=3001
      - STREAM_JWT_SECRET=${STREAM_JWT_SECRET} # Needs to be passed from host environment
      - VPS_IP=${VPS_IP}
    volumes:
      - ./backend/service-account.json:/app/service-account.json:ro
```
*Note on `network_mode: "host"`*: MediaMTX relies heavily on a wide range of UDP ports for WebRTC. Docker bridging can introduce severe performance penalties and NAT issues for WebRTC UDP hole punching. Using `host` networking for both containers eliminates this NAT layer and simplifies the transition, as `localhost` mappings in `mediamtx.yml` and `index.js` will continue to work seamlessly.

### Step 3.3: Update Configuration Files
1. **`backend/mediamtx.yml`**: Ensure the auth webhook URLs point to `http://127.0.0.1:3001/stream-auth` (since we are using host networking, 127.0.0.1 still works).
2. **`backend/index.js`**: Verify `MEDIAMTX_API` defaults to `http://127.0.0.1:9997`.

### Step 3.4: Create/Update `.env` file structure
Create a template `backend/.env.example` to document required variables:
```env
STREAM_JWT_SECRET="your_secure_secret_here"
VPS_IP="your_vps_public_ip"
```

## 4. Verification Plan

1. **Verify Artifacts:** Ensure `backend/Dockerfile` and `docker-compose.yml` are created and syntactically correct.
2. **Dry Run Build:** Run `docker compose build backend` to guarantee the Node.js image builds successfully.
3. **Config Check:** Verify `backend/mediamtx.yml` webhook settings match the expected `127.0.0.1:3001` targets.
4. **Execution Test (Local/VPS):** When executed, running `docker compose up -d` should start both services without crashing, and both ports `8554` (MediaMTX) and `3001` (Backend) should be listening on the host.
