'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import BusManagement from '@/features/admin/components/BusManagement';
import StreamPlayer from '@/features/streaming/components/StreamPlayer';
import SettingsModal from '@/features/admin/components/SettingsModal';
import CameraSelector from '@/features/admin/components/CameraSelector';
import { LogOut, ShieldCheck, Settings, Search, Bell, Activity, ChevronDown, Bus, MapPin } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db, rtdb } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { StreamProvider, useStream } from '@/features/streaming/context/StreamContext';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/features/tracking/components/LiveMap'), { ssr: false });

// ─── Bus monitor array ────────────────────────────────────────────────────────
// Derives bus-monitor entries from Firestore buses + RTDB locations.
// Each entry: { id, busId, label, streamPath, location }
// streamPath follows MediaMTX convention: "live_bus-1", "live_bus-2", etc.
// ─────────────────────────────────────────────────────────────────────────────


export default function AdminDashboardPage() {
    const [buses, setBuses] = useState([]);
    const [students, setStudents] = useState([]);
    const [cameras, setCameras] = useState([]);
    const [selectedBus, setSelectedBus] = useState(null);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [activeAlerts, setActiveAlerts] = useState([]);

    // ── Multi-bus monitor state ──────────────────────────────────────────────
    // busLocations: { busId: { lat, lng, speed, heading, ... } }
    const [busLocations, setBusLocations] = useState({});
    // selectedMonitorBusId: which bus the stream + map panel is focused on
    const [selectedMonitorBusId, setSelectedMonitorBusId] = useState(null);
    const [isMonitorDropdownOpen, setIsMonitorDropdownOpen] = useState(false);

    // Modal States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCameraSelectorOpen, setIsCameraSelectorOpen] = useState(false);

    const router = useRouter();

    // ── Fetch Buses from Firestore ────────────────────────────────────────────
    useEffect(() => {
        const q = query(collection(db, 'buses'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const busData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                number: d.data().number || d.data().plateNumber || 'Unknown Bus',
                stops: d.data().stops || [],
                currentMembers: []
            }));
            setBuses(busData);
            setCameras(busData.map((bus) => ({
                id: bus.id,
                name: `${bus.number || bus.id} — Camera`,
                busId: bus.id,
                busNumber: bus.number || bus.id,
                status: 'online',
            })));
            // Auto-select first bus in monitor panel if none selected
            if (busData.length > 0) {
                setSelectedMonitorBusId(prev => prev ?? busData[0].id);
            }
        });
        return () => unsubscribe();
    }, []);

    // ── Fetch all bus locations from RTDB (single listener) ──────────────────
    useEffect(() => {
        const busesRef = ref(rtdb, 'buses');
        const unsubscribe = onValue(busesRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            const locations = {};
            Object.entries(data).forEach(([busId, busData]) => {
                if (busData?.location?.lat && busData?.location?.lng) {
                    locations[busId] = busData.location;
                }
            });
            setBusLocations(locations);
        });
        return () => unsubscribe();
    }, []);

    // ── Fetch Students ────────────────────────────────────────────────────────
    useEffect(() => {
        const q = query(collection(db, 'students'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // ── SOS alert listener ────────────────────────────────────────────────────
    useEffect(() => {
        const alertsQ = query(collection(db, 'alerts'), where('status', '==', 'active'));
        const unsub = onSnapshot(alertsQ, (snap) => {
            setActiveAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // ── Derived data ──────────────────────────────────────────────────────────
    const busesWithMembers = buses.map(bus => ({
        ...bus,
        currentMembers: students.filter(s => s.busId === bus.number || s.busId === bus.id)
    }));

    // Build bus monitor array — one entry per bus, enriched with stream path + location
    const busMonitorList = useMemo(() => buses.map(bus => {
        // Stream path follows MediaMTX convention: live_bus-1, live_bus-2, etc.
        // We try bus.streamPath (Firestore field), then synthesize from bus.number/id
        const rawId = bus.number || bus.id;
        const streamPath = bus.streamPath || `live_${rawId.toLowerCase().replace(/\s+/g, '-')}`;
        const location = busLocations[bus.id] || busLocations[rawId] || null;
        return {
            id: bus.id,
            label: bus.number || `Bus ${bus.id}`,
            streamPath,
            location,
            hasLiveLocation: !!location,
        };
    }), [buses, busLocations]);

    const selectedMonitorEntry = useMemo(
        () => busMonitorList.find(b => b.id === selectedMonitorBusId) ?? busMonitorList[0] ?? null,
        [busMonitorList, selectedMonitorBusId]
    );

    // Keep selectedBus in sync when data changes
    useEffect(() => {
        if (selectedBus) {
            const updated = busesWithMembers.find(b => b.id === selectedBus.id);
            if (updated) setSelectedBus(updated);
        }
    }, [buses, students]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleUpdateBus = async (updatedBus) => {
        try {
            const { id, currentMembers, ...busData } = updatedBus;
            await updateDoc(doc(db, 'buses', id), busData);
        } catch (error) {
            console.error('Error updating bus:', error);
        }
    };

    const handleSelectBus = (bus) => {
        const currentBus = busesWithMembers.find(b => b.id === bus.id) || bus;
        setSelectedBus(currentBus);
    };

    const handleUnassignStudent = async (studentId) => {
        try { await updateDoc(doc(db, 'students', studentId), { busId: null }); }
        catch (e) { console.error(e); }
    };

    const handleAssignStudent = async (studentId, busId) => {
        try { await updateDoc(doc(db, 'students', studentId), { busId }); }
        catch (e) { console.error(e); }
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/auth');
    };

    return (
        <div className="font-sans text-foreground min-h-screen bg-background px-4 sm:px-8 lg:px-12 xl:px-16 py-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0 mb-8 pb-6 border-b border-border w-full relative">
                {/* Left */}
                <div className="flex-shrink-0 z-10 w-full md:w-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cc-purple-600 to-cc-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground tracking-tight">
                                Admin Control <span className="text-cc-purple-500">Center</span>
                            </h1>
                            <p className="text-muted-foreground font-medium">System Overview &amp; Fleet Management</p>
                        </div>
                    </div>
                </div>

                {/* Center */}
                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0"></div>

                {/* Right */}
                <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 flex-shrink-0 z-10 w-full md:w-auto">
                    <div className="bg-card px-4 py-2 rounded-lg border border-border flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-semibold">System Online</span>
                    </div>
                    <Link href="/dashboard/admin/devices" className="bg-card hover:bg-muted px-4 py-2 rounded-lg border border-border flex items-center gap-2 transition-colors group">
                        <Activity size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Edge Health</span>
                    </Link>
                    <Link href="/dashboard/admin/data" className="bg-card hover:bg-muted px-4 py-2 rounded-lg border border-border flex items-center gap-2 transition-colors group">
                        <Search size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Query Data</span>
                    </Link>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-all border border-border"
                        title="Configure Cameras"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all font-semibold"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-6 h-auto lg:h-[calc(100vh-10rem)] min-h-[calc(100vh-10rem)]">

                {/* Column 1: Fleet List & Details */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-6 h-full">
                    <BusManagement
                        buses={busesWithMembers}
                        students={students}
                        selectedBus={selectedBus}
                        onSelectBus={handleSelectBus}
                        onUpdateBus={handleUpdateBus}
                        onUnassignStudent={handleUnassignStudent}
                        onAssignStudent={handleAssignStudent}
                    />
                </div>

                {/* Column 2: Live Monitor + Student Quick Actions */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-6 h-full">

                    {/* ── Bus Monitor Panel ─────────────────────────────────── */}
                    <div className="rounded-2xl border border-cc-purple-500/20 overflow-hidden shadow-lg bg-card">

                        {/* Bus Selector Toolbar */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/80">
                            <Bus size={14} className="text-cc-purple-400 shrink-0" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Monitor:</span>

                            {/* Pill tabs — one per bus */}
                            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none">
                                {busMonitorList.length === 0 ? (
                                    <span className="text-xs text-muted-foreground italic">No buses yet</span>
                                ) : (
                                    busMonitorList.map(entry => (
                                        <button
                                            key={entry.id}
                                            onClick={() => setSelectedMonitorBusId(entry.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${selectedMonitorBusId === entry.id
                                                ? 'bg-cc-purple-600 text-white shadow-sm shadow-cc-purple-500/30'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                                }`}
                                        >
                                            {/* Live location indicator dot */}
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.hasLiveLocation ? 'bg-green-400' : 'bg-zinc-500'}`} />
                                            {entry.label}
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Location badge for selected bus */}
                            {selectedMonitorEntry && (
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${selectedMonitorEntry.hasLiveLocation
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-zinc-700/40 text-zinc-500'
                                    }`}>
                                    <MapPin size={9} />
                                    {selectedMonitorEntry.hasLiveLocation ? 'GPS Live' : 'No GPS'}
                                </div>
                            )}
                        </div>

                        {/* Live Stream */}
                        <div className="h-48 relative">
                            {selectedMonitorEntry ? (
                                <StreamProvider busId={selectedMonitorEntry.id} key={selectedMonitorEntry.id}>
                                    <AdminStreamWidget
                                        selectedCamera={selectedCamera}
                                        onCameraSelect={() => setIsCameraSelectorOpen(true)}
                                        busLabel={selectedMonitorEntry.label}
                                    />
                                </StreamProvider>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 text-sm">
                                    No buses configured
                                </div>
                            )}
                        </div>

                        {/* Map for selected bus */}
                        <div className="h-44 relative border-t border-border">
                            <div className="absolute top-2 left-2 z-20 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-white text-[10px] font-bold pointer-events-none flex items-center gap-1">
                                🗺 {selectedMonitorEntry?.label ?? 'Fleet'} — Location
                            </div>
                            <BusMap location={selectedMonitorEntry?.location ?? null} allLocations={busLocations} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                buses={buses}
                cameras={cameras}
                onUpdateCameras={setCameras}
            />
            <CameraSelector
                isOpen={isCameraSelectorOpen}
                onClose={() => setIsCameraSelectorOpen(false)}
                cameras={cameras}
                onSelectCamera={setSelectedCamera}
                currentDetails={selectedCamera}
            />
        </div>
    );
}

// ─── AdminStreamWidget ────────────────────────────────────────────────────────
function AdminStreamWidget({ selectedCamera, onCameraSelect, busLabel }) {
    const { isLive, isPiOnline, isGpsFix, isImuOk, isMoving, viewerCount, streamPath } = useStream();
    const [shouldPlay, setShouldPlay] = useState(false);
    const requestFeed = useCallback(() => setShouldPlay(true), []);
    useEffect(() => { requestFeed(); }, [requestFeed]);

    return (
        <StreamPlayer
            streamPath={shouldPlay ? streamPath : null}
            isLive={isLive}
            isPiOnline={isPiOnline}
            isGpsFix={isGpsFix}
            isImuOk={isImuOk}
            isMoving={isMoving}
            viewerCount={viewerCount}
            onRequestFeed={requestFeed}
            cameraName={selectedCamera?.name ? `${selectedCamera.busNumber} - ${selectedCamera.name}` : busLabel}
            className="bg-slate-900 h-full"
        />
    );
}

// ─── BusMap ───────────────────────────────────────────────────────────────────
// Shows the selected bus location centered. If no location, centers on fleet.
function BusMap({ location, allLocations }) {
    // Gather all available locations for context markers
    const allEntries = Object.entries(allLocations);
    const fallbackCenter = allEntries.length > 0 ? allEntries[0][1] : null;
    const center = location || fallbackCenter;

    return (
        <div className="w-full h-full">
            <LiveMap busLocation={center} />
        </div>
    );
}
