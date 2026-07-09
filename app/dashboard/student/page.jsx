"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { Phone, Clock, MapPin, Bus, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

// Firebase
import { db, rtdb } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, setDoc, collection, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '@/features/auth/components/AuthProvider';
import BusLoader from '@/components/BusLoader';

const LiveMap = dynamic(() => import('@/features/tracking/components/LiveMap'), { ssr: false });

export default function StudentDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isAssigned, setIsAssigned] = useState(false);
    const [dashboardData, setDashboardData] = useState({
        bus: null,
        route: null,
        driver: null,
        busLocation: null,
        studentLocation: null
    });

    useEffect(() => {
        if (authLoading) return;
        let isMounted = true;
        let unsubBus = () => { };
        let unsubLoc = () => { };

        const fetchStudentData = async () => {
            if (!user) {
                if (isMounted) setLoading(false);
                return;
            }
            try {
                // 1. Fetch Student profile to get assigned busId
                const sSnap = await getDoc(doc(db, "users", user.uid));
                const studentData = sSnap.exists() ? sSnap.data() : null;
                const busId = studentData?.busId;

                if (!busId) {
                    if (isMounted) {
                        setIsAssigned(false);
                        setLoading(false);
                    }
                    return;
                }

                if (isMounted) setIsAssigned(true);

                // 2. Listen to Bus Document for Real-time trip status
                unsubBus = onSnapshot(doc(db, "buses", busId), async (bSnap) => {
                    if (!bSnap.exists()) return;
                    const bData = bSnap.data();
                    let routeData = null, driverData = null;

                    // Fetch associated Route and Driver
                    if (bData.routeId) {
                        const rSnap = await getDoc(doc(db, "routes", bData.routeId));
                        routeData = rSnap.exists() ? { id: rSnap.id, ...rSnap.data() } : null;
                    }
                    if (bData.driverId) {
                        const dSnap = await getDoc(doc(db, "users", bData.driverId));
                        driverData = dSnap.exists() ? { id: dSnap.id, ...dSnap.data() } : null;
                    }

                    if (isMounted) {
                        setDashboardData(prev => ({
                            ...prev,
                            bus: { id: busId, ...bData },
                            route: routeData,
                            driver: driverData,
                            studentLocation: studentData?.location || null
                        }));
                    }
                });

                // 3. Listen to Real-time Bus Location from RTDB (authoritative /location node)
                // Written by driver's phone via updateLocation(), and by the VPS Arbitrator when running.
                const locRef = ref(rtdb, `buses/${busId}/location`);
                unsubLoc = onValue(locRef, (locSnap) => {
                    if (isMounted && locSnap.exists()) {
                        setDashboardData(prev => ({ ...prev, busLocation: locSnap.val() }));
                    } else if (isMounted) {
                        setDashboardData(prev => ({ ...prev, busLocation: null }));
                    }
                });

                if (isMounted) setLoading(false);
            } catch (err) {
                console.error("Error fetching student data:", err);
                if (isMounted) setLoading(false);
            }
        };

        fetchStudentData();

        return () => {
            isMounted = false;
            unsubBus();
            unsubLoc();
        };
    }, [user, authLoading]);

    if (authLoading || loading) {
        return <BusLoader fullScreen message="Loading dashboard data..." />;
    }

    if (!isAssigned) {
        return (
            <NoBusAssignedView user={user} />
        );
    }

    const { bus, route, driver, busLocation, studentLocation } = dashboardData;
    const isTripActive = !!bus?.activeTripId;

    let calculatedEta = null;
    let originStopName = "Unknown";
    let destStopName = "Unknown";
    let nextStopName = "Unknown"; // Dynamic calculation of next stop requires more advanced logic, using fallback

    if (route?.stops?.length > 0) {
        originStopName = route.stops[0].name;
        destStopName = route.stops[route.stops.length - 1].name;
        nextStopName = route.stops[Math.min(1, route.stops.length - 1)].name; 

        if (isTripActive && busLocation) {
            const destLat = route.stops[route.stops.length - 1].lat;
            const destLng = route.stops[route.stops.length - 1].lng;
            const dist = getDistance(busLocation.lat, busLocation.lng, destLat, destLng);
            
            // Assume 30 km/h average if speed is 0
            const speed = (busLocation.speed && busLocation.speed > 5) ? busLocation.speed : 30; 
            calculatedEta = Math.max(1, Math.round((dist / speed) * 60));
        }
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Page Header & Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-cc-purple-500">Live Tracking</h1>
                    <p className="text-muted-foreground text-sm">
                        Bus: {bus?.plateNumber || 'Unknown'} • Route: {route?.name || 'Unknown'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Card className="flex items-center gap-2 !py-2 !px-4 bg-card/60 border border-cc-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.2)] opacity-0 animate-pop-in delay-75" padding="none">
                        <div className={`w-2.5 h-2.5 rounded-full ${isTripActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground'} mr-1`}></div>
                        <Clock size={16} className="text-black dark:text-white" />
                        <span className="text-sm font-semibold text-black dark:text-white">
                            Status: {isTripActive ? 'En Route' : 'Waiting'}
                        </span>
                    </Card>
                    <Button onClick={() => window.location.reload()} variant="ghost" size="sm" className="hidden md:flex items-center gap-2 border border-cc-purple-500 hover:shadow-[0_0_15px_rgba(139,92,246,0.5)] transition-all duration-300 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 opacity-0 animate-pop-in delay-150">
                        <span className="w-2 h-2 rounded-full border border-black bg-black/30 dark:border-white dark:bg-white/30 shadow-sm dark:shadow-[0_0_5px_rgba(255,255,255,0.5)]"></span> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Map Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-border relative z-0">
                        <LiveMap 
                            busLocation={busLocation || { lat: 23.0225, lng: 72.5714, speed: 0 }} 
                            stops={route?.stops || []}
                            studentLocation={studentLocation}
                        />
                    </div>

                    {/* Quick Status Bar */}
                    <div className="flex items-center gap-2 p-3 bg-accent/10 border border-cc-purple-500 rounded-lg text-sm text-foreground">
                        <CheckCircleIcon className="w-5 h-5 text-accent" />
                        <span className="font-medium">
                            {isTripActive 
                                ? "Bus is currently running on the route."
                                : "The bus trip has not been started by the driver yet."}
                        </span>
                    </div>
                </div>

                {/* Info Sidebar */}
                <div className="space-y-4">
                    {/* ETA Card */}
                    <Card className="!bg-slate-50 dark:!bg-transparent dark:bg-gradient-to-br dark:from-card dark:to-muted border-cc-purple-500 opacity-0 animate-pop-in delay-100">
                        <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-bold text-cc-purple-500 uppercase tracking-wider">Estimated Arrival</span>
                            <div className="p-2 bg-cc-purple-500/10 text-cc-purple-500 rounded-full border border-cc-purple-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                                <Clock size={18} />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-foreground mb-1">
                            {isTripActive && calculatedEta !== null ? (
                                <><AnimatedCounter end={calculatedEta} duration={2000} /> <span className="text-lg font-medium text-muted-foreground">mins</span></>
                            ) : (
                                <span className="text-2xl text-muted-foreground tracking-widest">--</span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                            to {destStopName}
                        </p>

                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                                    <div className="w-0.5 h-6 bg-foreground/10"></div>
                                </div>
                                <div>
                                    <p className="text-xs text-cc-purple-400">Origin Stop</p>
                                    <p className="text-sm font-semibold text-foreground line-clamp-1">{originStopName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 rounded-full border-2 border-accent bg-background"></div>
                                </div>
                                <div>
                                    <p className="text-xs text-cc-purple-400">Destination</p>
                                    <p className="text-sm font-semibold text-foreground line-clamp-1">{destStopName}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Driver Info Card */}
                    <Card className="!bg-slate-50 dark:!bg-card border-cc-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.15)] opacity-0 animate-pop-in delay-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl ring-2 ring-cc-purple-500 ring-offset-2 ring-offset-background shadow-md">👨‍✈️</div>
                            <div>
                                <p className="font-bold text-cc-purple-500 line-clamp-1">{driver?.fullName || 'Driver Assigned'}</p>
                                <Badge variant="neutral">Driver</Badge>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-border">
                            <div className="flex items-center gap-2 text-sm text-foreground">
                                <div className="p-1.5 bg-cc-purple-500/10 text-cc-purple-500 rounded-full border border-cc-purple-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                                    <Phone size={14} />
                                </div>
                                {driver?.mobile || 'No Contact Info'}
                            </div>
                            <button className="p-2 bg-accent text-accent-foreground rounded-full hover:bg-accent/80 transition-colors shadow-sm cursor-pointer">
                                <Phone size={16} />
                            </button>
                        </div>
                    </Card>

                    {/* Route Summary */}
                    <Card padding="sm" className="!bg-slate-50 dark:!bg-secondary/5 border-cc-purple-500 opacity-0 animate-pop-in delay-300">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-cc-purple-500/10 text-cc-purple-500 rounded-full border border-cc-purple-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                                <MapPin size={14} />
                            </div>
                            <span className="text-xs font-bold text-cc-purple-500 uppercase">Route Details</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                            <span className="line-clamp-1">{originStopName}</span>
                            <ArrowRightIcon className="w-4 h-4 shrink-0 text-muted-foreground/50" />
                            <span className="line-clamp-1 text-right">{destStopName}</span>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Helpers
function CheckCircleIcon({ className }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
}

function ArrowRightIcon({ className }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
}

// Haversine formula calculation (distance in km)
function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ─── NoBusAssignedView ────────────────────────────────────────────────────────
// Shows when a student has no busId. Lets them submit a bus assignment request.
function NoBusAssignedView({ user }) {
    const [buses, setBuses] = useState([]);
    const [preferredBusId, setPreferredBusId] = useState('');
    const [message, setMessage] = useState('');
    const [existingRequest, setExistingRequest] = useState(null); // null = loading, false = none
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Fetch available buses
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'buses'), (snap) => {
            setBuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // Check for existing pending request (doc ID = student UID)
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, 'busRequests', user.uid), (snap) => {
            if (snap.exists()) {
                setExistingRequest({ id: snap.id, ...snap.data() });
            } else {
                setExistingRequest(false);
            }
        });
        return () => unsub();
    }, [user?.uid]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user?.uid) return;
        setSubmitting(true);
        try {
            // Fetch student profile for details to include in request
            const studentSnap = await getDoc(doc(db, 'users', user.uid));
            const studentData = studentSnap.exists() ? studentSnap.data() : {};

            await setDoc(doc(db, 'busRequests', user.uid), {
                studentId: user.uid,
                studentName: studentData.name || studentData.fullName || user.displayName || 'Unknown',
                studentPrn: studentData.prn || '',
                studentEmail: user.email || studentData.email || '',
                studentCollege: studentData.college || '',
                studentSemester: studentData.semester || '',
                studentMobile: studentData.mobile || '',
                preferredBusId: preferredBusId || null,
                message: message.trim() || null,
                status: 'pending',
                createdAt: serverTimestamp(),
                resolvedAt: null,
                resolvedBy: null,
            });
            setSubmitted(true);
        } catch (err) {
            console.error('Request submit error:', err);
            alert('Failed to submit request. Please try again.');
        }
        setSubmitting(false);
    };

    // Loading state
    if (existingRequest === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Loader2 className="w-8 h-8 animate-spin text-cc-purple-500" />
            </div>
        );
    }

    // Existing pending request
    if (existingRequest && existingRequest.status === 'pending') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-fadeIn">
                <div className="w-20 h-20 bg-cc-purple-500/10 rounded-full flex items-center justify-center mb-2 shadow-inner border border-cc-purple-500/20">
                    <Clock className="w-10 h-10 text-cc-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Request Pending</h2>
                <p className="text-muted-foreground max-w-md">
                    Your bus assignment request has been submitted and is waiting for admin approval.
                    You'll be assigned to a bus soon.
                </p>
                {existingRequest.preferredBusId && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-cc-purple-500/10 rounded-lg border border-cc-purple-500/20 text-sm">
                        <Bus size={16} className="text-cc-purple-500" />
                        <span className="text-muted-foreground">Preferred:</span>
                        <span className="font-semibold text-foreground">
                            {buses.find(b => b.id === existingRequest.preferredBusId)?.number || existingRequest.preferredBusId}
                        </span>
                    </div>
                )}
                <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
                    Refresh Status
                </Button>
            </div>
        );
    }

    // Rejected request — let them re-submit
    const wasRejected = existingRequest && existingRequest.status === 'rejected';

    // Success state after submission
    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-fadeIn">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-2 shadow-inner border border-green-500/20">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Request Submitted!</h2>
                <p className="text-muted-foreground max-w-md">
                    Your bus assignment request has been sent to the administration.
                    You'll receive access once an admin approves it.
                </p>
                <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
                    Refresh Status
                </Button>
            </div>
        );
    }

    // Request form
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fadeIn">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center text-4xl mb-2 shadow-sm border border-border">
                🚌
            </div>
            <h2 className="text-2xl font-bold text-foreground">No Bus Assigned</h2>
            <p className="text-muted-foreground max-w-md">
                You haven't been assigned to a bus yet. Submit a request to the administration and they'll assign you to a route.
            </p>

            {wasRejected && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20 text-sm text-red-600">
                    <XCircle size={16} />
                    Your previous request was not approved. You can submit a new one.
                </div>
            )}

            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 text-left">
                <div>
                    <label className="block text-xs uppercase font-bold text-muted-foreground mb-1.5">Preferred Bus (Optional)</label>
                    <select
                        value={preferredBusId}
                        onChange={(e) => setPreferredBusId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-cc-purple-500/50 bg-background text-foreground"
                    >
                        <option value="">No preference</option>
                        {buses.map(bus => (
                            <option key={bus.id} value={bus.id}>
                                {bus.number || bus.plateNumber} — {bus.route || 'Route not set'}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-muted-foreground mb-1.5">Message to Admin (Optional)</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="e.g. I live near Stop 3 on Route A..."
                        rows={3}
                        maxLength={200}
                        className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-cc-purple-500/50 bg-background text-foreground text-sm resize-none"
                    />
                </div>
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-cc-purple-600 text-white rounded-xl hover:bg-cc-purple-700 transition font-bold shadow-md shadow-cc-purple-500/20 active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                        <><Send size={16} /> Request Bus Assignment</>
                    )}
                </button>
            </form>
        </div>
    );
}
