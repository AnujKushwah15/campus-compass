---
phase: 3
plan: 1
wave: 1
depends_on: []
files_modified:
  - backend/index.js
  - backend/scripts/test_arbitration.js
autonomous: true

must_haves:
  truths:
    - "Backend detects stale GPS but active IMU and falls back to degraded mode"
    - "Backend detects completely stale Pi and falls back to Phone GPS"
    - "Backend detects all sources stale and marks bus offline (`active_source: 'none'`)"
  artifacts:
    - "backend/scripts/test_arbitration.js exists to prove the state machine"
  key_links: []
---

# Plan 3.1: Arbitration & Health Monitoring

<objective>
Audit the existing IMU/GPS arbitration and heartbeat logic in `index.js`, refine it if necessary to fully meet REQ-04, and write a verification script to dynamically prove the state machine behaves correctly under varying connection loss scenarios.

Purpose: To ensure the backend correctly manages device health and source fallbacks, preventing stale data from being shown to users.
Output: A verified `index.js` and an automated `test_arbitration.js` script.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- backend/index.js (Focus on Section 1: LOCATION ARBITRATION)
</context>

<tasks>

<task type="auto">
  <name>Audit & Refine Arbitration Logic</name>
  <files>backend/index.js</files>
  <action>
    Review the `evaluateSources` function in `backend/index.js`. 
    Ensure it meets REQ-04: "The backend must monitor Pi heartbeats via Firebase RTDB and update device status (online/offline)."
    Currently, it sets `active_source: 'none'` when offline. Ensure this logic is robust. If necessary, add a top-level `status: 'offline'` or `status: 'online'` field to the `updatePayload` explicitly for clarity on the frontend, alongside `active_source`.
    AVOID: Breaking the existing heartbeat `setInterval` loop.
  </action>
  <verify>grep for status updates in index.js</verify>
  <done>Arbitration logic is verified to explicitly set online/offline status</done>
</task>

<task type="auto">
  <name>Create Arbitration Test Script</name>
  <files>backend/scripts/test_arbitration.js</files>
  <action>
    Create a standalone Node.js script that connects to the Firebase RTDB using `firebase-admin`.
    It should create a mock bus `buses/test-bus-arbitration`, inject mock `sources.neo_m8n`, `sources.phone`, and `sources.imu` timestamps, and verify that the backend's `evaluateSources` loop transitions the `active_source` from `neo_m8n` -> `neo_m8n_degraded` -> `phone` -> `none` over time.
    Use `process.env.GOOGLE_APPLICATION_CREDENTIALS` for the service account.
    AVOID: Writing to real production bus IDs. Use a dedicated test ID.
  </action>
  <verify>node backend/scripts/test_arbitration.js executes and outputs success</verify>
  <done>Test script runs and sequentially proves all 4 arbitration states.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Backend detects stale GPS but active IMU and falls back to degraded mode
- [ ] Backend detects completely stale Pi and falls back to Phone GPS
- [ ] Backend detects all sources stale and marks bus offline (`active_source: 'none'`)
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
