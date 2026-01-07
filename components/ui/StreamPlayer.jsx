"use client";

import { useState } from 'react';
import { Play, WifiOff, Maximize2 } from 'lucide-react';

export default function StreamPlayer({ busId, isOnline = false, onClick, onToggleStream, cameraName, className }) {
    const [isPlaying, setIsPlaying] = useState(false);

    // If "playing", we show the mock feed. But for the Admin Dashboard selector logic, 
    // the USER wants "onClick" to open a menu. 
    // So if onClick is provided, we should prioritize that over internal "playing" state for specific views,
    // OR allow the internal player to handle the view but still trigger the menu?
    // Based on request: "click on stream player it should open a pop-up menu"
    // So we'll make the whole container clickable if onClick is passed.

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            setIsPlaying(true);
        }
    };

    if (isPlaying && !onClick) {
        return (
            <div className={`relative w-full h-full bg-black rounded-xl overflow-hidden flex items-center justify-center group ${className}`}>
                {/* Fake Video Feed (Animation) */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZ4eGp4bHl4eHl4eHl4eHl4eHl4eHl4eHl4eHl4eHl4eHl4eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6vXN6KJ8vQzC8j7q/giphy.gif')] bg-cover bg-center grayscale"></div>

                <div className="z-10 text-white text-center">
                    <WifiOff className="w-12 h-12 mx-auto mb-2 text-red-500 animate-pulse" />
                    <p className="font-bold">Live Stream Offline</p>
                    <p className="text-xs text-gray-400">Stream paused to save bandwidth</p>

                    {/* Start Stream Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleStream && onToggleStream(); }}
                        className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95 flex items-center gap-2 mx-auto"
                    >
                        <Play size={14} fill="currentColor" />
                        Start Stick
                    </button>
                </div>

                {/* Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between text-white">
                        <span className="text-xs font-mono bg-red-600 px-2 py-0.5 rounded">LIVE</span>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleStream && onToggleStream(); }}
                                className="hover:text-red-400 text-xs font-bold uppercase tracking-wider bg-black/40 px-2 py-1 rounded border border-white/10"
                            >
                                Stop Stream
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsPlaying(false); }} className="hover:text-red-400 text-sm font-medium">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleClick}
            className={`w-full h-full min-h-[200px] bg-slate-900 rounded-xl border border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-all group relative overflow-hidden shadow-inner ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-cc-purple-900/20 to-cc-red-900/20 opacity-50"></div>

            {/* Camera Name Overlay if Selected */}
            {cameraName && (
                <div className="absolute top-3 left-3 z-20 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-white tracking-wide uppercase">{cameraName}</span>
                </div>
            )}

            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform border border-white/20 z-10 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                {onClick ? (
                    <Maximize2 className="w-7 h-7 text-white ml-0.5" />
                ) : (
                    <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                )}
            </div>

            <p className="mt-4 text-slate-400 font-medium z-10 group-hover:text-white transition-colors flex items-center gap-2">
                {onClick ? 'Select Camera Feed' : 'Connect to Camera'}
            </p>

            {onClick && (
                <p className="z-10 text-[10px] text-slate-500 mt-1 uppercase tracking-widest group-hover:text-cc-purple-400 transition-colors">
                    Click to switch
                </p>
            )}
        </div>
    );
}
