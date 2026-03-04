# Phase 4 Execution Plan: Security & Access Control

## Objectives
Finalize and strictly verify the security boundaries surrounding the WebRTC live stream. The implementation must guarantee that ONLY authorized users can view a specific bus's live feed, mapped cleanly by their role (Admin, Driver, Parent).

## Tasks

### Task 1: Refine Role-Based Access Logic in Backend (`backend/index.js`)
- **Current Issue:** The `parent` role check under `/api/stream-token` uses `.limit(1)` when fetching students linked to the parent. This prevents a parent with multiple children on different buses from accessing all necessary streams.
- **Action:** 
  - Remove `.limit(1)` and map over all returned student documents to create an array of `allowedBuses`.
  - Check if the `requestedBusId` is included in the `allowedBuses` array.
  - Double-check the driver logic to ensure string normalization correctly aligns bus IDs (e.g. `bus-1` vs `1`).

### Task 2: Create Comprehensive Auth Test Script (`backend/scripts/test_stream_auth.js`)
- **Action:** Build a Node.js verification script that simulates authentication scenarios. 
  - *Approach:* Since generating real Firebase ID tokens programmatically requires the Identity Toolkit API which can be flaky without an API key, the script will simulate the backend logic by calling the internal authorization functions directly, or mocking the standard Express request object and simulating the token pipeline to ensure a 403 or 200 is returned as expected.
  - *Test Cases:*
    - Admin -> Attempt to view any bus (Should SUCCEED).
    - Driver (`assignedBusId: 'bus-1'`) -> Attempt to view `bus-1` (Should SUCCEED).
    - Driver (`assignedBusId: 'bus-1'`) -> Attempt to view `bus-2` (Should FAIL).
    - Parent (Child on `bus-1`) -> Attempt to view `bus-1` (Should SUCCEED).
    - Parent (Children on `bus-1`, `bus-2`) -> Attempt to view `bus-2` (Should SUCCEED).
    - Parent (Child on `bus-1`) -> Attempt to view `bus-3` (Should FAIL).

### Task 3: Token Expiration and Edge-Case Handling (Frontend & DevOps)
- **Frontend Verify:** Verify `StreamContext.jsx` accurately handles `403 Forbidden` and surfaces it via `StreamPlayer`'s error state (already partially implemented, will confirm layout bounds).
- **Security Check:** Ensure production environment (VPS Docker config) correctly injects a cryptographically secure `JWT_SECRET`. Currently it falls back to a dev secret which is a severe vulnerability if deployed as-is.

## Verification
- Run `node scripts/test_stream_auth.js` on the VPS backend container yielding 100% pass rate.
- Inspect Docker environment variables to confirm `JWT_SECRET` is configured.
- UI validation to confirm `VideoPlayer` gracefully handles the "Stream unavailable" or 403 state.
