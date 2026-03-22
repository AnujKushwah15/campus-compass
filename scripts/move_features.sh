#!/bin/bash
set -e
cd d:/Projects/campus-compass

mkdir -p features/auth/components
mkdir -p features/admin/components
mkdir -p features/driver/components
mkdir -p features/streaming/components
mkdir -p features/streaming/context
mkdir -p features/tracking/components
mkdir -p features/tracking/context
mkdir -p features/attendance/components
mkdir -p features/profile/components

mv components/AuthProvider.jsx features/auth/components/ || true
mv components/admin/* features/admin/components/ || true
mv components/driver/* features/driver/components/ || true
mv components/streaming/VideoPlayer.jsx features/streaming/components/ || true
mv components/ui/StreamPlayer.jsx features/streaming/components/ || true
mv context/StreamContext.jsx features/streaming/context/ || true
mv components/MockMap.jsx features/tracking/components/ || true
mv components/ui/LiveMap.jsx features/tracking/components/ || true
mv context/TripContext.jsx features/tracking/context/ || true
mv components/ProfileView.jsx features/profile/components/ || true
mv components/AttendanceView.jsx features/attendance/components/ || true

rmdir components/admin || true
rmdir components/driver || true
rmdir components/streaming || true
rmdir context || true

node scripts/refactor_imports.js
