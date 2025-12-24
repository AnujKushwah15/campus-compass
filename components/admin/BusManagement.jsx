import { useState } from 'react';
import Badge from '../ui/Badge';

export default function BusManagement({ buses, selectedBus, onSelectBus, onUpdateBus }) {
    const [searchTerm, setSearchTerm] = useState('');

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
        const newMembers = selectedBus.currentMembers.filter(m => m.id !== studentId);
        onUpdateBus({ ...selectedBus, currentMembers: newMembers });
    };

    return (
        <div className="flex flex-col h-full bg-white/50 backdrop-blur-sm rounded-2xl border border-cc-brown-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-cc-brown-100 bg-cc-beige-100/50">
                <h2 className="text-lg font-bold text-cc-brown-800 mb-2">Bus Management</h2>
                <input
                    type="text"
                    placeholder="Enter Bus Number..."
                    className="w-full px-4 py-2 rounded-lg border border-cc-brown-200 focus:outline-none focus:ring-2 focus:ring-cc-pista-500 bg-white"
                    value={searchTerm}
                    onChange={handleSearch}
                />
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* List of Buses */}
                <div className="w-1/3 border-r border-cc-brown-100 overflow-y-auto p-2">
                    {filteredBuses.map(bus => (
                        <div
                            key={bus.id}
                            onClick={() => onSelectBus(bus)}
                            className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${selectedBus?.id === bus.id
                                    ? 'bg-cc-pista-200 border-cc-pista-400'
                                    : 'hover:bg-cc-beige-200 border border-transparent'
                                }`}
                        >
                            <div className="font-bold text-cc-brown-900">{bus.number}</div>
                            <div className="text-xs text-cc-brown-600 truncate">{bus.route}</div>
                        </div>
                    ))}
                </div>

                {/* Bus Details */}
                <div className="w-2/3 p-4 overflow-y-auto bg-white/30">
                    {selectedBus ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-cc-brown-900 mb-1">{selectedBus.number} Details</h3>
                                <p className="text-cc-brown-600 text-sm">Route: {selectedBus.route}</p>
                            </div>

                            {/* Stops Management */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-cc-brown-800">Route Stops</h4>
                                    <button
                                        onClick={handleAddStop}
                                        className="text-xs px-2 py-1 bg-cc-pista-500 text-white rounded hover:bg-cc-pista-600 transition"
                                    >
                                        + Add Stop
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {selectedBus.stops.map((stop, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-cc-brown-100">
                                            <span className="text-sm text-cc-brown-700">{idx + 1}. {stop}</span>
                                            <button
                                                onClick={() => handleRemoveStop(idx)}
                                                className="text-red-500 hover:text-red-700 text-xs font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Member Management */}
                            <div>
                                <h4 className="font-semibold text-cc-brown-800 mb-2">Current Members ({selectedBus.currentMembers.length})</h4>
                                <div className="space-y-2">
                                    {selectedBus.currentMembers.length > 0 ? (
                                        selectedBus.currentMembers.map(student => (
                                            <div key={student.id} className="flex justify-between items-center bg-white p-2 rounded border border-cc-brown-100">
                                                <div>
                                                    <div className="text-sm font-medium text-cc-brown-900">{student.name}</div>
                                                    <div className="text-xs text-cc-brown-500">PRN: {student.prn}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveStudentFromBus(student.id)}
                                                    className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-cc-brown-400 italic">No students assigned.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-cc-brown-400">
                            Select a bus to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
