---
phase: 3
plan: 1
wave: 1
---

# Phase 3.1: Remove Custom JWT Minting — Backend

## Objective
Strip out the `/api/stream-token` endpoint and custom `STREAM_JWT_SECRET` logic entirely.
The backend `/stream-auth` webhook will now verify the Firebase idToken passed directly
in the stream URL query string by MediaMTX.

## Tasks

<task type="auto">
  <name>Remove /api/stream-token route from backend/index.js</name>
  <files>backend/index.js</files>
  <action>
    Delete the entire `POST /api/stream-token` handler (lines ~220–333).
    Remove imports: `const jwt = require('jsonwebtoken')` and all token-rate-limit logic.
    Remove the `JWT_SECRET` / `JWT_EXPIRY` / `STREAM_JWT_SECRET` constants and the fail-fast
    check that calls process.exit(1) when it is missing.
  </action>
  <verify>grep -n "stream-token" backend/index.js should return nothing.</verify>
  <done>File compiles cleanly. No reference to jwt or stream-token remains.</done>
</task>

<task type="auto">
  <name>Update /stream-auth to verify Firebase idToken</name>
  <files>backend/index.js</files>
  <action>
    In the `POST /stream-auth` handler, change the `read` action branch so that:
    1. It reads the token from `query` as before.
    2. Instead of `jwt.verify(token, JWT_SECRET)`, it calls:
       `const decoded = await admin.auth().verifyIdToken(token);`
    3. Fetch user role from Firestore using `decoded.uid` (same RBAC logic as before).
    4. Return 200 if role/busId allows, 401/403 otherwise.
    Remove all usages of `jsonwebtoken` package (`jwt` variable).
  </action>
  <verify>
    curl -X POST http://127.0.0.1:3001/stream-auth -H 'Content-Type: application/json'
    -d '{"action":"read","path":"live_bus-1","query":"token=INVALID","ip":"127.0.0.1","protocol":"webrtc"}'
    Should return 401.
  </verify>
  <done>/stream-auth returns 401 for invalid token, RBAC role check still works.</done>
</task>

<task type="auto">
  <name>Remove jsonwebtoken from package.json and reinstall</name>
  <files>backend/package.json</files>
  <action>
    Remove `"jsonwebtoken"` from dependencies.
    Run `npm install` in the backend directory on the VPS.
  </action>
  <verify>cat backend/package.json | grep jsonwebtoken returns nothing.</verify>
  <done>Dependency removed.</done>
</task>

<task type="auto">
  <name>Remove STREAM_JWT_SECRET from VPS environment</name>
  <files>/etc/campus-compass.env (on VPS)</files>
  <action>
    SSH into VPS, edit `/etc/campus-compass.env`, remove `STREAM_JWT_SECRET=...` line.
    Reload systemd and restart `campus-compass` service.
  </action>
  <verify>systemctl status campus-compass shows active (running) with no JWT errors.</verify>
  <done>Service starts cleanly without JWT_SECRET check.</done>
</task>

## Verification
- `curl -X POST https://thanganat25.com/api/stream-token` returns **404** (route deleted).
- `curl -X POST http://127.0.0.1:3001/stream-auth` with invalid token returns **401**.
