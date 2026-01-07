"use client";

import { useState, useEffect } from 'react';
import { Check, X, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';

// Mock Student Data to seed the DB if empty (for testing)
const MOCK_ROSTER = [
    { id: "101", name: "Aarav Patel", prn: "2023001" },
    { id: "102", name: "Diya Sharma", prn: "2023002" },
    { id: "103", name: "Ishaan Gupta", prn: "2023003" },
    { id: "104", name: "Ananya Singh", prn: "2023004" },
    { id: "105", name: "Vihaan Kumar", prn: "2023005" },
];

export default function StudentList() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Hardcoded Trip ID for demo purposes. In real app, this comes from context/auth.
    const TRIP_ID = "trip_demo_1";

    useEffect(() => {
        // 1. Listen to the specific trip document
        const tripRef = doc(db, "trips", TRIP_ID);

        const unsubscribe = onSnapshot(tripRef, async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                const attendanceData = data.attendance || {};

                // Merge roster with attendance status
                const mergedList = MOCK_ROSTER.map(student => ({
                    ...student,
                    status: attendanceData[student.id] ? attendanceData[student.id].status : 'pending'
                }));

                setStudents(mergedList);
                setLoading(false);
            } else {
                // If trip doc doesn't exist, create it (Self-healing for demo)
                await setDoc(tripRef, {
                    busId: "1",
                    status: "active",
                    attendance: {}
                });
            }
        });

        return () => unsubscribe();
    }, []);

    const updateStatus = async (studentId, newStatus) => {
        const student = students.find(s => s.id === studentId);

        // Confirmation Logic
        if (student.status !== 'pending' && student.status !== newStatus) {
            const confirmChange = window.confirm(
                `Change status for ${student.name} from ${student.status.toUpperCase()} to ${newStatus.toUpperCase()}?`
            );
            if (!confirmChange) return;
        }

        try {
            const tripRef = doc(db, "trips", TRIP_ID);
            // Update the specific student's field in the map
            await updateDoc(tripRef, {
                [`attendance.${studentId}`]: {
                    status: newStatus,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error("Error updating attendance:", error);
            alert("Failed to update status. Please try again.");
        }
    };

    const presentCount = students.filter(s => s.status === 'present').length;

    if (loading) return <div className="h-full bg-card rounded-xl border border-border p-4 text-muted-foreground animate-pulse">Loading Manifest...</div>;

    return (
        <div className="h-full bg-card rounded-xl border border-border shadow-lg flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/20">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-foreground">Student Manifest</h3>
                    <div className="flex items-center gap-2 bg-cc-purple-500/10 px-2 py-1 rounded-full border border-cc-purple-500/20">
                        <Users size={12} className="text-cc-purple-400" />
                        <span className="text-xs text-cc-purple-400 font-bold">{presentCount} / {students.length} Onboard</span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Trip ID: #{TRIP_ID.slice(0, 8)}</p>
            </div>

            <div className="divide-y divide-border overflow-y-auto flex-1">
                {students.map((student) => (
                    <div key={student.id} className={`p-4 flex items-center justify-between transition-colors group ${student.status === 'present' ? 'bg-green-500/5 hover:bg-green-500/10' :
                            student.status === 'absent' ? 'bg-red-500/5 hover:bg-red-500/10' :
                                'hover:bg-secondary/10'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${student.status === 'present' ? 'bg-green-500 text-white' :
                                    student.status === 'absent' ? 'bg-red-500 text-white' :
                                        'bg-secondary text-muted-foreground'
                                }`}>
                                {student.name.charAt(0)}
                            </div>
                            <div>
                                <p className={`font-semibold text-sm ${student.status === 'absent' ? 'text-muted-foreground decoration-slate-500/50' : 'text-foreground'}`}>
                                    {student.name}
                                </p>
                                <p className="text-xs text-muted-foreground">PRN: {student.prn}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => updateStatus(student.id, 'present')}
                                className={`p-2 rounded-lg transition-all border ${student.status === 'present'
                                        ? 'bg-green-500 border-green-600 text-white shadow-md scale-105'
                                        : 'bg-card border-border text-muted-foreground hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50'
                                    }`}
                                title="Mark Present"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={() => updateStatus(student.id, 'absent')}
                                className={`p-2 rounded-lg transition-all border ${student.status === 'absent'
                                        ? 'bg-red-500 border-red-600 text-white shadow-md scale-105'
                                        : 'bg-card border-border text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50'
                                    }`}
                                title="Mark Absent"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
