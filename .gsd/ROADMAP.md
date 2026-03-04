# ROADMAP.md

> **Current Phase**: Phase 4
> **Milestone**: v4.0 (Edge Integration & Admin Health Dashboard)

## Must-Haves (from SPEC)
- [ ] Next.js app deployed and accessible on Vercel
- [ ] Auto-deploy on push to `anuj` (or `main`) branch
- [ ] Environment variables configured for production Firebase
- [ ] Custom domain (if available) or Vercel URL working

## Phases

### Phase 1: Vercel Deployment & CI/CD
**Status**: 🔄 In Progress
**Objective**: Deploy the Campus Compass Next.js app to Vercel with auto-deploy from GitHub, configure production environment variables, and verify live deployment.

### Phase 2: VPS SSL & Domains
**Status**: ✅ Complete
**Objective**: Validate Cloudflare to Nginx reverse proxy routing and correctly bind the Nginx systemd service on ports 80 and 443. Adjust frontend environment variables to point to the `thanganat25.com` secure URLs, fixing Mixed Content errors.

---

## Milestone v3.0: Firebase Auth Stream

> Replace the custom JWT minting system with direct Firebase idToken verification.
> The stream URL carries the idToken as a query param; MediaMTX calls /stream-auth to validate it.

### Phase 3: Remove Custom JWT & Use Firebase idToken Auth
**Status**: ✅ Complete
**Objective**: Remove the `/api/stream-token` endpoint and custom JWT secret. Update `/stream-auth` to verify Firebase idTokens directly via Admin SDK. Update frontend to build stream URLs using the Firebase idToken instead of requesting a custom token.

**Sub-phases:**
- [x] 3.1 — Backend: Strip JWT minting, update /stream-auth ✅
- [x] 3.2 — Frontend: Remove `getStreamToken`, use `buildStreamUrl` ✅

**Verification**:
- POST `/api/stream-token` returns 404 (route deleted)
- Stream URL in browser contains `?token=eyJ...` (Firebase idToken)
- Stream loads in Vercel deployment without "Failed to fetch"

---

## Milestone v4.0: Edge Integration & Admin Health Dashboard

> Deploy Raspberry Pi telemetry (camstream & sensor), ensure auto-recovery, and visualize metrics on Admin Health Dashboard. 

### Phase 4: Edge Integration & Dashboard UI
**Status**: ⬜ Not Started
**Objective**: Setup Raspberry Pi with `camstream.service` and `sensor_service.service` using systemd to push to VPS. Build Admin UI dashboard to visualize device health, GPS, and IMU status securely. 
**Depends on**: Phase 3

**Tasks**:
- [ ] TBD (run `/plan 4` to create)

**Verification**:
- TBD
