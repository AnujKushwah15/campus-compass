# Data Schema Reference

This document outlines the database structure for **Campus Compass**, utilizing a **Hybrid Strategy** (Firestore + Realtime Database) for optimal performance and cost.

## 1. Hybrid Architecture

| Feature | Database | Reason |
| :--- | :--- | :--- |
| **User Profiles, Fleet, Routes** | **Firestore** | Relational data, complex queries, low write frequency. |
| **Attendance History** | **Firestore** | Reporting queries, daily aggregation. |
| **Live Trip Status** | **Firestore** | Session management, low-frequency status updates. |
| **Live Bus Location (1Hz)** | **Realtime DB** | High-frequency updates, low latency, cheaper for massive writes. |

---

## 2. Firestore Schema

### `users`
Profiles for all system users.
- `uid` (string): Auth ID
- `email` (string)
- `role` (string): 'driver' | 'parent' | 'admin'
- `assignedBusId` (string): For drivers

### `buses`
Fleet information.
- `id` (string): e.g., 'bus-1'
- `plateNumber` (string)
- `capacity` (number)
- `status` (string): 'idle' | 'active'
- `driverId` (string, optional)

### `routes`
Defined paths.
- `id` (string): e.g., 'route-1'
- `name` (string)
- `busId` (string)
- `stops` (array): List of stop objects `{id, name, location, order}`

### `students`
Roster data.
- `id` (string): Auto-generated or custom ID (e.g., '2')
- `fullName` (string)
- `mobileNumber` (string)
- `prnNumber` (string)
- `semester` (string)
- `collegeName` (string)
- `email` (string)
- `parentId` (string): Link to parent document (e.g., 'XWjKfKi0yLTA87v7Q68YPO6vxUD3')
- `routeId` (string)

### `parents`
Parent profiles.
- `id` (string): Auth ID (e.g., 'XWjKfKi0yLTA87v7Q68YPO6vxUD3')
- `fullName` (string)
- `email` (string)
- `mobileNumber` (string): **Mandatory**
- `child_id` (string): Link to child (e.g., '2')

### `trips`
Active session for a journey.
- `driverId` (string)
- `busId` (string)
- `status` (string): 'active' | 'completed'
- `startTime` (timestamp)
- `endTime` (timestamp)
- `attendance` (map): *Transient* storage for live attendance status.
  ```json
  "attendance": {
    "student_123": { "status": "present", "timestamp": "..." }
  }
  ```

### `attendance`
Permanent history records (Batched from `trips` at end of trip).
- `id` (string): `{tripId}_{studentId}`
- `tripId` (string)
- `studentId` (string)
- `status` (string): 'present' | 'absent'
- `date` (string): 'YYYY-MM-DD'
- `autoMarked` (boolean): true if system auto-assigned absent status.

---

## 3. Realtime Database (RTDB) Schema

Used for high-frequency location tracking.

### `/buses/{busId}/sources/phone`
Data written by the Driver App (Phone GPS).
```json
{
  "lat": 23.0225,
  "lng": 72.5714,
  "speed": 45.2,
  "accuracy": 12.5,
  "timestamp": 1700000000000,
  "connected": true
}
```

### `/buses/{busId}/location` (Planned)
The "Arbitrated" authoritative location, updated by Cloud Functions after comparing multiple sources (Phone vs Hardware). Clients (Parents) will subscribe to this node.
