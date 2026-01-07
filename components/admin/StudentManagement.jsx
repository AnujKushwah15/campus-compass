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
        <div className="flex flex-col h-full bg-card/60 backdrop-blur-xl rounded-2xl border border-cc-purple-500/20 shadow-xl p-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-accent rounded-full"></span>
                Student Management
            </h2>

            {/* Search Section */}
            <div className="mb-8 bg-background/40 p-4 rounded-xl border border-border">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Search by PRN</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={prnSearch}
                        onChange={(e) => setPrnSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="e.g. 2023001"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-cc-purple-500/50 bg-background transition-all"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-6 py-2.5 bg-cc-purple-600 text-white rounded-xl hover:bg-cc-purple-700 transition font-medium shadow-md shadow-cc-purple-500/20 active:scale-95 duration-200"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Found Student Display */}
            {foundStudent && (
                <div className="mb-8 p-5 bg-secondary/10 rounded-xl border border-secondary/20 shadow-inner animate-in zoom-in-95 duration-200">
                    <h3 className="text-md font-bold text-foreground mb-3 flex items-center gap-2">
                        <span className="text-xl">🎓</span> Student Found
                    </h3>
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-foreground text-lg font-semibold">{foundStudent.name}</p>
                            <p className="text-muted-foreground font-mono text-sm bg-background/50 px-2 py-0.5 rounded w-fit">{foundStudent.prn}</p>
                            <div className="pt-2">
                                {foundStudent.busId ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600 text-xs font-bold border border-green-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        Assigned to {foundStudent.busId}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-600 text-xs font-bold border border-yellow-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                        Not Assigned
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                onRemoveStudent(foundStudent.id);
                                setFoundStudent(null);
                                setPrnSearch('');
                            }}
                            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 text-sm rounded-lg hover:bg-red-500 hover:text-white transition font-medium"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}

            <div className="border-t border-border mb-6"></div>

            {/* Add Student Section */}
            <div className="flex-1 flex flex-col justify-end">
                {!showAddForm ? (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full py-4 border-2 border-dashed border-cc-purple-500/30 text-cc-purple-600 rounded-xl hover:bg-cc-purple-500/5 transition flex items-center justify-center gap-2 font-bold hover:border-cc-purple-500/50 group"
                    >
                        <span className="w-6 h-6 rounded-full bg-cc-purple-100 flex items-center justify-center group-hover:bg-cc-purple-200 transition">+</span>
                        Add New Student
                    </button>
                ) : (
                    <div className="bg-card p-5 rounded-xl border border-border shadow-lg animate-in slide-in-from-bottom-4 duration-300">
                        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <span className="text-cc-purple-500">+</span> Add New Student
                        </h3>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase font-bold text-muted-foreground mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudent.name}
                                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-cc-purple-500/50 bg-background"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-muted-foreground mb-1.5">PRN</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudent.prn}
                                    onChange={e => setNewStudent({ ...newStudent, prn: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-cc-purple-500/50 bg-background"
                                    placeholder="20240001"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-muted-foreground mb-1.5">Assign Bus (Optional)</label>
                                <select
                                    value={newStudent.busId}
                                    onChange={e => setNewStudent({ ...newStudent, busId: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-cc-purple-500/50 bg-background"
                                >
                                    <option value="">No Bus Assigned</option>
                                    {buses && buses.map(bus => (
                                        <option key={bus.id} value={bus.number}>{bus.number} - {bus.route}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 bg-muted text-muted-foreground py-2.5 rounded-lg hover:bg-muted/80 font-medium transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-cc-purple-600 text-white py-2.5 rounded-lg hover:bg-cc-purple-700 font-bold shadow-md shadow-cc-purple-500/20 transition active:scale-95"
                                >
                                    Add Student
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
