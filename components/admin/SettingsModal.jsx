import { useState } from 'react';
import { X, Plus, Trash2, Camera, Bus } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, buses, cameras, onUpdateCameras }) {
    const [newCameraName, setNewCameraName] = useState('');
    const [selectedBusId, setSelectedBusId] = useState('');

    if (!isOpen) return null;

    const handleAddCamera = (e) => {
        e.preventDefault();
        if (!newCameraName || !selectedBusId) {
            alert("Please provide specific camera detail");
            return;
        }

        const bus = buses.find(b => b.id.toString() === selectedBusId.toString());

        const newCamera = {
            id: Date.now(),
            name: newCameraName,
            busId: bus.id,
            busNumber: bus.number,
            status: 'offline' // Default status
        };

        onUpdateCameras([...cameras, newCamera]);
        setNewCameraName('');
        setSelectedBusId('');
    };

    const handleDeleteCamera = (id) => {
        onUpdateCameras(cameras.filter(c => c.id !== id));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Camera className="text-cc-purple-500" />
                            Camera Configuration
                        </h2>
                        <p className="text-muted-foreground text-sm">Manage fleet camera feeds</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Add Camera Form */}
                    <div className="bg-secondary/10 rounded-2xl p-6 border border-secondary/20">
                        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Plus size={18} className="text-cc-purple-500" />
                            Add New Camera
                        </h3>
                        <form onSubmit={handleAddCamera} className="grid md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-5 space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Camera Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Front View, Rear View"
                                    value={newCameraName}
                                    onChange={(e) => setNewCameraName(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-cc-purple-500/50 focus:outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-5 space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assign Bus</label>
                                <div className="relative">
                                    <Bus className="absolute left-3 top-3 text-muted-foreground" size={16} />
                                    <select
                                        value={selectedBusId}
                                        onChange={(e) => setSelectedBusId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-cc-purple-500/50 focus:outline-none appearance-none transition-all"
                                    >
                                        <option value="">Select a Bus</option>
                                        {buses.map(bus => (
                                            <option key={bus.id} value={bus.id}>{bus.number} - {bus.route}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 bg-cc-purple-600 hover:bg-cc-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-cc-purple-500/20 active:scale-95 transition-all text-sm h-[46px]"
                                >
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Camera List */}
                    <div>
                        <h3 className="font-semibold text-foreground mb-4 flex items-center justify-between">
                            <span>Configured Cameras</span>
                            <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">{cameras.length} Active</span>
                        </h3>

                        {cameras.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
                                <Camera className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground font-medium">No cameras configured yet.</p>
                                <p className="text-xs text-muted-foreground/70">Add a camera above to get started.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {cameras.map((cam) => (
                                    <div key={cam.id} className="group flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-cc-purple-500/30 hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                                <Camera size={20} className="text-secondary-foreground" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground">{cam.name}</h4>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Bus size={12} />
                                                    <span>{cam.busNumber}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                                                <div className={`w-2 h-2 rounded-full ${cam.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                <span className="text-xs font-medium uppercase">{cam.status}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteCamera(cam.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remove Camera"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-muted/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-card hover:bg-muted border border-border text-foreground font-medium rounded-xl transition-colors"
                    >
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
}
