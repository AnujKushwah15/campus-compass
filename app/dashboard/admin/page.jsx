'use client';

import { useState, useEffect } from 'react';
import BusManagement from '@/components/admin/BusManagement';
import StudentManagement from '@/components/admin/StudentManagement';
import StreamPlayer from '@/components/ui/StreamPlayer';
import SettingsModal from '@/components/admin/SettingsModal';
import CameraSelector from '@/components/admin/CameraSelector';
import { LogOut, ShieldCheck, Settings, Search } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db, rtdb } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { StreamProvider, useStream } from '@/context/StreamContext';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/ui/LiveMap'), { ssr: false });

const INITIAL_CAMERAS = [
    { id: 1, name: 'Front Cam', busId: 1, busNumber: 'Bus 1', status: 'online' },
    { id: 2, name: 'Rear Cam', busId: 1, busNumber: 'Bus 1', status: 'offline' },
    { id: 3, name: 'Driver View', busId: 2, busNumber: 'Bus 2', status: 'online' },
];

export default function AdminDashboardPage() {
    const [buses, setBuses] = useState([]);
    const [students, setStudents] = useState([]);
    const [cameras, setCameras] = useState(INITIAL_CAMERAS);
    const [selectedBus, setSelectedBus] = useState(null);
    const [selectedCamera, setSelectedCamera] = useState(null);

    // Modal States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCameraSelectorOpen, setIsCameraSelectorOpen] = useState(false);

    const router = useRouter();

    // Fetch Buses
    useEffect(() => {
        const q = query(collection(db, 'buses'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const busData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                number: doc.data().number || doc.data().plateNumber || "Unknown Bus",
                stops: doc.data().stops || [], // Ensure stops exist
                currentMembers: [] // Will be populated in the render or derived state
            }));
            setBuses(busData);
        });
        return () => unsubscribe();
    }, []);

    // Fetch Students
    useEffect(() => {
        const q = query(collection(db, 'students'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const studentData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStudents(studentData);
        });
        return () => unsubscribe();
    }, []);

    // Derive Buses with Members
    const busesWithMembers = buses.map(bus => ({
        ...bus,
        currentMembers: students.filter(s => s.busId === bus.number || s.busId === bus.id) // Handle both ID and Number linking for robustness
    }));

    // Update selected bus when data changes
    useEffect(() => {
        if (selectedBus) {
            const updatedBus = busesWithMembers.find(b => b.id === selectedBus.id);
            if (updatedBus) setSelectedBus(updatedBus);
        }
    }, [buses, students]); // Re-run when either changes

    const handleUpdateBus = async (updatedBus) => {
        // Optimistic update not needed as we rely on snapshot, but we can do it for responsiveness if needed.
        // For now, write to DB.
        try {
            // Extract only the fields that should be in the 'buses' collection
            // 'currentMembers' is derived, so we don't write it back to 'buses'
            const { id, currentMembers, ...busData } = updatedBus;
            await updateDoc(doc(db, 'buses', id), busData);
        } catch (error) {
            console.error("Error updating bus:", error);
            alert("Failed to update bus");
        }
    };

    const handleSelectBus = (bus) => {
        // When selecting, use the one from the derived list to get members
        const currentBus = busesWithMembers.find(b => b.id === bus.id) || bus;
        setSelectedBus(currentBus);
    };

    const handleAddStudent = async (newStudent) => {
        try {
            await addDoc(collection(db, 'students'), newStudent);
        } catch (error) {
            console.error("Error adding student:", error);
            alert("Failed to add student");
        }
    };

    const handleRemoveStudent = async (studentId) => {
        try {
            await deleteDoc(doc(db, 'students', studentId));
        } catch (error) {
            console.error("Error removing student:", error);
            alert("Failed to remove student");
        }
    };

    const handleAssignStudent = async (studentId, busId) => {
        try {
            await updateDoc(doc(db, 'students', studentId), { busId: busId });
        } catch (error) {
            console.error("Error assigning student:", error);
            alert("Failed to assign student");
        }
    };

    const handleUnassignStudent = async (studentId) => {
        try {
            await updateDoc(doc(db, 'students', studentId), { busId: null });
        } catch (error) {
            console.error("Error unassigning student:", error);
            alert("Failed to unassign student");
        }
    };

    const handleToggleStream = () => {
        if (!selectedCamera) return;

        const newStatus = selectedCamera.status === 'online' ? 'offline' : 'online';

        // Update local state
        const updatedCameras = cameras.map(cam =>
            cam.id === selectedCamera.id ? { ...cam, status: newStatus } : cam
        );
        setCameras(updatedCameras);

        // Update currently selected camera object
        setSelectedCamera({ ...selectedCamera, status: newStatus });
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/auth');
    };

    return (
        <div className="font-sans text-foreground min-h-screen bg-background p-6">
            {/* Custom Admin Header */}
            <header className="flex items-center justify-between mb-8 pb-6 border-b border-border">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cc-purple-600 to-cc-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">
                            Admin Control <span className="text-cc-purple-500">Center</span>
                        </h1>
                        <p className="text-muted-foreground font-medium">System Overview & Fleet Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-card px-4 py-2 rounded-lg border border-border flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-semibold">System Online</span>
                    </div>

                    <Link
                        href="/dashboard/admin/data"
                        className="bg-card hover:bg-muted px-4 py-2 rounded-lg border border-border flex items-center gap-2 transition-colors group"
                    >
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
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-10rem)]">

                {/* Column 1: Fleet List & Details (Wider) */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-6 h-full">
                    <BusManagement
                        buses={busesWithMembers}
                        selectedBus={selectedBus}
                        onSelectBus={handleSelectBus}
                        onUpdateBus={handleUpdateBus}
                        onUnassignStudent={handleUnassignStudent}
                    />
                </div>

                {/* Column 2: Live Monitor + Student Quick Actions */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-6 h-full">
                    {/* Live Stream Widget */}
                    <div className="h-52 rounded-2xl overflow-hidden shadow-lg border border-cc-purple-500/20 relative group">
                        <StreamProvider busId={selectedBus?.id || 'bus-1'}>
                            <AdminStreamWidget
                                selectedCamera={selectedCamera}
                                onCameraSelect={() => setIsCameraSelectorOpen(true)}
                            />
                        </StreamProvider>
                    </div>

                    {/* Fleet Map */}
                    <div className="h-52 rounded-2xl overflow-hidden shadow-lg border border-border relative">
                        <div className="absolute top-3 left-3 z-20 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold pointer-events-none">
                            🗺 Fleet Overview
                        </div>
                        <FleetMap buses={buses} />
                    </div>

                    {/* Student Management - Fills remaining height */}
                    <div className="flex-1 min-h-0">
                        <StudentManagement
                            students={students}
                            buses={busesWithMembers}
                            selectedBus={selectedBus} // Pass selected bus context
                            onAddStudent={handleAddStudent}
                            onRemoveStudent={handleRemoveStudent}
                            onAssignStudent={handleAssignStudent} // Pass assignment handler
                        />
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

/**
 * AdminStreamWidget — Consumes StreamContext inside StreamProvider.
 */
function AdminStreamWidget({ selectedCamera, onCameraSelect }) {
    const {
        streamUrl, isLive, isPiOnline, isGpsFix, isImuOk, isMoving,
        viewerCount, tokenLoading, tokenError, getStreamToken
    } = useStream();

    return (
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
            cameraName={selectedCamera?.name ? `${selectedCamera.busNumber} - ${selectedCamera.name}` : 'Default Bus'}
            className="bg-slate-900 h-full"
        />
    );
}

/**
 * FleetMap — Subscribes to RTDB for all bus locations, renders on LiveMap.
 */
function FleetMap({ buses }) {
    const [busLocations, setBusLocations] = useState({});

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

    // Find the first active bus location to center the map
    const locationEntries = Object.entries(busLocations);
    const firstLocation = locationEntries.length > 0 ? locationEntries[0][1] : null;

    return (
        <div className="w-full h-full">
            <LiveMap busLocation={firstLocation} />
        </div>
    );
}
