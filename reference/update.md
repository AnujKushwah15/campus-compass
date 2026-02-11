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
