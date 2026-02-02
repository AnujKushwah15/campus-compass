"use client";

import { useState } from 'react';
import { useTrip } from '@/context/TripContext';
import RouteMap from '@/components/driver/RouteMap';
import StudentList from '@/components/driver/StudentList';
import Button from '@/components/ui/Button';
import { TriangleAlert, Phone, LogOut, Radio } from 'lucide-react';
import Link from 'next/link';

export default function DriverDashboard() {
    const { currentTrip, startTrip, updateLocation } = useTrip();
    const [sosActive, setSosActive] = useState(false);
    const [isTripping, setIsTripping] = useState(false);

    const handleSOS = () => {
        setSosActive(true);
        // In a real app, this would trigger an API call
        alert("SOS ALERT ACTIVATED! Emergency contacts have been notified.");
    };

    const handleStartTrip = async () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        try {
            // Start trip in Firestore (Bus ID would ideally come from user profile)
            await startTrip("bus-1234", "route-1");
            setIsTripping(true);

            // Start Location Tracking
            navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, heading, speed } = position.coords;
                    updateLocation(latitude, longitude, speed);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    alert("Error getting location. Please enable GPS.");
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } catch (error) {
            console.error("Failed to start trip:", error);
            alert("Failed to start trip. Please try again.");
        }
    };

    // If trip is already active from context (page reload), ensure we show dashboard
    // Note: We might miss setting up the watchPosition if we just reload. 
    // In a real app, we'd need a more robust background location service or re-bind here.
    // For this demo, if context has a trip, we show the dashboard.

    if (!currentTrip && !isTripping) {
        return (
            <div className="min-h-screen bg-cc-red-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6 border border-cc-red-100">
                        <div className="w-20 h-20 bg-cc-red-100 rounded-full flex items-center justify-center mx-auto text-cc-red-600">
                            <Radio size={40} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-cc-brown-800">Ready to Start?</h1>
                            <p className="text-cc-brown-500 mt-2">Start the trip to begin sharing your live location with parents and students.</p>
                        </div>

                        <Button
                            onClick={handleStartTrip}
                            className="w-full py-6 text-lg font-bold bg-cc-red-600 hover:bg-cc-red-700 shadow-lg shadow-cc-red-200"
                        >
                            Start Trip
                        </Button>

                        <p className="text-xs text-cc-brown-400">
                            By clicking Start, you agree to share your real-time location.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cc-red-50 pb-20 md:pb-0">
            {/* Header */}
            <header className="bg-white border-b border-cc-red-100 p-4 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cc-red-100 rounded-full flex items-center justify-center text-cc-red-600">
                            <Radio size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-cc-brown-800">Driver Console</h1>
                            <p className="text-xs text-cc-red-500 font-semibold">• LIVE TRACKING ACTIVE</p>
                        </div>
                    </div>
                    <Link href="/">
                        <Button variant="ghost" className="text-cc-brown-500 hover:text-cc-red-600">
                            <LogOut size={20} />
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 space-y-6">
                {/* Quick Actions / Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-cc-red-600 rounded-xl p-4 text-white shadow-lg shadow-cc-red-200">
                        <h2 className="text-sm opacity-90">Next Stop</h2>
                        <p className="text-2xl font-bold mt-1">City Center</p>
                        <div className="mt-4 flex items-center text-sm font-medium bg-white/20 w-fit px-2 py-1 rounded">
                            ETA: 5 Mins
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="bg-white rounded-xl border border-cc-red-100 p-4 flex items-center justify-between shadow-sm">
                            <div>
                                <h3 className="font-bold text-cc-brown-800">Vehicle Status</h3>
                                <p className="text-sm text-cc-brown-500">Bus GJ-01-AB-1234 • Fuel: 78%</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="border-cc-red-200 text-cc-red-600 hover:bg-cc-red-50">
                                    <Phone size={18} className="mr-2" /> Support
                                </Button>
                                <Button
                                    onClick={handleSOS}
                                    className={`font-bold transition-all ${sosActive ? 'bg-red-800 animate-pulse' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    <TriangleAlert size={18} className="mr-2" /> {sosActive ? 'SOS SENT' : 'SOS'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Map */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-4 rounded-xl border border-cc-red-100 shadow-sm">
                            <h3 className="font-bold text-cc-brown-800 mb-4">Live Route</h3>
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
