"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { db, tripsRef } from '@/lib/firebase';
import { addDoc, updateDoc, doc, serverTimestamp, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';

const TripContext = createContext();

export function TripProvider({ children }) {
    const { user } = useAuth();
    const [currentTrip, setCurrentTrip] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Listen for Active Trip if User is a Driver
    useEffect(() => {
        if (!user || user.role !== 'driver') {
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
                setCurrentTrip({ id: docSnap.id, ...docSnap.data() });
            } else {
                setCurrentTrip(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // 2. Start Trip Function
    const startTrip = async (busId, routeId) => {
        if (!user) return;

        try {
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

    // 3. End Trip Function
    const endTrip = async () => {
        if (!currentTrip) return;

        try {
            const tripDocRef = doc(db, "trips", currentTrip.id);
            await updateDoc(tripDocRef, {
                status: "completed",
                endTime: serverTimestamp()
            });
            // State will auto-update via listener
        } catch (error) {
            console.error("Error ending trip:", error);
            throw error;
        }
    };

    // 4. Update Location (Called by Driver Page or Hardware)
    const updateLocation = async (lat, lng, speed = 0) => {
        if (!currentTrip) return;

        try {
            const tripDocRef = doc(db, "trips", currentTrip.id);
            await updateDoc(tripDocRef, {
                location: { lat, lng, speed, timestamp: new Date().toISOString() } // Store simplified object
                // Note: We don't use serverTimestamp() inside the map for 'location' 
                // because it can be tricky to read back in real-time listeners quickly 
                // without 'estimate' options, ISO string is fine for display.
            });
        } catch (error) {
            console.error("Error updating location:", error);
        }
    };

    const value = {
        currentTrip,
        loading,
        startTrip,
        endTrip,
        updateLocation
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
