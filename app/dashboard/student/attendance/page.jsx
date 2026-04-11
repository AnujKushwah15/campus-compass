"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/components/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import AttendanceView from '@/features/attendance/components/AttendanceView';
import BusLoader from '@/components/BusLoader';

export default function StudentAttendancePage() {
    const { user, role, loading: authLoading } = useAuth();
    const [attendanceData, setAttendanceData] = useState(null);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (authLoading || !user) return;

        const fetchAttendance = async () => {
            setLoadingData(true);
            setError(null);
            try {
                // Query all attendance records for this student, ordered by date
                const q = query(
                    collection(db, 'attendance'),
                    where('studentId', '==', user.uid),
                    orderBy('date', 'asc')
                );
                const snapshot = await getDocs(q);

                // Build history array: [{ date: 'YYYY-MM-DD', status: 'present'|'absent' }]
                const history = snapshot.docs.map(doc => {
                    const d = doc.data();
                    return { date: d.date, status: d.status };
                });

                // Derive summary stats from the history
                // Only count records that fall within the current month for the summary
                const now = new Date();
                const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                const thisMonthRecords = history.filter(r => r.date.startsWith(currentYYYYMM));
                const presentDays = thisMonthRecords.filter(r => r.status === 'present').length;
                const absentDays = thisMonthRecords.filter(r => r.status === 'absent').length;
                const totalDays = presentDays + absentDays;
                const percentage = totalDays > 0
                    ? parseFloat(((presentDays / totalDays) * 100).toFixed(1))
                    : 0;

                setAttendanceData({
                    totalDays,
                    presentDays,
                    absentDays,
                    percentage,
                    history, // full history for calendar rendering
                });
            } catch (err) {
                console.error('Error fetching attendance:', err);
                setError('Failed to load attendance data. Please try again.');
            } finally {
                setLoadingData(false);
            }
        };

        fetchAttendance();
    }, [user, authLoading]);

    if (authLoading || loadingData) {
        return <BusLoader fullScreen={false} message="Loading attendance..." />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <p className="text-red-500 text-sm font-medium">{error}</p>
            </div>
        );
    }

    return (
        <AttendanceView
            title="My Attendance"
            studentName={user?.displayName || 'Student'}
            data={attendanceData}
            titleClassName="text-black dark:text-white"
        />
    );
}
