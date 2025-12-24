"use client";

import AttendanceView from '@/components/AttendanceView';

export default function ParentAttendancePage() {
    // Mock data for parent's child (different from student view)
    const childData = {
        totalDays: 22,
        presentDays: 21,
        absentDays: 1,
        percentage: 95.4
    };

    return (
        <AttendanceView
            title="Child Attendance"
            studentName="Rohan Sharma"
            data={childData}
        />
    );
}
