import { useState, useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ChevronDown, ChevronRight, Mail, Phone, Hash, School, GraduationCap } from 'lucide-react';

export default function BusManagement({ buses, students = [], selectedBus, onSelectBus, onUpdateBus, onUnassignStudent, onAssignStudent }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceData, setAttendanceData] = useState({});
    const [isAssigning, setIsAssigning] = useState(false);
    const [showUnassigned, setShowUnassigned] = useState(false);

    // Listen to live attendance updates for the currently selected bus's active trip
    useEffect(() => {
        if (!selectedBus?.id) {
            setAttendanceData({});
            return;
        }

        // Listen to the bus doc to get the activeTripId dynamically
        const busRef = doc(db, 'buses', selectedBus.id);
        let unsubTrip = () => {};

        const unsubBus = onSnapshot(busRef, (busSnap) => {
            unsubTrip(); // clean up previous trip listener
            const activeTripId = busSnap.data()?.activeTripId;
            if (!activeTripId) {
                setAttendanceData({});
                return;
            }
            const tripRef = doc(db, 'trips', activeTripId);
            unsubTrip = onSnapshot(tripRef, (tripSnap) => {
                if (tripSnap.exists()) {
                    setAttendanceData(tripSnap.data().attendance || {});
                } else {
                    setAttendanceData({});
                }
            }, (error) => {
                console.error('BusManagement: Trip snapshot error:', error);
            });
        }, (error) => {
            console.error('BusManagement: Bus snapshot error:', error);
        });

        return () => {
            unsubBus();
            unsubTrip();
        };
    }, [selectedBus?.id]);

    const filteredBuses = buses.filter(bus =>
        bus.number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        const input = e.target.value.toLowerCase();
        const found = buses.find(b => b.number.toLowerCase() === input);
        if (found) {
            onSelectBus(found);
        }
    };

    const handleRemoveStop = (stopIndex) => {
        if (!selectedBus) return;
        const newStops = [...selectedBus.stops];
        newStops.splice(stopIndex, 1);
        onUpdateBus({ ...selectedBus, stops: newStops });
    };

    const handleAddStop = () => {
        if (!selectedBus) return;
        const stopName = prompt("Enter new stop name:");
        if (stopName) {
            onUpdateBus({ ...selectedBus, stops: [...selectedBus.stops, stopName] });
        }
    };

    const handleRemoveStudentFromBus = (studentId) => {
        if (!selectedBus) return;
        onUnassignStudent(studentId);
    };

    const getStatusParams = (studentId) => {
        const studentRecord = attendanceData[studentId];
        if (!studentRecord) return { label: 'Pending', color: 'bg-secondary text-muted-foreground' };

        switch (studentRecord.status) {
            case 'present': return { label: 'Onboard', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
            case 'absent': return { label: 'Absent', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
            default: return { label: 'Pending', color: 'bg-secondary text-muted-foreground' };
        }
    };

    return (
        <div className="flex flex-col h-full bg-card/60 backdrop-blur-xl rounded-2xl border border-cc-purple-500/20 shadow-xl overflow-hidden animate-in fade-in slide-in-from-left-4">
            <div className="p-4 border-b border-cc-purple-500/10 bg-cc-purple-500/5">
                <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                    <span className="w-1 h-6 bg-cc-purple-500 rounded-full"></span>
                    Bus Management
                </h2>
                <input
                    type="text"
                    placeholder="Search Bus Number..."
                    className="w-full px-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-cc-purple-500/50 bg-background/50 placeholder:text-muted-foreground transition-all"
                    value={searchTerm}
                    onChange={handleSearch}
                />
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* List of Buses */}
                <div className="w-full md:w-1/3 shrink-0 h-1/3 md:h-auto border-b md:border-b-0 md:border-r border-cc-purple-500/10 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {filteredBuses.map(bus => (
                        <div
                            key={bus.id}
                            onClick={() => onSelectBus(bus)}
                            className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border ${selectedBus?.id === bus.id
                                ? 'bg-cc-purple-500/10 border-cc-purple-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                                : 'hover:bg-secondary/10 border-transparent hover:border-secondary/20'
                                }`}
                        >
                            <div className={`font-bold ${selectedBus?.id === bus.id ? 'text-cc-purple-600' : 'text-foreground'}`}>
                                {bus.number}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{bus.route}</div>
                        </div>
                    ))}
                    {filteredBuses.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-4">No buses found</p>
                    )}
                </div>

                {/* Bus Details */}
                <div className="w-full md:w-2/3 flex-1 p-5 overflow-y-auto custom-scrollbar bg-background/30">
                    {selectedBus ? (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1">{selectedBus.number}</h3>
                                <Badge variant="neutral" className="mt-1">{selectedBus.route}</Badge>
                            </div>

                            {/* Stops Management */}
                            <div className="bg-card/40 rounded-xl p-4 border border-border/50">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                                        Route Stops
                                        <Badge variant="outline" size="sm">{selectedBus.stops.length}</Badge>
                                    </h4>
                                    <button
                                        onClick={handleAddStop}
                                        className="text-xs px-3 py-1.5 bg-cc-purple-500/10 text-cc-purple-600 border border-cc-purple-500/20 rounded-lg hover:bg-cc-purple-500/20 transition font-medium"
                                    >
                                        + Add Stop
                                    </button>
                                </div>
                                <div className="space-y-2 relative">
                                    {/* Vertical Line */}
                                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border -z-10"></div>

                                    {selectedBus.stops.map((stop, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-background/80 p-2.5 rounded-lg border border-border shadow-sm group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground border border-border">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-sm text-foreground font-medium">{stop}</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveStop(idx)}
                                                className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Member Management */}
                            <div className="bg-card/40 rounded-xl p-4 border border-border/50">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                                        Assigned Students
                                        <Badge variant="outline" size="sm">{selectedBus.currentMembers.length}</Badge>
                                    </h4>
                                    
                                    {isAssigning ? (
                                        <select
                                            autoFocus
                                            className="text-xs px-2 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cc-purple-500 max-w-[200px] text-foreground"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    onAssignStudent(e.target.value, selectedBus.id);
                                                    setIsAssigning(false);
                                                }
                                            }}
                                            onBlur={() => setIsAssigning(false)}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select student...</option>
                                            {students.filter(s => s.busId !== selectedBus.id && s.busId !== selectedBus.number).map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.prn})</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <button
                                            onClick={() => setIsAssigning(true)}
                                            className="text-xs px-3 py-1.5 bg-cc-purple-500/10 text-cc-purple-600 border border-cc-purple-500/20 rounded-lg hover:bg-cc-purple-500/20 transition font-medium flex items-center gap-1"
                                        >
                                            <span>+ Assign</span>
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {selectedBus.currentMembers.length > 0 ? (
                                        selectedBus.currentMembers.map(student => {
                                            const status = getStatusParams(student.id);
                                            return (
                                                <div key={student.id} className="flex justify-between items-center bg-background/80 p-3 rounded-lg border border-border shadow-sm">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <div className="text-sm font-bold text-foreground">{student.name}</div>
                                                            <div className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${status.color}`}>
                                                                {status.label}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded w-fit">PRN: {student.prn}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveStudentFromBus(student.id)}
                                                        className="px-3 py-1.5 bg-red-500/10 text-red-600 border border-red-500/20 rounded-lg text-xs font-medium hover:bg-red-500/20 transition"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
                                            <p className="text-sm">No students assigned to this bus yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Unassigned Students ──────────────────────────── */}
                            <div className="bg-card/40 rounded-xl border border-border/50 overflow-hidden">
                                <button
                                    onClick={() => setShowUnassigned(!showUnassigned)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                >
                                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                                        Unassigned Students
                                        <Badge variant="outline" size="sm" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                            {students.filter(s => !s.busId).length}
                                        </Badge>
                                    </h4>
                                    {showUnassigned ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                                </button>

                                {showUnassigned && (
                                    <div className="px-4 pb-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {students.filter(s => !s.busId).length > 0 ? (
                                            students.filter(s => !s.busId).map(student => (
                                                <div key={student.id} className="bg-background/80 p-3 rounded-lg border border-border shadow-sm space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-foreground truncate">{student.name || student.fullName || 'Unknown'}</div>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                {student.prn && (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-mono">
                                                                        <Hash size={10} /> {student.prn}
                                                                    </span>
                                                                )}
                                                                {student.email && (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate">
                                                                        <Mail size={10} /> {student.email}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                {student.college && (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <School size={10} /> {student.college}
                                                                    </span>
                                                                )}
                                                                {student.semester && (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <GraduationCap size={10} /> Sem {student.semester}
                                                                    </span>
                                                                )}
                                                                {student.mobile && (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <Phone size={10} /> {student.mobile}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => onAssignStudent(student.id, selectedBus.id)}
                                                            className="px-3 py-1.5 bg-cc-purple-500/10 text-cc-purple-600 border border-cc-purple-500/20 rounded-lg text-xs font-bold hover:bg-cc-purple-600 hover:text-white transition shrink-0"
                                                        >
                                                            Assign
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-4 text-muted-foreground text-sm">
                                                All students are assigned to a bus.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 opacity-60">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                <span className="text-3xl">🚌</span>
                            </div>
                            <p className="font-medium">Select a bus from the list to manage details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
