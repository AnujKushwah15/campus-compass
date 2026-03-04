---
phase: 3
plan: 1
status: complete
verified_at: 2026-03-04T15:15:00Z
---

# Phase 3.1 Summary — Remove Custom JWT Minting (Backend)

## What Was Done
- Removed `const jwt = require('jsonwebtoken')` import from `backend/index.js`
- Removed `JWT_SECRET`, `JWT_EXPIRY`, `VPS_IP` constants
- Removed the `process.exit(1)` fail-fast guard for JWT_SECRET
- Removed entire `POST /api/stream-token` route and its rate-limiter
- Rewrote `POST /stream-auth` read action to use `admin.auth().verifyIdToken(token)` instead of `jwt.verify`
- Full Firestore RBAC preserved: admin → all, driver → assigned bus, parent → linked student buses
- Removed `jsonwebtoken` from `backend/package.json`
- Removed `STREAM_JWT_SECRET` from `/etc/campus-compass.env` on VPS
- Deployed and restarted `campus-compass` systemd service

## Verification Results
| Check | Expected | Actual |
|---|---|---|
| `POST /api/stream-token` | 404 | ✅ 404 (route deleted) |
| `/stream-auth` with invalid token | 401 | ✅ 401 `{"error":"Invalid stream token"}` |
| `/stream-auth` publish action | 200 | ✅ 200 `{"ok":true}` |
| Service health check | `{"status":"ok"}` | ✅ Running |
