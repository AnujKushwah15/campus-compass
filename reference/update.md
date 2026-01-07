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
