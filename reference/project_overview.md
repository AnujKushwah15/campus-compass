# Campus Compass - Project Overview

**Campus Compass** is a school transportation safety system designed to track buses, drivers, and students. It provides real-time dashboards for Admin, Drivers, and Parents.

## Tech Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: JavaScript (React)
- **Styling**: Tailwind CSS v4
- **Database/Auth**: Firebase (Auth, Firestore, Storage, **Realtime Database**)
- **Maps**: React Leaflet / Leaflet
- **Icons**: Lucide React

## Core Modules

### 1. Dashboard (`/dashboard`)
The core application area, protected by `AuthProvider`.
- **Driver Dashboard (`/dashboard/driver`)**:
  - Real-time route map.
  - **Live Attendance**: Check/Cross manifest.
  - SOS Alert system.
  - **Logout Button**: Secured generic logout.
- **Parent Dashboard (`/dashboard/parent`)**:
  - Live tracking of child's bus.
  - Driver details.
  - Trip timeline.
- **Admin Dashboard (`/dashboard/admin`)**:
  - Fleet overview.
  - Incident logs.
- **Profile (`/dashboard/profile`)**:
  - User details.
  - Profile picture upload (w/ cropping).
  - Password management.

### 2. Authentication
- **Global Context**: `AuthProvider.jsx` handles session state.
- **Route Protection**: `DashboardLayout` redirects unauthenticated users to `/auth`.

### 3. Backend Services (`/backend`)
Running on VPS (Node.js/Express Service — port 3001).
- **Arbitration Service**: Compares Phone GPS, Neo-8M GPS, and MPU6500 IMU data.
  - IMU-enhanced: stationary correction, degraded GPS mode.
  - **Output**: Writes to `/buses/{id}/location` in RTDB.
- **Stream Auth**: JWT-based authentication for MediaMTX video streams.
  - `POST /api/stream-token` — Issue short-lived stream access tokens.
  - `POST /stream-auth` — MediaMTX HTTP auth callback.
- **Monitoring**: Stream status poller + Pi heartbeat stale detection.

### 4. Raspberry Pi Sensor Service (`/backend/pi`)
- **sensor_service.py**: Reads MPU6500 (I2C) + Neo-8M GPS (UART), writes to RTDB.
- **Heartbeat**: Built-in Pi health reporting to `/buses/{busId}/piStatus`.

## Key Features
- **Hybrid Real-Time Tracking**: Combines Firestore (Session) and Realtime DB (Location) for performance.
- **Secure Streaming**: Firebase-verified, JWT-based video stream access with per-bus paths.
- **Real Hardware Sensors**: MPU6500 IMU + Neo-8M GPS on Raspberry Pi.
- **Optimized Attendance**: Batches attendance writes to reduce database costs.
- **Role-Based Access**: Specialized views for Drivers, Parents, and Admins.
- **Device Health Monitoring**: Real-time Pi/GPS/IMU/Camera status on all dashboards.
- **Session Management**: Secure login/logout flows.
- **Image Processing**: Basic cropping for profile pictures.

## Recent Updates
- **[2026-03-22 - Later]**: Architected and executed a comprehensive dependency-free Node.js QA testing framework (Unit, Integration, Security, Performance). Built standalone network diagnostic scripts. Hardened backend VPS security rules (UFW closed).
- **[2026-03-22]**: Deployed dynamic multi-bus streaming selector to Admin Dashboard, shifted Student Management into inline Bus Details, and released the portable Pi provisioning (`setup_pi.sh`) tool for scaling out edge nodes.
- **[2026-03-03]**: Completed Milestone v1.0. Implemented secure Role-Based Access Control loops, automated CI/CD deployment pathways via GitHub Actions, structured system-wide Error UX boundaries (`not-found.jsx`, `error.jsx`), and styled dark/light mode contrasts.
- **[2026-02-11]**: Implemented Secure Streaming (JWT auth, MediaMTX HTTP auth) + Real Hardware Sensor Integration (MPU6500 + Neo-8M GPS on Pi) + Frontend StreamContext + Dashboard data flow fixes.
- **[2026-02-04]**: Enforced mandatory PRN linking for Parent Verification.
- **[2026-02-02]**: Implemented Hybrid Location System (RTDB), Cost-Optimized Attendance (Batching), and Firestore Data Seeding.
- **[2026-01-30]**: Implemented TripContext and Core Data Infrastructure.
- **[2026-01-07]**: Implemented Session Management (AuthContext) and Logout functionalities.
