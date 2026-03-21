# Project Updates Log

Use this file to track major changes, architectural decisions, and daily progress.

## [2026-01-07] Session Management & Logout

### Added Logout Button (Driver Dashboard)
- **Feature**: Added a "Log Out" button to the Driver Dashboard.
- **Location**: `app/dashboard/driver/page.jsx`
- **Details**:
  - Implemented `handleLogout` using Firebase `signOut`.
  - Added confirmation dialog before logging out.
  - Redirects to `/auth` after successful logout.

### Session Management
- **Goal**: Protect dashboard routes (`/dashboard/*`) from unauthorized access.
- **Implementation**:
  - **AuthContext**: Created `components/AuthProvider.jsx` to track user session.
  - **Root Layout**: Wrapped application in `AuthProvider`.
  - **Dashboard Layout**: Added logic to redirect unauthenticated users to `/auth`.

## [2026-01-30] Core Data & Driver Dashboard Refactor

### Module 1: Core Data Infrastructure
- **Goal**: Establish real-time data flow for Trips and Location.
- **Reference**: `lib/firebase.js` exports updated.
- **Context**: Created `TripContext.jsx` to manage Start/End Trip and Global Location state.
- **Layout**: Wrapped Root Layout in `TripProvider`.

### Module 2: Driver Dashboard (In Progress)
- **Goal**: Replace mock data with real Firestore integration without altering UI.
- **Student List**: Transitioning from `MOCK_ROSTER` to real Firestore query based on `assignedBusId`.
- **Trip Logic**: Implementing `Start Trip` functionality using `TripContext`.
- **Geolocation**: Implementing real-time GPS tracking via `navigator.geolocation`.

## [2026-02-02] Hybrid System & Attendance v1

### Firestore Schema & Seeding
- **Action**: Created full Firestore schema (`users`, `buses`, `routes`, `students`, `trips`, `attendance`).
- **Seeding**: Implemented `scripts/seed_data.js` using Firebase Admin SDK to populate dummy data (Bus-1, Route-A, 5 Students).
- **Context**: Updated `TripContext.jsx` to fetch students dynamically based on the active trip's Bus ID.

### Hybrid Bus Localization (RTDB)
- **Action**: Integrated Firebase Realtime Database (RTDB) for high-frequency location updates.
- **Cost Optimization**: Driver app now writes GPS source data to `/buses/{id}/sources/phone` (RTDB) instead of Firestore documents, saving massive write costs.
- **Config**: Updated `lib/firebase.js` to authorize RTDB.

### Optimized Attendance System
- **Strategy**: Implemented a "Batch-on-End" strategy.
  1.  **Live**: Attendance status is stored in the active `trip` document map (Free reads for clients).
  2.  **History**: On "End Trip", the system batches all records and writes them to the `attendance` collection.
- **Auto-Absent**: Logic added to automatically mark "Pending" students as "Absent" when the trip ends.

### Security
- **Correction**: Updated Firestore and RTDB Rules to allow development (Test Mode) to fix `PERMISSION_DENIED` errors.

### Backend & VPS (Arbitration Service)
- **Arbitration Logic**: Implemented `backend/index.js` to arbitrate between Phone and Neo-8M GPS.
- **Features**: 
  - Heartbeat Loop (Auto-detects timeouts).
  - Infinite Loop Prevention.
  - Prioritizes Hardware GPS (if <10s old) over Phone.
- **Deployment**: Created `reference/VPS.md` guide for deploying to Linux/Ubuntu via Systemd.
- **Frontend**: Updated `TripContext` to listen to the new "Official" location node from RTDB.

## [2026-02-04] Secure Parent-Student Linking

### Mandatory PRN Enforcement
- **Goal**: Ensure secure and verified linking between Parent and Student accounts.
- **Action**: Modified Parent Registration flow in `app/auth/page.jsx`.
- **Logic**: 
  - Parent Signup now **requires** a valid "Child's PRN".
  - System checks if the PRN exists in the `students` collection.
  - **Blocking**: If the PRN is not found, the parent cannot create an account (Error: "Student with PRN ... not found. Please sign up your child first.").
  - **Linking**: Upon success, updates both `parents` doc (with `child_id`) and `students` doc (with `parentId`) for bidirectional navigation.

## [2026-02-05] Parent Dashboard Real-Time Integration (Module 3)

### Module 3: Parent Dashboard (In Progress)
- **Goal**: Transition Parent Dashboard from mock data to real Firestore/RTDB streams.
- **Linking**: Implement `MOCK_PARENT_LINKING` replacement using real `users/{parentId}` data to find `assignedStudentId`.
- **Live Tracking**: Subscribe to `trips` collection to find the active trip for the child's bus and update `LiveMap` using real coordinates.

## [2026-02-11] Secure Streaming + Real Hardware Sensor Integration

### Phase 0: Raspberry Pi Sensor Service
- **New**: `backend/pi/sensor_service.py` — Python service reading MPU6500 (I2C) + Neo-8M GPS (UART).
- **Features**: IMU calibration, heading integration, stationary detection, 10Hz internal / 1Hz RTDB publish.
- **RTDB Writes**: `/buses/{busId}/sources/neo_m8n`, `/buses/{busId}/sources/imu`, `/buses/{busId}/piStatus`.
- **Files**: `pi/requirements.txt`, `pi/sensor_service.service`, `pi/README.md`.
- **Status**: ✅ Tested on Pi — MPU6500 confirmed working.

