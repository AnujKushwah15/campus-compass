"use client";

import AttendanceView from '@/features/attendance/components/AttendanceView';

export default function StudentAttendancePage() {
    // Mock data for student
    const studentData = {
        totalDays: 22,
        presentDays: 18,
        absentDays: 4,
        percentage: 81.8
    };

    return (
        <AttendanceView
            title="My Attendance"
            studentName="Alex Johnson"
            data={studentData}
            titleClassName="text-black dark:text-white"
        />
    );
}
