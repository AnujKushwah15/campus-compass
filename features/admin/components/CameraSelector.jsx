import { useRef, useEffect } from 'react';
import { Camera, Video, MonitorPlay } from 'lucide-react';

export default function CameraSelector({ isOpen, onClose, cameras, onSelectCamera, currentDetails }) {
    const modalRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="bg-card w-full max-w-4xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <MonitorPlay className="text-cc-purple-500" />
                            Select Camera Feed
                        </h2>
                        <p className="text-muted-foreground text-sm">Choose a live stream to monitor</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-sm font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4"
                    >
                        Close
                    </button>
                </div>

                {/* Grid */}
                <div className="p-6 overflow-y-auto bg-secondary/5 min-h-[400px]">
                    {cameras.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-70">
                            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                                <Video size={40} className="text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">No Feed Signal</h3>
                                <p className="text-muted-foreground">No cameras are currently configured.</p>
                                <p className="text-sm text-cc-purple-500 mt-2 font-medium">Please add cameras in Admin Settings.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cameras.map((cam) => (
                                <button
                                    key={cam.id}
                                    onClick={() => {
                                        onSelectCamera(cam);
                                        onClose();
                                    }}
                                    className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-200 text-left ${currentDetails?.id === cam.id
                                            ? 'border-cc-purple-500 shadow-[0_0_25px_rgba(139,92,246,0.3)] ring-2 ring-cc-purple-500/20'
                                            : 'border-transparent hover:border-cc-purple-500/50 hover:shadow-lg'
                                        }`}
                                >
                                    {/* Mock Feed Background */}
                                    <div className="absolute inset-0 bg-slate-900 group-hover:scale-105 transition-transform duration-500">
                                        <div className="w-full h-full opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black"></div>

                                        {/* Scanline Effect */}
                                        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(transparent_50%,_rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                                    </div>

                                    {/* Content Overlay */}
                                    <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono text-white border border-white/10">
                                                {cam.busNumber}
                                            </div>
                                            <div className={`w-2 h-2 rounded-full shadow-[0_0_10px] ${cam.status === 'online' ? 'bg-green-500 shadow-green-500 animate-pulse' : 'bg-red-500 shadow-red-500'}`}></div>
                                        </div>

                                        <div>
                                            <h4 className="text-white font-bold drop-shadow-md flex items-center gap-2">
                                                <Camera size={16} />
                                                {cam.name}
                                            </h4>
                                            {currentDetails?.id === cam.id && (
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-cc-purple-400">Active Monitoring</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-cc-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white text-cc-purple-600 px-4 py-2 rounded-full font-bold text-sm shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                                            Switch View
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
