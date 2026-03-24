"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, tripsRef, rtdb } from '@/lib/firebase';
import { ref, set, serverTimestamp as rtdbTimestamp, onValue } from 'firebase/database';
import { addDoc, updateDoc, doc, serverTimestamp, query, where, collection, onSnapshot, limit, getDocs, writeBatch, runTransaction, getDoc } from 'firebase/firestore';
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
        const q = query(
            tripsRef,
            where("driverId", "==", user.uid),
            where("status", "==", "active"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (!snapshot.empty) {
                const docSnap = snapshot.docs[0];
                const tripData = docSnap.data();

                // Auto-close stale trips (started > 12 hours ago).
                // This prevents a trip from a prior session from auto-resuming
                // the active dashboard when the driver logs in.
                const startTime = tripData.startTime?.toMillis?.() || 0;
                const ageMs = Date.now() - startTime;
                const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

                if (startTime > 0 && ageMs > STALE_THRESHOLD_MS) {
                    console.warn('TripContext: Stale active trip found (> 12h old). Auto-closing:', docSnap.id);
                    try {
                        await updateDoc(doc(db, 'trips', docSnap.id), {
                            status: 'completed',
                            endTime: serverTimestamp(),
                            autoClosed: true,
                            autoCloseReason: 'stale_on_login',
                        });
                    } catch (e) {
                        console.error('TripContext: Failed to auto-close stale trip:', e);
                    }
                    // currentTrip will be set to null on the next snapshot (status no longer 'active')
                    setLoading(false);
                    return;
                }

                setCurrentTrip({ id: docSnap.id, ...tripData });
            } else {
                setCurrentTrip(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // 1.5 Fetch Students when Trip is Active
    useEffect(() => {
        if (!currentTrip?.busId) return;

        const q = query(
            collection(db, "students"),
            where("busId", "==", currentTrip.busId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
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
    // Uses a Firestore transaction on buses/{busId} as an atomic mutex to guarantee
    // at most ONE active trip per bus at any point in time, preventing race conditions
    // where two drivers might start simultaneously on the same bus.
    const startTrip = async (busId, routeId) => {
        if (!user) return;

        const busRef = doc(db, 'buses', busId);

        try {
            let newTripId = null;

            await runTransaction(db, async (transaction) => {
                // --- READ PHASE ---
                const busSnap = await transaction.get(busRef);
                const busData = busSnap.exists() ? busSnap.data() : {};
                const existingTripId = busData.activeTripId || null;

                // If the bus already has an activeTripId, verify that trip is truly active
                if (existingTripId) {
                    const existingTripRef = doc(db, 'trips', existingTripId);
                    const existingTripSnap = await transaction.get(existingTripRef);

                    if (existingTripSnap.exists() && existingTripSnap.data().status === 'active') {
                        // A real active trip exists for this bus — block the new one
                        throw new Error(
                            `Bus ${busId} already has an active trip (${existingTripId}). ` +
                            `End that trip before starting a new one.`
                        );
                    }
                    // Stale lock (trip completed/missing) — will be overwritten below
                    console.warn('TripContext: Stale activeTripId on bus doc, overwriting:', existingTripId);
                }

                // --- WRITE PHASE ---
                // Create a new trip document ref (addDoc can't run inside a transaction,
                // so we create the ref manually and use transaction.set)
                const newTripRef = doc(collection(db, 'trips'));
                newTripId = newTripRef.id;

                const newTripData = {
                    driverId: user.uid,
                    driverName: user.displayName || user.email,
                    busId,
                    routeId: routeId || 'default_route',
                    status: 'active',
                    startTime: serverTimestamp(),
                    location: { lat: 0, lng: 0, speed: 0 },
                    attendance: {},
                };

                // Write the new trip
                transaction.set(newTripRef, newTripData);

                // Stamp the bus doc with the active trip lock
                transaction.set(busRef, { activeTripId: newTripId }, { merge: true });
            });

            console.log('TripContext: Trip started with atomic lock:', newTripId);
            return newTripId;
        } catch (error) {
            console.error('TripContext: startTrip failed:', error.message);
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
    const endTrip = async () => {
        if (!currentTrip) return;

        try {
            console.log('TripContext: Ending trip...', currentTrip.id);

            const batch = writeBatch(db);

            // 1. Export attendance to permanent collection (auto-absent for unmarked students)
            if (students.length > 0) {
                students.forEach(student => {
                    const finalStatus = student.status === 'present' ? 'present' : 'absent';
                    const timestamp = student.attendanceTimestamp || new Date().toISOString();
                    const attendanceRef = doc(db, 'attendance', `${currentTrip.id}_${student.id}`);
                    batch.set(attendanceRef, {
                        id: `${currentTrip.id}_${student.id}`,
                        tripId: currentTrip.id,
                        busId: currentTrip.busId,
                        studentId: student.id,
                        studentName: student.name || 'Unknown',
                        status: finalStatus,
                        timestamp,
                        date: new Date().toISOString().split('T')[0],
                        autoMarked: student.status === 'pending',
                    });
                });
            } else {
                console.warn('TripContext: No students in state — skipping attendance export.');
            }

            // 2. Mark trip as completed
            const tripDocRef = doc(db, 'trips', currentTrip.id);
            batch.update(tripDocRef, {
                status: 'completed',
                endTime: serverTimestamp(),
            });

            // 3. Release the bus-level lock so a new trip can be started
            const busRef = doc(db, 'buses', currentTrip.busId);
            batch.update(busRef, { activeTripId: null });

            await batch.commit();
            // currentTrip state will auto-null via the onSnapshot listener
        } catch (error) {
            console.error('TripContext: endTrip failed:', error);
            throw error;
        }
    };

    // 4. Update Location (Called by Driver Page) - Writes to RTDB (Source: Phone)
    const updateLocation = useCallback(async (lat, lng, speed = 0, accuracy = 0) => {
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
            const sourceRef = ref(rtdb, `buses/${currentTrip?.busId}/sources/phone`);
            await set(sourceRef, locationData);

            // Note: We NO LONGER write to Firestore 'trips' doc here.
            // That is now the job of the Cloud Function (Arbitration Logic).
            // However, for pure client-side MVP without Cloud Functions, we might blindly copy to location node too.
            // For this phase, we follow the plan: Write to SOURCE node.
        } catch (error) {
            console.error("Error updating RTDB location:", error);
        }
    }, [currentTrip?.busId]);

    const value = {
        currentTrip,
        loading,
        startTrip,
        endTrip,
        updateLocation,
        markAttendance,
        students,
        busLocation
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