### Phase 1: Backend Refactored to Express Server
- **Refactored**: `backend/index.js` — Now a combined Express app (port 3001) with:
  - IMU-enhanced location arbitration (stationary correction, degraded GPS mode).
  - `POST /api/stream-token` — Firebase-verified JWT stream token endpoint.
  - `POST /stream-auth` — MediaMTX HTTP auth callback.
  - Stream status monitor (polls MediaMTX API → RTDB).
  - Pi heartbeat monitor (stale detection).
  - Rate limiting (10 req/min per user).
- **Deps**: Added `express`, `jsonwebtoken`, `cors`, `node-fetch`.

### Phase 2: MediaMTX Secured
- **Updated**: `backend/mediamtx.yml` — HTTP auth for viewers (calls backend), static auth for Pi publisher, per-bus paths with wildcard support.

### Phase 4: Frontend Integration
- **New**: `context/StreamContext.jsx` — RTDB subscriptions for stream/Pi/IMU status + token acquisition.
- **Updated**: `VideoPlayer.jsx` — Accepts authenticated stream URL.
- **Updated**: `StreamPlayer.jsx` — Device health indicators (Pi/GPS/IMU), viewer count, request-feed UX.
- **Updated**: Parent Dashboard — RTDB location subscription + `LiveFeedOverlay` with authenticated streaming.
- **Updated**: Driver Dashboard — `DriverSplashScreen` with device health panel before trip start.
- **Updated**: Admin Dashboard — `AdminStreamWidget` + `FleetMap` (RTDB-backed bus location map).

### Phase 5: Security Rules
- **Updated**: `database.rules.json` — Granular per-node rules (location/streamStatus server-write only, all reads require auth).
- **Updated**: `firestore.rules` — User-scoped writes, streamLogs server-only.

### Data Flow Fix
- **Fixed**: Parent map now reads from RTDB (was only reading stale Firestore trip doc).
- **Fixed**: Driver `RouteMap` now receives `busLocation` from `TripContext`.
- **Fixed**: Admin dashboard now has a fleet map with RTDB bus location subscriptions.

### Remaining (Tomorrow)
- Deploy updated backend + MediaMTX config to VPS.
- Test GPS outdoors on Pi.
- End-to-end verification across all dashboards.

## [2026-03-03] Security RBAC & CI/CD Pipeline

### Phase 4: Security & Access Control
- **Backend Auth Loop**: Refactored `backend/index.js` to correctly resolve multiple streams for parents with multiple children. Added strict bus ID string normalization across all role checks.
- **Verification Script**: Engineered `backend/scripts/test_stream_auth.js` to rigorously verify backend stream authorization rules directly against the VPS container with comprehensive test cases.
- **Frontend UI Adaptations**: Formatted `StreamPlayer.jsx` to gracefully adapt to smaller mobile viewpoints by using responsive row-wrapping flex properties. Confirmed WebRTC HTTP Auth endpoints and JWT secret fallbacks.

### Phase 5: CI/CD & Production Polish
- **GitHub Actions**: Established an automated CI/CD path to production by generating `.github/workflows/deploy-backend.yml`. The workflow triggers on pushes to the `backend/` directory or `docker-compose.yml` to automatically pull branch changes and rebuild the Docker container on the VPS via SSH secrets.
- **Global Error Handling**: Added `app/not-found.jsx` for standardized, branded 404 views. Verified `app/error.jsx` and `app/global-error.jsx` to correctly function and trap boundary errors to prevent system panics. 
- **Light/Dark Mode Polish**: Addressed UI washing out by adjusting components to consistent themes tailored for unified light and dark modes.
- **Milestone Completion**: Successfully marked Milestone v1.0 (Infrastructure Stabilization & Reliability) as COMPLETE in `ROADMAP.md` and `STATE.md`.

## [2026-03-21] Secure Streaming Stability & CORS Resolution

### Authentication Optimization
- **Goal**: Reduce authentication overhead and improve stream stability.
- **Action**: Increased JWT token TTL from 60s to **300s (5 minutes)**.
- **Frontend**: Updated `VideoPlayer.jsx` to refresh tokens only once every 290 seconds (4m 50s).
- **Backend**: Updated `STREAM_TOKEN_TTL_SECONDS` in `backend/index.js` and successfully deployed to VPS.

### CORS & Proxy Architecture
- **Problem**: Persistent browser CORS blocks when fetching WHEP SDP from MediaMTX.
- **Solution**: Implemented a "Same-Origin Proxy" layer in Next.js.
- **New Routes**:
  - `app/api/stream-token/route.js`: Proxies token requests to the VPS backend.
  - `app/api/whep/route.js`: Proxies WHEP SDP negotiation to MediaMTX on port 8189.
- **Result**: All browser-side streaming traffic now stays on the same domain (localhost or vercel.app), completely eliminating CORS issues.

### Dashboard & Loop Stability
- **Problem**: 5-second reconnect loop observed on the dashboard.
- **Fix 1 (Backend)**: Increased MediaMTX polling interval from 5s to **30s** to reduce RTDB churn.
- **Fix 2 (Context)**: Memoized `StreamContext` value using `useMemo` to prevent re-render cascades on every heartbeat.
- **Fix 3 (Component)**: Added a "Same-Path Reconnect Guard" in `VideoPlayer.jsx` to skip redundant connections if the `streamPath` hasn't changed.
- **Fix 4 (Dashboard)**: Stabilized `AdminDashboardPage` props using `useMemo` and fixed a `ReferenceError` related to missing React hooks imports.

### Infrastructure (VPS)
- **Nginx**: Completely rewrote `/etc/nginx/nginx.conf` on the VPS. 
  - Optimized the proxy block for `/stream/` (WebRTC on port 8189).
  - Implemented a robust `map`-based CORS policy for safer cross-origin access if ever needed.
- **MediaMTX**: Enforced mandatory JWT authentication for all viewers by removing `read` from `authHTTPExclude`.
