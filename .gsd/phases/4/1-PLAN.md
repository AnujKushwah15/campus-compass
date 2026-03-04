---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: Admin Health Dashboard UI

## Objective
Create a dedicated UI for administrators to visualize the health of all edge devices, including GPS status, IMU status, streaming status, and last heartbeat.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- app/dashboard/admin/page.jsx
- components/admin/AdminDashboard.jsx
- components/admin/DeviceHealthCard.jsx

## Tasks

<task type="auto">
  <name>Create Admin Devices Page</name>
  <files>
    - app/dashboard/admin/devices/page.jsx
  </files>
  <action>
    - Create a new Next.js page at `app/dashboard/admin/devices/page.jsx`.
    - This page should display a clear header (e.g., "Edge Device Health") and a back button or link to the main `/dashboard/admin` page.
    - Render the `<AdminDashboard />` component within the page area. This component already maps over all edge devices and renders `<DeviceHealthCard />`s based on RTDB data.
  </action>
  <verify>npm run build</verify>
  <done>The `/dashboard/admin/devices` route renders successfully with the edge device health grid.</done>
</task>

<task type="auto">
  <name>Link Devices Page from Admin Dashboard</name>
  <files>
    - app/dashboard/admin/page.jsx
  </files>
  <action>
    - In the header of `app/dashboard/admin/page.jsx`, add a new `Link` pointing to `/dashboard/admin/devices`.
    - Style the link similarly to the "Query Data" button, utilizing a suitable icon (e.g., `<Activity />` or `<Server />` from `lucide-react`) and text like "Edge Health".
  </action>
  <verify>npm run build</verify>
  <done>The administrators can successfully navigate to the Edge Health dashboard from the main admin page to view device statuses.</done>
</task>

## Success Criteria
- [ ] `/dashboard/admin/devices` route exists and loads properly.
- [ ] Admin dashboard header has a visible and styled link to the device health page.
- [ ] The application builds successfully without errors.
