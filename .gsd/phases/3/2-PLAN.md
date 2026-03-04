---
phase: 3
plan: 2
wave: 2
depends_on: ["3-1"]
files_modified:
  - app/admin/page.jsx
  - app/admin/layout.jsx
  - components/AdminDashboard.jsx
  - components/DeviceHealthCard.jsx
autonomous: true

must_haves:
  truths:
    - "Admin dashboard explicitly displays connection status (Online/Offline/Degraded)"
    - "Dashboard visualizes GPS and IMU freshness and health data"
  artifacts:
    - "Admin dashboard component exists and connects to Firebase RTDB"
  key_links: []
---

# Plan 3.2: Admin Dashboard UI

<objective>
Build a dedicated Admin Dashboard UI in the Next.js frontend to visualize the health of all buses, including their arbitration status, GPS fix, IMU motion confidence, and heartbeat staleness.

Purpose: To provide administrators with a friendly, real-time GUI of the edge layer infrastructure's health (satisfying REQ-08).
Output: Next.js routing, layout, and React components for the Admin Dashboard.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- backend/index.js (Focus on Section 1: LOCATION ARBITRATION output format)
- app/layout.jsx (For existing styling/providers context)
</context>

<tasks>

<task type="auto">
  <name>Create Admin Dashboard Route and Layout</name>
  <files>app/admin/page.jsx, app/admin/layout.jsx</files>
  <action>
    Create the `/admin` route in Next.js. The layout should have a simple sidebar or header indicating this is the Admin Control Center.
    The page should import and render an `<AdminDashboard />` client component.
    AVOID: Complex authentication checks in the MVP UI. Focus on visualizing the data first. (Full Role-Based Security is Phase 4).
  </action>
  <verify>grep -rn "AdminDashboard" app/admin/page.jsx</verify>
  <done>Next.js route exists and renders the wrapper.</done>
</task>

<task type="auto">
  <name>Implement Real-time Dashboard Component</name>
  <files>components/AdminDashboard.jsx, components/DeviceHealthCard.jsx</files>
  <action>
    Create `AdminDashboard.jsx` (Client Component). Use `firebase/database` (`onValue`) to subscribe to the `/buses` node.
    Create `DeviceHealthCard.jsx` to render individual bus statuses. 
    Display fields:
    - `active_source` (e.g. neo_m8n, phone, none, neo_m8n_degraded)
    - Status Badge: Online (Green), Offline (Red), Degraded (Yellow)
    - Last Seen Time (Calculate age based on `location.timestamp` vs `Date.now()`)
    - GPS Speed / Heading
    - IMU Confirms Motion (`imu_confirms_motion` or derived from IMU heading presence)
    TailwindCSS should be used for styling to make it "friendly" and modular.
    AVOID: Fetching data from Firestore; all telemetry is in the Realtime Database (RTDB).
  </action>
  <verify>grep -rn "onValue" components/AdminDashboard.jsx</verify>
  <done>Components subscribe to RTDB and successfully map bus data to visual cards.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Admin dashboard explicitly displays connection status (Online/Offline/Degraded)
- [ ] Dashboard visualizes GPS and IMU freshness and health data
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
