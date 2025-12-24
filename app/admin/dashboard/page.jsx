'use client';

import { useState } from 'react';
import BusManagement from '../../../components/admin/BusManagement';
import StudentManagement from '../../../components/admin/StudentManagement';

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

export default function AdminDashboardPage() {
    const [buses, setBuses] = useState(INITIAL_BUSES);
    const [students, setStudents] = useState(INITIAL_STUDENTS);
    const [selectedBus, setSelectedBus] = useState(null);

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

    return (
        <main className="min-h-screen bg-cc-beige-100 p-6 pt-24 font-sans text-cc-brown-900">
            <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cc-brown-800 to-cc-brown-600 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                        <p className="text-cc-brown-600">Manage fleet, routes, and student data.</p>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-6 h-full">
                    {/* Left Panel: Bus Management */}
                    <div className="col-span-7 h-full">
                        <BusManagement
                            buses={buses}
                            selectedBus={selectedBus}
                            onSelectBus={handleSelectBus}
                            onUpdateBus={handleUpdateBus}
                        />
                    </div>

                    <div className="col-span-5 h-full">
                        <StudentManagement
                            students={students}
                            buses={buses}
                            onAddStudent={handleAddStudent}
                            onRemoveStudent={handleRemoveStudent}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
