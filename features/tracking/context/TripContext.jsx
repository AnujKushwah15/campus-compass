"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { db, tripsRef, rtdb } from '@/lib/firebase';
import { ref, set, serverTimestamp as rtdbTimestamp, onValue } from 'firebase/database';
import { addDoc, updateDoc, doc, serverTimestamp, query, where, collection, onSnapshot, limit, getDocs, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/features/auth/components/AuthProvider';

const TripContext = createContext();

export function TripProvider({ children }) {
    const { user } = useAuth();
    const [currentTrip, setCurrentTrip] = useState(null);
    const [students, setStudents] = useState([]); // [NEW] List of students for the active trip
    const [loading, setLoading] = useState(true);
    const [busLocation, setBusLocation] = useState(null); // [NEW] Live Hybrid Location from RTDB

    // 1. Listen for Active Trip
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Query for any 'active' trip for this driver
        // Note: In a real app, you might want to compound query by busId too
        const q = query(
            tripsRef,
            where("driverId", "==", user.uid),
            where("status", "==", "active"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docSnap = snapshot.docs[0];
                console.log("TripContext: Active Trip Found:", docSnap.data());
                setCurrentTrip({ id: docSnap.id, ...docSnap.data() });
            } else {
                console.log("TripContext: No Active Trip");
                setCurrentTrip(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // 1.5 Fetch Students when Trip is Active
    useEffect(() => {
        if (!currentTrip?.busId) return;

        console.log("TripContext: Fetching students for busId:", currentTrip.busId);

        const q = query(
            collection(db, "students"),
            where("busId", "==", currentTrip.busId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("TripContext: Student Snapshot Size:", snapshot.size);
            const studentList = snapshot.docs.map(doc => {
                const sData = doc.data();
                // [NEW] Merge Live Attendance Status from currentTrip
                const attendanceRecord = currentTrip?.attendance?.[doc.id];
                return {
                    id: doc.id,
                    ...sData,
                    status: attendanceRecord?.status || 'pending', // 'pending' | 'present' | 'absent'
                    attendanceTimestamp: attendanceRecord?.timestamp || null
                };
            });
            console.log("TripContext: Fetched Students with Status:", studentList);
            setStudents(studentList);
        });

        return () => unsubscribe();
    }, [currentTrip?.busId, currentTrip?.attendance]);

    // 1.8 Listen for Live Hybrid Location (RTDB)
    useEffect(() => {
        if (!currentTrip?.busId) {
            setBusLocation(null);
            return;
        }

        const busNodeRef = ref(rtdb, `buses/${currentTrip.busId}`);
        const unsubscribe = onValue(busNodeRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.location) {
                // This is the Authoritative Location from the Arbitrator
                setBusLocation(data.location);
            }
        });

        return () => unsubscribe();
    }, [currentTrip?.busId]);



    // 2. Start Trip Function
    const startTrip = async (busId, routeId) => {
        if (!user) return;

        try {
            // [NEW] Cleanup: Automatically close any existing active trips for this bus
            const qActive = query(
                tripsRef,
                where("status", "==", "active"),
                where("busId", "==", busId)
            );

            const activeSnapshot = await getDocs(qActive);
            if (!activeSnapshot.empty) {
                console.log(`TripContext: Found ${activeSnapshot.size} stale active trips. Closing...`);
                // Close them one by one (batch variable not strictly needed if we just await loop)
                const batch = writeBatch(db);
                activeSnapshot.forEach(docSnap => {
                    batch.update(doc(db, "trips", docSnap.id), {
                        status: "completed",
                        endTime: serverTimestamp(),
                        autoClosed: true
                    });
                });
                await batch.commit();
            }

            const newTrip = {
                driverId: user.uid,
                driverName: user.displayName || user.email,
                busId: busId,
                routeId: routeId || "default_route",
                status: "active",
                startTime: serverTimestamp(),
                location: { lat: 0, lng: 0, speed: 0 }, // Initial
                attendance: {} // To track students
            };

            const docRef = await addDoc(tripsRef, newTrip);
            return docRef.id;
        } catch (error) {
            console.error("Error starting trip:", error);
            throw error;
        }
    };

    // 2.5 Mark Attendance (Optimized: Updates Trip Doc only)
    const markAttendance = async (studentId, status) => {
        if (!currentTrip) return;
        try {
            const tripRef = doc(db, "trips", currentTrip.id);
            const updateField = `attendance.${studentId}`;
            await updateDoc(tripRef, {
                [updateField]: {
                    status: status,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error("Error marking attendance:", error);
            throw error;
        }
    };

    // 3. End Trip Function (Batch Export)
    // 3. End Trip Function (Batch Export)
    const endTrip = async () => {
        if (!currentTrip) return;

        try {
            console.log("TripContext: Ending trip...", currentTrip.id);
            console.log("TripContext: Students in state:", students);

            const batch = writeBatch(db);

            // 1. Move Attendance to Permanent Collection (Auto-Absent Logic)
            if (students.length > 0) {
                console.log(`TripContext: Batching attendance for ${students.length} students...`);
                students.forEach(student => {
                    // Logic: If status is 'pending' (not marked), mark as 'absent'
                    const finalStatus = student.status === 'present' ? 'present' : 'absent';
                    const timestamp = student.attendanceTimestamp || new Date().toISOString();

                    const attendanceRef = doc(db, "attendance", `${currentTrip.id}_${student.id}`);
                    batch.set(attendanceRef, {
                        id: `${currentTrip.id}_${student.id}`,
                        tripId: currentTrip.id,
                        busId: currentTrip.busId,
                        studentId: student.id,
                        studentName: student.name || 'Unknown',
                        status: finalStatus,
                        timestamp: timestamp,
                        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                        autoMarked: student.status === 'pending' // Flag for clarity
                    });
                });
            } else {
                console.warn("TripContext: No students found in state! Skipping attendance batch export.");
                alert("Warning: No students found to save attendance for. Check console.");
            }

            // 2. Close the Trip
            const tripDocRef = doc(db, "trips", currentTrip.id);
            batch.update(tripDocRef, {
                status: "completed",
                endTime: serverTimestamp()
            });

            await batch.commit();
            // State will auto-update via listener
        } catch (error) {
            console.error("Error ending trip:", error);
            throw error;
        }
    };

    // 4. Update Location (Called by Driver Page or Hardware)
    // 4. Update Location (Called by Driver Page) - Writes to RTDB (Source: Phone)
    const updateLocation = async (lat, lng, speed = 0, accuracy = 0) => {
        if (!currentTrip?.busId) return;

        try {
            const locationData = {
                lat,
                lng,
                speed,
                accuracy, // New: Confidence metric
                timestamp: rtdbTimestamp(), // Server time
                last_seen: Date.now(), // Client time
                connected: true // Flag
            };

            // Write to /buses/{busId}/sources/phone
            const sourceRef = ref(rtdb, `buses/${currentTrip.busId}/sources/phone`);
            await set(sourceRef, locationData);

            // Note: We NO LONGER write to Firestore 'trips' doc here.
            // That is now the job of the Cloud Function (Arbitration Logic).
            // However, for pure client-side MVP without Cloud Functions, we might blindly copy to location node too.
            // For this phase, we follow the plan: Write to SOURCE node.
        } catch (error) {
            console.error("Error updating RTDB location:", error);
        }
    };

    const value = {
        currentTrip,
        loading,
        startTrip,
        endTrip,
        endTrip,
        updateLocation,
        updateLocation,
        markAttendance,
        students,
        busLocation // [NEW] Export Live Location
    };

    return (
        <TripContext.Provider value={value}>
            {children}
        </TripContext.Provider>
    );
}

export function useTrip() {
    return useContext(TripContext);
}
