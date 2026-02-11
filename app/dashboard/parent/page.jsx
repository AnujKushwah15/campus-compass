"use client";

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import Badge from '@/components/ui/Badge';
import { Search, MapPin, Phone, ShieldCheck, Video, User } from 'lucide-react';
import { auth, db, rtdb } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { StreamProvider, useStream } from '@/context/StreamContext';
import StreamPlayer from '@/components/ui/StreamPlayer';

const LiveMap = dynamic(() => import('@/components/ui/LiveMap'), { ssr: false });

export default function ParentDashboard() {
    const [user, setUser] = useState(null);
    const [studentLink, setStudentLink] = useState(null); // The linked child
    const [tripData, setTripData] = useState(null);       // Live trip data
    const [loading, setLoading] = useState(true);
    const [showLiveFeed, setShowLiveFeed] = useState(false);
    const [liveLocation, setLiveLocation] = useState(null); // Real-time from RTDB

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. Fetch student linked to this parent
                try {
                    const studentsRef = collection(db, "students");
                    // Using parentId field established in Auth Flow
                    const q = query(studentsRef, where("parentId", "==", currentUser.uid), limit(1));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const studentDoc = querySnapshot.docs[0];
                        const studentData = studentDoc.data();

                        // Set basic link info
                        const linkData = {
                            studentId: studentDoc.id,
                            name: studentData.name,
                            prn: studentData.prn,
                            busId: studentData.assignedBusId,
                            busNumber: studentData.busNumber || "Assigned Bus",
                            driverName: studentData.driverName || "School Driver",
                            driverPhone: studentData.driverPhone || "N/A"
                        };
                        setStudentLink(linkData);

                        // 2. Listen for the ACTIVE Trip for this bus
                        if (linkData.busId) {
                            const tripsRef = collection(db, "trips");
                            // Complex query: Bus + Active Status
                            const tripQuery = query(
                                tripsRef,
                                where("busId", "==", linkData.busId),
                                where("status", "==", "active"),
                                limit(1)
                            );

                            const unsubscribeTrip = onSnapshot(tripQuery, (snapshot) => {
                                if (!snapshot.empty) {
                                    const docSnap = snapshot.docs[0];
                                    setTripData({ id: docSnap.id, ...docSnap.data() });
                                } else {
                                    setTripData(null); // No active trip
                                }
                                setLoading(false);
                            });

                            // Clean up trip listener when auth changes
                            // Note: In strict mode this might be tricky, but for MVP it's fine inside auth listener
                            // Ideally we'd separate this useEffect, but nesting ensures order.
                        } else {
                            setLoading(false);
                        }

                    } else {
                        console.log("No student found for this parent");
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Error fetching student Data:", error);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Subscribe to RTDB for live bus location
    useEffect(() => {
        if (!studentLink?.busId) return;

        const busLocRef = ref(rtdb, `buses/${studentLink.busId}/location`);
        const unsubscribe = onValue(busLocRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setLiveLocation(data);
        });

        return () => unsubscribe();
    }, [studentLink?.busId]);

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
            <StreamProvider busId={studentLink?.busId}>
                <LiveFeedOverlay
                    busNumber={studentLink?.busNumber}
                    onClose={() => setShowLiveFeed(false)}
                />
            </StreamProvider>
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
                        Tracking: {studentLink?.name || "Student"}
                        {status === 'present' && <Badge variant="success" className="animate-in fade-in zoom-in">ONBOARD</Badge>}
                        {status === 'absent' && <Badge variant="danger" className="animate-in fade-in zoom-in">ABSENT</Badge>}
                        {status === 'pending' && tripData && <Badge variant="neutral" className="animate-in fade-in zoom-in">WAITING</Badge>}
                        {!tripData && <Badge variant="neutral" className="opacity-50">NO ACTIVE TRIP</Badge>}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span className="font-medium bg-muted px-2 py-0.5 rounded">PRN: {studentLink?.prn || "N/A"}</span>
                        <span>•</span>
                        <span>{studentLink?.busNumber || "No Bus Assigned"}</span>
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
                                {tripData ? (status === 'present' ? 'Bus is en route' : 'Bus is active') : 'Bus is inactive'}
                            </h2>
                        </div>
                        <Badge variant={tripData ? 'success' : 'neutral'}>
                            {tripData ? 'Live Route' : 'Offline'}
                        </Badge>
                    </div>

                    <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-border relative z-0 shadow-lg">
                        {/* Real Data passed here. Fallback to default center if no live location. */}
                        <LiveMap busLocation={liveLocation || tripData?.location} />
                    </div>

                    {/* Friendly Status Message */}
                    <div className={`p-4 border rounded-xl ${status === 'present' ? 'bg-green-500/10 border-green-500/30' : 'bg-secondary/10 border-secondary/30'}`}>
                        <p className="text-foreground font-medium text-center">
                            {status === 'present'
                                ? `"${studentLink?.name} is safely onboard."`
                                : status === 'absent'
                                    ? `"${studentLink?.name} has been marked ABSENT."`
                                    : tripData
                                        ? `"Bus is moving. Waiting for ${studentLink?.name} to board."`
                                        : `"No active trip at the moment."`
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
                        disabled={!tripData}
                    >
                        <Video size={18} />
                        {tripData ? 'Request Live Feed' : 'Feed Unavailable (No Active Trip)'}
                    </Button>

                    <Card>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Trip Timeline</h3>
                        <div className="space-y-6 relative">
                            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-muted"></div>

                            <TimelineItem
                                status={tripData ? "completed" : "upcoming"}
                                time={tripData?.startTime ? new Date(tripData.startTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                title="Trip Started"
                                desc="Bus departed from origin"
                            />
                            <TimelineItem
                                status={status === 'present' ? 'current' : (tripData ? 'upcoming' : 'upcoming')}
                                time="Live"
                                title={status === 'present' ? 'Onboard & Moving' : 'Waiting for Boarding'}
                                desc={tripData?.location ? `Speed: ${tripData.location.speed | 0} km/h` : 'No live data'}
                            />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

/**
 * LiveFeedOverlay — Fullscreen stream viewer with auth token flow.
 * Must be rendered inside a <StreamProvider>.
 */
function LiveFeedOverlay({ busNumber, onClose }) {
    const {
        streamUrl, streamStatus, piStatus, imuData,
        isLive, isPiOnline, isGpsFix, isImuOk, isMoving,
        viewerCount, tokenLoading, tokenError, getStreamToken
    } = useStream();

    // Auto-request token on mount
    useEffect(() => {
        getStreamToken();
    }, [getStreamToken]);

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-fadeIn p-4">
            <div className="w-full max-w-4xl">
                <div className="flex justify-between items-center mb-4 text-white">
                    <h2 className="text-xl font-bold tracking-widest flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        LIVE FEED: {busNumber}
                    </h2>
                    <button
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm transition-colors"
                    >
                        Close Feed
                    </button>
                </div>
                <StreamPlayer
                    streamUrl={streamUrl}
                    isLive={isLive}
                    isPiOnline={isPiOnline}
                    isGpsFix={isGpsFix}
                    isImuOk={isImuOk}
                    isMoving={isMoving}
                    viewerCount={viewerCount}
                    onRequestFeed={getStreamToken}
                    loading={tokenLoading}
                    error={tokenError}
                    cameraName={busNumber}
                    className="w-full"
                />
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
