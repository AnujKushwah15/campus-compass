"use client";

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { Check, X } from 'lucide-react';

const INITIAL_STUDENTS = [
    { id: 1, name: "Aarav Patel", prn: "2023001", status: "present", stop: "Main Road" },
    { id: 2, name: "Riya Sharma", prn: "2023042", status: "pending", stop: "City Center" },
    { id: 3, name: "Vihaan Gupta", prn: "2023015", status: "absent", stop: "North Stop" },
    { id: 4, name: "Ananya Singh", prn: "2023089", status: "pending", stop: "City Center" },
    { id: 5, name: "Ishaan Kumar", prn: "2023056", status: "pending", stop: "North Stop" },
];

export default function StudentList() {
    const [students, setStudents] = useState(INITIAL_STUDENTS);

    const toggleStatus = (id, newStatus) => {
        setStudents(prev => prev.map(s =>
            s.id === id ? { ...s, status: newStatus } : s
        ));
    };

    return (
        <Card className="h-full border-cc-red-100" padding="none">
            <div className="p-4 border-b border-cc-red-100 bg-cc-red-100/30">
                <h3 className="font-bold text-cc-red-900">Student Manifest</h3>
                <p className="text-xs text-cc-red-600">Route #42 • 5 Students</p>
            </div>
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {students.map((student) => (
                    <div key={student.id} className="p-4 flex items-center justify-between hover:bg-cc-red-50/50 transition-colors">
                        <div>
                            <p className="font-semibold text-cc-brown-800">{student.name}</p>
                            <p className="text-xs text-cc-brown-500">PRN: {student.prn} • {student.stop}</p>
                        </div>

                        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                            <button
                                onClick={() => toggleStatus(student.id, 'present')}
                                className={`p-1.5 rounded-md transition-all ${student.status === 'present'
                                        ? 'bg-green-500 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-green-600'
                                    }`}
                                title="Present"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={() => toggleStatus(student.id, 'absent')}
                                className={`p-1.5 rounded-md transition-all ${student.status === 'absent'
                                        ? 'bg-red-500 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-red-600'
                                    }`}
                                title="Absent"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
