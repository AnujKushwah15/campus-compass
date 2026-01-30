"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RouteMap from '@/components/driver/RouteMap';
import StudentList from '@/components/driver/StudentList';
import Button from '@/components/ui/Button';
import { TriangleAlert, Phone, Radio, LogOut } from 'lucide-react';
import StreamPlayer from '@/components/ui/StreamPlayer';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useTrip } from '@/context/TripContext';

export default function DriverDashboard() {
    const router = useRouter();
    const { currentTrip, startTrip, endTrip, updateLocation } = useTrip();
    const [sosActive, setSosActive] = useState(false);
    const [sendingSOS, setSendingSOS] = useState(false);

    // Geolocation Tracker
    useEffect(() => {
        let watchId;
        if (currentTrip?.status === 'active') {
            if (!navigator.geolocation) {
                console.log("Geolocation is not supported by your browser");
                return;
            }

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, speed } = position.coords;
                    // Update Context (which updates Firestore)
                    updateLocation(latitude, longitude, speed);
                },
                (error) => {
                    console.error("Location Error:", error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        }
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [currentTrip, updateLocation]);

    const handleToggleTrip = async () => {
        if (currentTrip) {
            if (window.confirm("End the current trip?")) {
                await endTrip();
            }
        } else {
            // Bus ID would ideally come from User Profile
            await startTrip("1", "route_default");
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
                                    onClick={handleToggleTrip}
                                    variant={currentTrip ? "warning" : "default"}
                                    className="flex-1 sm:flex-none font-bold"
                                >
                                    {currentTrip ? "STOP TRIP" : "START TRIP"}
                                </Button>
                                <Button
                                    onClick={handleLogout}
                                    variant="outline"
                                    className="flex-1 sm:flex-none border-border hover:bg-secondary text-foreground"
                                >
                                    <LogOut size={18} className="mr-2" /> Logout
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
