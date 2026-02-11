"use client";

import { useState, useEffect } from 'react';
import VideoPlayer from '@/components/streaming/VideoPlayer';

/**
 * StreamPlayer — UI wrapper for video stream with status indicators.
 * 
 * Updated to consume stream context values (passed as props)
 * and display Pi/camera health, viewer count, and IMU status.
 * 
 * Props:
 *   streamUrl    — Authenticated stream URL (from StreamContext)
 *   isLive       — Whether stream is currently publishing
 *   isPiOnline   — Pi heartbeat status
 *   isGpsFix     — GPS has a valid fix
 *   isImuOk      — IMU is reporting data
 *   isMoving     — IMU stationary detection
 *   viewerCount  — Number of active viewers
 *   onRequestFeed — Callback to request stream token
 *   loading      — Token request in progress
 *   error        — Token error message
 *   className    — Optional CSS classes
 */
export default function StreamPlayer({
    streamUrl,
    isLive = false,
    isPiOnline = false,
    isGpsFix = false,
    isImuOk = false,
    isMoving = false,
    viewerCount = 0,
    onRequestFeed,
    loading = false,
    error = null,
    busId,
    cameraName,
    className = '',
}) {
    const [isPlaying, setIsPlaying] = useState(false);

    // Auto-play when streamUrl becomes available
    useEffect(() => {
        if (streamUrl) setIsPlaying(true);
    }, [streamUrl]);

    return (
        <div className={`relative rounded-2xl overflow-hidden bg-gray-900 ${className}`}>

            {/* ─── Status Bar ──────────────────────────────────────────────── */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-2">
                    {/* Live Badge */}
                    {isLive && isPlaying ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            Live
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 bg-gray-700/80 rounded-full text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            Offline
                        </span>
                    )}

                    {/* Camera name */}
                    {cameraName && (
                        <span className="text-[11px] text-gray-300 font-medium">
                            {cameraName}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Viewer Count */}
                    {viewerCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            👁 {viewerCount}
                        </span>
                    )}
                </div>
            </div>

            {/* ─── Device Health Indicators ─────────────────────────────── */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-3 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
                {/* Pi Status */}
                <span className={`flex items-center gap-1 text-[10px] font-medium ${isPiOnline ? 'text-green-400' : 'text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isPiOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                    Pi {isPiOnline ? 'Online' : 'Offline'}
                </span>

                {/* GPS Status */}
                <span className={`flex items-center gap-1 text-[10px] font-medium ${isGpsFix ? 'text-green-400' : 'text-yellow-400'}`}>
                    🛰 {isGpsFix ? 'Fix' : 'No Fix'}
                </span>

                {/* IMU Status */}
                {isImuOk && (
                    <span className={`flex items-center gap-1 text-[10px] font-medium ${isMoving ? 'text-blue-400' : 'text-gray-400'}`}>
                        📐 {isMoving ? 'Moving' : 'Stationary'}
                    </span>
                )}
            </div>

            {/* ─── Video or Placeholder ────────────────────────────────── */}
            {isPlaying && streamUrl ? (
                <VideoPlayer streamUrl={streamUrl} className="w-full h-full aspect-video" />
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 bg-gray-900 aspect-video">
                    {/* Offline placeholder */}
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                        <span className="text-3xl">📹</span>
                    </div>

                    {error ? (
                        <div className="text-center">
                            <p className="text-sm text-red-400 font-medium">{error}</p>
                            <button
                                onClick={onRequestFeed}
                                disabled={loading}
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                                Try again
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm text-gray-400 mb-3">
                                {isLive ? 'Stream available' : 'No active stream'}
                            </p>
                            {isLive && onRequestFeed && (
                                <button
                                    onClick={onRequestFeed}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 
                                               text-white text-sm font-medium rounded-lg transition-colors
                                               flex items-center gap-2 mx-auto"
                                >
                                    {loading ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>▶ Request Live Feed</>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
