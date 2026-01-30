"use client";

import { useState, useEffect } from 'react';
import { Check, X, Users } from 'lucide-react';
import { db, usersRef } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { useTrip } from '@/context/TripContext';
import { useAuth } from '@/components/AuthProvider';

export default function StudentList() {
    const { currentTrip } = useTrip();
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busId, setBusId] = useState(null);

    // 1. Determine Bus ID
    useEffect(() => {
        if (currentTrip?.busId) {
            setBusId(currentTrip.busId);
        } else if (user?.assignedBusId) {
            // If we had this in the user profile
            setBusId(user.assignedBusId);
        } else {
            // Fallback for demo/dev if not set
            setBusId("1");
        }
    }, [currentTrip, user]);

    // 2. Fetch Roster & Listen for Attendance
    useEffect(() => {
        if (!busId) return;

        const fetchStudents = async () => {
            try {
                // Fetch all students assigned to this bus
                const q = query(usersRef, where("role", "==", "student"), where("assignedBusId", "==", busId));
                const querySnapshot = await getDocs(q);

                const roster = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    status: 'pending' // Default
                }));

                // If trip is active, listen to attendance changes
                if (currentTrip) {
                    const tripRef = doc(db, "trips", currentTrip.id);
                    const unsubscribe = onSnapshot(tripRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const tripData = docSnap.data();
                            const attendance = tripData.attendance || {};

                            const merged = roster.map(student => ({
                                ...student,
                                status: attendance[student.id]?.status || 'pending'
                            }));
                            setStudents(merged);
                        }
                    });
                    return unsubscribe;
                } else {
                    setStudents(roster);
                }
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setLoading(false);
            }
        };

        const unsubscribePromise = fetchStudents();
        return () => {
            unsubscribePromise.then(unsub => unsub && unsub());
        };
    }, [busId, currentTrip]);

    const updateStatus = async (studentId, name, newStatus) => {
        if (!currentTrip) {
            alert("Please START A TRIP to mark attendance.");
            return;
        }

        // Confirmation Logic
        const student = students.find(s => s.id === studentId);
        if (student && student.status !== 'pending' && student.status !== newStatus) {
            const confirmChange = window.confirm(
                `Change status for ${name} from ${student.status.toUpperCase()} to ${newStatus.toUpperCase()}?`
            );
            if (!confirmChange) return;
        }

        try {
            const tripRef = doc(db, "trips", currentTrip.id);
            await updateDoc(tripRef, {
                [`attendance.${studentId}`]: {
                    status: newStatus,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error("Error updating attendance:", error);
            alert("Failed to update status.");
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
                <p className="text-xs text-muted-foreground mt-1">
                    {currentTrip ? `Trip ID: #${currentTrip.id.slice(0, 8)}` : "No Active Trip"}
                </p>
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
                                {student.name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <p className={`font-semibold text-sm ${student.status === 'absent' ? 'text-muted-foreground decoration-slate-500/50' : 'text-foreground'}`}>
                                    {student.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground">PRN: {student.prn || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => updateStatus(student.id, student.name, 'present')}
                                className={`p-2 rounded-lg transition-all border ${student.status === 'present'
                                    ? 'bg-green-500 border-green-600 text-white shadow-md scale-105'
                                    : 'bg-card border-border text-muted-foreground hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50'
                                    }`}
                                title="Mark Present"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={() => updateStatus(student.id, student.name, 'absent')}
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
                {students.length === 0 && !loading && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No students assigned to Bus {busId}
                    </div>
                )}
            </div>
        </div>
    );
}
