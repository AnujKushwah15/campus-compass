"use client";

import { useState } from 'react';
import RouteMap from '@/components/driver/RouteMap';
import StudentList from '@/components/driver/StudentList';
import Button from '@/components/ui/Button';
import { TriangleAlert, Phone, LogOut, Radio } from 'lucide-react';
import Link from 'next/link';

export default function DriverDashboard() {
    const [sosActive, setSosActive] = useState(false);

    const handleSOS = () => {
        setSosActive(true);
        // In a real app, this would trigger an API call
        alert("SOS ALERT ACTIVATED! Emergency contacts have been notified.");
    };

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
