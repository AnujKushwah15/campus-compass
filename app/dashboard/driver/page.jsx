"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RouteMap from '@/components/driver/RouteMap';
import StudentList from '@/components/driver/StudentList';
import Button from '@/components/ui/Button';
import { TriangleAlert, Phone, Radio, LogOut } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useTrip } from '@/context/TripContext';
import Link from 'next/link';

export default function DriverDashboard() {
    const router = useRouter();
    const { currentTrip, startTrip, endTrip, updateLocation } = useTrip();
    const [sosActive, setSosActive] = useState(false);
    const [sendingSOS, setSendingSOS] = useState(false);
    const [isTripping, setIsTripping] = useState(false); // Local state for immediate UI feedback

    // 1. Force Location Prompt on Mount & Track Location if Trip Active
    useEffect(() => {
        if (!navigator.geolocation) {
            console.error("Geolocation is not supported by your browser");
            return;
        }

        // Always request position immediately to trigger permission prompt
        // We use watchPosition so it persists if the user starts the trip
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, speed } = position.coords;

                // Only update context/firestore if we are actually in an active trip
                if (currentTrip?.status === 'active' || isTripping) {
                    updateLocation(latitude, longitude, speed);
                }
            },
            (error) => {
                console.error("Location Error Details:", {
                    code: error.code,
                    message: error.message,
                    PERMISSION_DENIED: error.PERMISSION_DENIED,
                    POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
                    TIMEOUT: error.TIMEOUT
                });

                let errorMsg = "Location Error: " + error.message;

                if (error.code === error.PERMISSION_DENIED) {
                    errorMsg = "Location access denied. Please enable location permissions in your browser settings.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMsg = "Location unavailable. Check your device GPS.";
                } else if (error.code === error.TIMEOUT) {
                    errorMsg = "Location request timed out.";
                }

                // Check for Insecure Context (Common on local network dev)
                if (!window.isSecureContext) {
                    errorMsg += " (WARNING: Geolocation requires HTTPS or localhost)";
                }

                alert(errorMsg);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [currentTrip, isTripping, updateLocation]);


    const handleStartTrip = async () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        try {
            // Bus ID would ideally come from User Profile, but for now we use the seeded ID
            await startTrip("bus-1", "route-1");
            setIsTripping(true);
        } catch (error) {
            console.error("Failed to start trip:", error);
            alert("Failed to start trip. Please try again.");
        }
    };

    const handleEndTrip = async () => {
        if (window.confirm("End the current trip?")) {
            await endTrip();
            setIsTripping(false);
        }
    };

    const handleSOS = async () => {
        if (sosActive || sendingSOS) return;

        const confirmSOS = window.confirm("ARE YOU SURE? This will send an emergency alert to the admin and parents.");
        if (!confirmSOS) return;

        setSendingSOS(true);

        try {
            await addDoc(collection(db, "alerts"), {
                type: "SOS",
                busId: currentTrip?.busId || "1",
                busNumber: "GJ-01-AB-1234",
                driverName: "Mock Driver", // Would come from auth
                location: currentTrip?.location || { lat: 23.0225, lng: 72.5714 },
                timestamp: serverTimestamp(),
                status: "active",
                message: "Emergency Alert Triggered by Driver"
            });

            setSosActive(true);
            alert("SOS ALERT SENT! Emergency contacts have been notified.");
        } catch (error) {
            console.error("Error sending SOS:", error);
            alert("Failed to send SOS. Please call support immediately.");
        } finally {
            setSendingSOS(false);
        }
    };

    const handleLogout = async () => {
        if (window.confirm("Are you sure you want to log out?")) {
            try {
                await signOut(auth);
                router.push('/auth');
            } catch (error) {
                console.error("Logout Error:", error);
                alert("Failed to log out. Please try again.");
            }
        }
    };

    // SPLASH SCREEN: Show if no trip is active locally or remotely
    if (!currentTrip && !isTripping) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-card rounded-2xl shadow-xl p-8 text-center space-y-6 border border-border">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                            <Radio size={40} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-card-foreground">Ready to Start?</h1>
                            <p className="text-muted-foreground mt-2">Start the trip to begin sharing your live location with parents and students.</p>
                        </div>

                        <Button
                            onClick={handleStartTrip}
                            className="w-full py-6 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/30 border border-indigo-500/50"
                        >
                            Start Trip
                        </Button>

                        <div className="flex justify-center mt-4">
                            <Button
                                onClick={handleLogout}
                                variant="outline"
                                className="w-full border-2 border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-2 font-semibold"
                            >
                                <LogOut size={16} /> Logout
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            By clicking Start, you agree to share your real-time location.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 md:pb-0 min-h-screen bg-background pt-6">

            <main className="space-y-6 px-4 md:px-6">
                {/* Quick Actions / Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Next Stop Card */}
                    <div className="bg-gradient-to-br from-cc-purple-900 to-cc-purple-800 rounded-2xl p-6 text-white shadow-lg shadow-cc-purple-900/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-colors"></div>
                        <h2 className="text-sm font-medium text-purple-200 uppercase tracking-widest mb-1">Next Stop</h2>
                        <p className="text-3xl font-bold mb-4">City Center</p>
                        <div className="flex items-center text-sm font-bold bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
                            ETA: 5 Mins
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4 h-full">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                                    <div className="text-2xl">🚌</div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-foreground">Bus GJ-01-AB-1234</h3>
                                    <p className="text-sm text-muted-foreground">{currentTrip ? 'Trip Active' : 'Idle'} • Bus 1</p>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <Button
                                    onClick={handleEndTrip}
                                    variant="warning"
                                    className="flex-1 sm:flex-none font-bold"
                                >
                                    STOP TRIP
                                </Button>
                                <Button variant="outline" className="flex-1 sm:flex-none border-border hover:bg-secondary text-foreground">
                                    <Phone size={18} className="mr-2" /> Support
                                </Button>
                                <Button
                                    onClick={handleSOS}
                                    disabled={sendingSOS || sosActive}
                                    className={`flex-1 sm:flex-none font-bold transition-all text-white border-0 ${sosActive
                                        ? 'bg-red-600 animate-pulse shadow-lg shadow-red-500/50 cursor-not-allowed'
                                        : sendingSOS
                                            ? 'bg-red-400 cursor-wait'
                                            : 'bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20'
                                        }`}
                                >
                                    <TriangleAlert size={18} className="mr-2" />
                                    {sendingSOS ? 'SENDING...' : sosActive ? 'SOS SENT' : 'SOS ALERT'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Map */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card p-1 rounded-2xl border border-border shadow-sm">
                            <div className="p-4 flex justify-between items-center">
                                <h3 className="font-bold text-foreground">Live Route Map</h3>
                                <span className="text-xs text-muted-foreground">Updated: Just now</span>
                            </div>
                            <RouteMap />
                        </div>
                    </div>

                    {/* Right Column: Student List */}
                    <div className="lg:col-span-1 h-[500px]">
                        <StudentList />
                    </div>
                </div>
            </main>
        </div>
    );
}
