import { useState } from 'react';

export default function StudentManagement({ students, buses, onRemoveStudent, onAddStudent }) {
    const [prnSearch, setPrnSearch] = useState('');
    const [foundStudent, setFoundStudent] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newStudent, setNewStudent] = useState({ name: '', prn: '', busId: '' });

    const handleSearch = () => {
        const student = students.find(s => s.prn === prnSearch);
        setFoundStudent(student || null);
        if (!student && prnSearch) {
            alert('Student not found');
        }
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        if (newStudent.name && newStudent.prn) {
            onAddStudent({ ...newStudent, id: Date.now() });
            onAddStudent({ ...newStudent, id: Date.now() });
            setNewStudent({ name: '', prn: '', busId: '' });
            setShowAddForm(false);
            alert('Student added successfully');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white/50 backdrop-blur-sm rounded-2xl border border-cc-brown-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-cc-brown-800 mb-6">Student Management</h2>

            {/* Search Section */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-cc-brown-700 mb-2">Search by PRN</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={prnSearch}
                        onChange={(e) => setPrnSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter PRN..."
                        className="flex-1 px-4 py-2 rounded-lg border border-cc-brown-200 focus:outline-none focus:ring-2 focus:ring-cc-pista-500 bg-white"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-6 py-2 bg-cc-brown-600 text-white rounded-lg hover:bg-cc-brown-700 transition font-medium"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Found Student Display */}
            {foundStudent && (
                <div className="mb-8 p-4 bg-cc-pista-200/50 rounded-xl border border-cc-pista-300">
                    <h3 className="text-md font-bold text-cc-brown-900 mb-2">Student Found</h3>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-cc-brown-800"><span className="font-semibold">Name:</span> {foundStudent.name}</p>
                            <p className="text-cc-brown-800"><span className="font-semibold">PRN:</span> {foundStudent.prn}</p>
                            <p className="text-cc-brown-600 text-sm mt-1">
                                {foundStudent.busId ? `Assigned to Bus: ${foundStudent.busId}` : 'Not assigned to any bus'}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                onRemoveStudent(foundStudent.id);
                                setFoundStudent(null);
                                setPrnSearch('');
                            }}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                        >
                            Remove Student
                        </button>
                    </div>
                </div>
            )}

            <hr className="border-cc-brown-200 mb-6" />

            {/* Add Student Section */}
            <div>
                {!showAddForm ? (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full py-3 border-2 border-dashed border-cc-brown-300 text-cc-brown-600 rounded-xl hover:bg-cc-brown-100 transition flex items-center justify-center gap-2 font-medium"
                    >
                        <span>+</span> Add New Student
                    </button>
                ) : (
                    <div className="bg-white p-4 rounded-xl border border-cc-brown-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                        <h3 className="font-bold text-cc-brown-800 mb-4">Add New Student</h3>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase font-bold text-cc-brown-500 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudent.name}
                                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded border border-cc-brown-200 focus:outline-none focus:ring-1 focus:ring-cc-pista-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-cc-brown-500 mb-1">PRN</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudent.prn}
                                    onChange={e => setNewStudent({ ...newStudent, prn: e.target.value })}
                                    className="w-full px-3 py-2 rounded border border-cc-brown-200 focus:outline-none focus:ring-1 focus:ring-cc-pista-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-cc-brown-500 mb-1">Assign Bus (Optional)</label>
                                <select
                                    value={newStudent.busId}
                                    onChange={e => setNewStudent({ ...newStudent, busId: e.target.value })}
                                    className="w-full px-3 py-2 rounded border border-cc-brown-200 focus:outline-none focus:ring-1 focus:ring-cc-pista-500 bg-white"
                                >
                                    <option value="">No Bus Assigned</option>
                                    {buses && buses.map(bus => (
                                        <option key={bus.id} value={bus.number}>{bus.number} - {bus.route}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-cc-pista-600 text-white py-2 rounded hover:bg-cc-pista-700 font-medium"
                                >
                                    Add Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 bg-cc-brown-200 text-cc-brown-700 py-2 rounded hover:bg-cc-brown-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
