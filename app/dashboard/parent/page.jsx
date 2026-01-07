"use client";

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import Badge from '@/components/ui/Badge';
import { Search, MapPin, Phone, ShieldCheck, Video, User } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const LiveMap = dynamic(() => import('@/components/ui/LiveMap'), { ssr: false });

export default function ParentDashboard() {
    const [user, setUser] = useState(null);
    const [studentLink, setStudentLink] = useState(null); // The linked child
    const [tripData, setTripData] = useState(null);       // Live trip data
    const [loading, setLoading] = useState(true);
    const [showLiveFeed, setShowLiveFeed] = useState(false);

    // MOCK: Production app would fetch this from a 'relationships' collection or User profile
    const MOCK_PARENT_LINKING = (email) => {
        // For demo, we assume any logged in user links to "Aarav" (Student 101)
        // You can add more cases here for testing
        return {
            studentId: "101",
            name: "Aarav Patel",
            prn: "2023001",
            busId: "Bus 1",
            busNumber: "GJ-01-AB-1234",
            driverName: "Rajesh Kumar",
            driverPhone: "+91 98765 43210"
        };
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const linkedChild = MOCK_PARENT_LINKING(currentUser.email);
                setStudentLink(linkedChild);

                // Listen to the Active Trip for this bus
                // (Demo: Hardcoded trip ID matching Driver/Admin)
                const TRIP_ID = "trip_demo_1";
                const tripRef = doc(db, "trips", TRIP_ID);

                const unsubscribeTrip = onSnapshot(tripRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setTripData(docSnap.data());
                    }
                    setLoading(false);
                });

                return () => unsubscribeTrip();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Derived Status
    const getStudentStatus = () => {
        if (!tripData || !studentLink) return 'waiting';
        const attendance = tripData.attendance || {};
        const record = attendance[studentLink.studentId];
        return record ? record.status : 'pending';
    };

    const status = getStudentStatus();

    if (showLiveFeed) {
        return (
            <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center animate-fadeIn">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-foreground text-xl font-bold tracking-widest animate-pulse">CONNECTING TO {studentLink?.busNumber}...</h2>
                <button
                    onClick={() => setShowLiveFeed(false)}
                    className="mt-8 text-muted-foreground hover:text-foreground text-sm underline"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">Loading Secure Parent Portal...</div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <ShieldCheck size={48} className="text-cc-purple-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Login Required</h1>
                <p className="text-muted-foreground">Please log in to view your child's safety dashboard.</p>
                <Button href="/auth" className="mt-6">Go to Login</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        Tracking: {studentLink?.name}
                        {status === 'present' && <Badge variant="success" className="animate-in fade-in zoom-in">ONBOARD</Badge>}
                        {status === 'absent' && <Badge variant="danger" className="animate-in fade-in zoom-in">ABSENT</Badge>}
                        {status === 'pending' && <Badge variant="neutral" className="animate-in fade-in zoom-in">WAITING</Badge>}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span className="font-medium bg-muted px-2 py-0.5 rounded">PRN: {studentLink?.prn}</span>
                        <span>•</span>
                        <span>{studentLink?.busNumber}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Map */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-card/60 backdrop-blur-sm border border-border p-4 rounded-2xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full animate-pulse ${status === 'present' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <h2 className="text-lg font-bold text-foreground">
                                {status === 'present' ? 'Bus is en route' : 'Waiting for boarding'}
                            </h2>
                        </div>
                        <Badge variant={status === 'present' ? 'success' : 'neutral'}>
                            {status === 'present' ? 'Live' : 'Standby'}
                        </Badge>
                    </div>

                    <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-border relative z-0 shadow-lg">
                        {/* Mocking bus location for now, but in real app we'd pass tripData.location */}
                        <LiveMap busLocation={{ lat: 23.0225, lng: 72.5714 }} />
                    </div>

                    {/* Friendly Status Message based on real state */}
                    <div className={`p-4 border rounded-xl ${status === 'present' ? 'bg-green-500/10 border-green-500/30' : 'bg-secondary/10 border-secondary/30'}`}>
                        <p className="text-foreground font-medium text-center">
                            {status === 'present'
                                ? `"${studentLink?.name} is safely onboard. Estimated arrival time: 5:40 PM."`
                                : status === 'absent'
                                    ? `"${studentLink?.name} has been marked ABSENT for this trip."`
                                    : `"Waiting for ${studentLink?.name} to board the bus at the designated stop."`
                            }
                        </p>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="space-y-4">
                    {/* Driver Details (Prominent) */}
                    <Card padding="sm" className="bg-gradient-to-br from-cc-purple-900 to-cc-purple-800 text-white shadow-xl overflow-hidden relative border-none">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl border-2 border-white/30 backdrop-blur-md">
                                    👨‍✈️
                                </div>
                                <div>
                                    <p className="text-xs opacity-70 mb-0.5 uppercase tracking-wider font-semibold">Driver Details</p>
                                    <p className="font-bold text-lg leading-tight">{studentLink?.driverName}</p>
                                    <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
                                        <span className="bg-white/10 px-1.5 rounded">⭐ 4.8</span>
                                        <span>•</span>
                                        <span>{studentLink?.driverPhone}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="bg-white text-cc-purple-900 p-2.5 rounded-full hover:bg-gray-100 transition-colors shadow-lg active:scale-95">
                                <Phone size={20} />
                            </button>
                        </div>
                    </Card>

                    {/* Request Live Feed Button */}
                    <Button
                        variant="danger"
                        className="w-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                        onClick={() => setShowLiveFeed(true)}
                        disabled={status !== 'present'} // Only allow feed if student is on board
                    >
                        <Video size={18} />
                        {status === 'present' ? 'Request Live Feed' : 'Feed Unavailable (Not Onboard)'}
                    </Button>

                    <Card>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Trip Timeline</h3>
                        <div className="space-y-6 relative">
                            {/* Timeline */}
                            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-muted"></div>

                            <TimelineItem
                                status="completed"
                                time="05:10 PM"
                                title="Left Campus"
                                desc="Bus departed from main gate"
                            />
                            <TimelineItem
                                status={status === 'present' ? 'current' : 'upcoming'}
                                time="Live"
                                title={status === 'present' ? 'En Route' : 'Waiting at Campus'}
                                desc={status === 'present' ? 'Moving towards next stop' : 'Waiting for departure'}
                            />
                            <TimelineItem
                                status="upcoming"
                                time="05:40 PM"
                                title="Home Drop"
                                desc="Est. Arrival"
                            />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function TimelineItem({ time, title, desc, status }) {
    const dotStyles = {
        completed: "bg-accent ring-4 ring-accent/30",
        current: "bg-secondary ring-4 ring-secondary/30 animate-pulse",
        upcoming: "bg-background border-2 border-muted"
    };

    return (
        <div className={`relative pl-8 ${status === 'upcoming' ? 'opacity-60' : ''}`}>
            <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full z-10 ${dotStyles[status]}`}></div>
            <div className="flex flex-col">
                <span className="text-xs font-bold opacity-60 mb-0.5">{time}</span>
                <span className={`text-sm font-bold ${status === 'current' ? 'text-secondary' : 'text-foreground'}`}>{title}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
        </div>
    );
}
