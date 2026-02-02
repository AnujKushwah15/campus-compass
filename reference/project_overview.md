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
Running on VPS (Node.js Service).
- **Arbitration Service**: Listens to Realtime Database.
- **Role**: Decides "Official Location" by comparing Phone vs Hardware inputs.
- **Output**: Writes to `/buses/{id}/location`.

## Key Features
- **Hybrid Real-Time Tracking**: Combines Firestore (Session) and Realtime DB (Location) for performance.
- **Optimized Attendance**: Batches attendance writes to reduce database costs.
- **Role-Based Access**: Specialized views for Drivers and Parents.
- **Session Management**: Secure login/logout flows.
- **Image Processing**: Basic cropping for profile pictures.

## Recent Updates
- **[2026-02-02]**: Implemented Hybrid Location System (RTDB), Cost-Optimized Attendance (Batching), and Firestore Data Seeding.
- **[2026-01-30]**: Implemented TripContext and Core Data Infrastructure.
- **[2026-01-07]**: Implemented Session Management (AuthContext) and Logout functionalities.
