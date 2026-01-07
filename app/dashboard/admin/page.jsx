'use client';

import { useState } from 'react';
import BusManagement from '@/components/admin/BusManagement';
import StudentManagement from '@/components/admin/StudentManagement';
import StreamPlayer from '@/components/ui/StreamPlayer';
import SettingsModal from '@/components/admin/SettingsModal';
import CameraSelector from '@/components/admin/CameraSelector';
import { LogOut, ShieldCheck, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

// Mock Data
const INITIAL_STUDENTS = [
    { id: 101, name: 'Aarav Patel', prn: '2023001', busId: 'Bus 1' },
    { id: 102, name: 'Diya Sharma', prn: '2023002', busId: 'Bus 1' },
    { id: 103, name: 'Ishaan Gupta', prn: '2023003', busId: 'Bus 2' },
    { id: 104, name: 'Ananya Singh', prn: '2023004', busId: null },
    { id: 105, name: 'Vihaan Kumar', prn: '2023005', busId: 'Bus 3' },
];

const INITIAL_BUSES = [
    {
        id: 1,
        number: 'Bus 1',
        route: 'City Center -> Campus',
        stops: ['City Center', 'Mall Road', 'Station', 'Campus'],
        currentMembers: [
            { id: 101, name: 'Aarav Patel', prn: '2023001' },
            { id: 102, name: 'Diya Sharma', prn: '2023002' }
        ]
    },
    {
        id: 2,
        number: 'Bus 2',
        route: 'Suburbs -> Campus',
        stops: ['Green Park', 'Highway', 'Campus'],
        currentMembers: [
            { id: 103, name: 'Ishaan Gupta', prn: '2023003' }
        ]
    },
    {
        id: 3,
        number: 'Bus 3',
        route: 'Old City -> Campus',
        stops: ['Fort', 'Market', 'Campus'],
        currentMembers: [
            { id: 105, name: 'Vihaan Kumar', prn: '2023005' }
        ]
    },
];

const INITIAL_CAMERAS = [
    { id: 1, name: 'Front Cam', busId: 1, busNumber: 'Bus 1', status: 'online' },
    { id: 2, name: 'Rear Cam', busId: 1, busNumber: 'Bus 1', status: 'offline' },
    { id: 3, name: 'Driver View', busId: 2, busNumber: 'Bus 2', status: 'online' },
];

export default function AdminDashboardPage() {
    const [buses, setBuses] = useState(INITIAL_BUSES);
    const [students, setStudents] = useState(INITIAL_STUDENTS);
    const [cameras, setCameras] = useState(INITIAL_CAMERAS);
    const [selectedBus, setSelectedBus] = useState(null);
    const [selectedCamera, setSelectedCamera] = useState(null);

    // Modal States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCameraSelectorOpen, setIsCameraSelectorOpen] = useState(false);

    const router = useRouter();

    const handleUpdateBus = (updatedBus) => {
        setBuses(buses.map(b => b.id === updatedBus.id ? updatedBus : b));
        if (selectedBus && selectedBus.id === updatedBus.id) {
            setSelectedBus(updatedBus);
        }
    };

    const handleSelectBus = (bus) => {
        // Refresh selected bus data from state to ensure it's current
        const currentBus = buses.find(b => b.id === bus.id) || bus;
        setSelectedBus(currentBus);
    };

    const handleAddStudent = (newStudent) => {
        setStudents([...students, newStudent]);
    };

    const handleRemoveStudent = (studentId) => {
        // Remove from global students list
        setStudents(students.filter(s => s.id !== studentId));

        // Remove from any bus they might be on
        const updatedBuses = buses.map(bus => ({
            ...bus,
            currentMembers: bus.currentMembers.filter(m => m.id !== studentId)
        }));
        setBuses(updatedBuses);

        // Update selected bus if affected
        if (selectedBus) {
            const currentBus = updatedBuses.find(b => b.id === selectedBus.id);
            setSelectedBus(currentBus);
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
                        buses={buses}
                        selectedBus={selectedBus}
                        onSelectBus={handleSelectBus}
                        onUpdateBus={handleUpdateBus}
                    />
                </div>

                {/* Column 2: Live Monitor + Student Quick Actions */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-6 h-full">
                    {/* Live Stream Widget - Placed properly prominent */}
                    <div className="h-64 rounded-2xl overflow-hidden shadow-lg border border-cc-purple-500/20 relative group">
                        <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-2 pointer-events-none">
                            <span className={`w-2 h-2 rounded-full ${selectedCamera?.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            {selectedCamera ? (selectedCamera.status === 'online' ? 'LIVE FEED' : 'FEED PAUSED') : 'NO FEED'}
                        </div>

                        <StreamPlayer
                            isOnline={selectedCamera?.status === 'online'}
                            onClick={() => setIsCameraSelectorOpen(true)}
                            onToggleStream={handleToggleStream}
                            cameraName={selectedCamera?.name ? `${selectedCamera.busNumber} - ${selectedCamera.name}` : null}
                            className="bg-slate-900"
                        />
                    </div>

                    {/* Student Management - Fills remaining height */}
                    <div className="flex-1 min-h-0">
                        <StudentManagement
                            students={students}
                            buses={buses}
                            onAddStudent={handleAddStudent}
                            onRemoveStudent={handleRemoveStudent}
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
