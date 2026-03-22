"use client";

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import AttendanceView from '@/features/attendance/components/AttendanceView';

export default function ParentAttendancePage() {
    const [attendanceData, setAttendanceData] = useState(null);
    const [studentName, setStudentName] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // 1. Fetch linked student(s)
                    const studentsRef = collection(db, 'students');
                    const qStudent = query(studentsRef, where('parentId', '==', user.uid));
                    const studentSnap = await getDocs(qStudent);

                    if (!studentSnap.empty) {
                        const studentDoc = studentSnap.docs[0]; // Default to first student
                        const student = studentDoc.data();
                        setStudentName(student.name);

                        // 2. Fetch Attendance (Current Month + Previous 3 Months)
                        const threeMonthsAgo = new Date();
                        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                        const dateLimitStr = threeMonthsAgo.toISOString().split('T')[0];

                        const attendanceRef = collection(db, 'attendance');
                        const qAttendance = query(
                            attendanceRef,
                            where('studentId', '==', studentDoc.id),
                            where('date', '>=', dateLimitStr),
                            orderBy('date', 'desc')
                        );

                        const attendanceSnap = await getDocs(qAttendance);

                        const history = attendanceSnap.docs.map(doc => doc.data());

                        // 3. Calculate Stats for CURRENT MONTH
                        const now = new Date();
                        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                        const currentMonthRecords = history.filter(record =>
                            record.date.startsWith(currentMonthStr)
                        );

                        const totalDays = currentMonthRecords.length;
                        const presentDays = currentMonthRecords.filter(r => r.status === 'present').length;
                        const absentDays = currentMonthRecords.filter(r => r.status === 'absent').length;
                        const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

                        setAttendanceData({
                            totalDays,
                            presentDays,
                            absentDays,
                            percentage,
                            history // Pass full history for calendar rendering
                        });
                    } else {
                        // Handle no linked student
                        setStudentName("Unknown Student");
                        setAttendanceData({
                            totalDays: 0,
                            presentDays: 0,
                            absentDays: 0,
                            percentage: 0,
                            history: []
                        });
                    }
                } catch (error) {
                    console.error("Error fetching attendance:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Attendance Records...</div>;
    }

    if (!attendanceData) {
        return <div className="p-8 text-center text-muted-foreground">No attendance records found.</div>;
    }

    return (
        <AttendanceView
            title="Child Attendance"
            studentName={studentName || "Child"}
            data={attendanceData}
        />
    );
}
