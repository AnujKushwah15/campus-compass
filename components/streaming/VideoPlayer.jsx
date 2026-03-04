"use client";

import { useState } from 'react';

/**
 * VideoPlayer — Renders a WebRTC stream via iframe.
 * 
 * Now accepts a full streamUrl (with auth token) instead of
 * constructing one from hardcoded VPS IP + path.
 * 
 * Props:
 *   streamUrl  — Full authenticated URL (from StreamContext.getStreamToken)
 *   streamPath — Fallback: used only if streamUrl not provided (legacy compat)
 *   vpsIp      — Fallback: used only if streamUrl not provided (legacy compat)
 *   className  — Optional CSS classes
 */
export default function VideoPlayer({
    streamUrl: propStreamUrl,
    streamPath = 'live',
    domain = 'thanganat25.com',
    className = ""
}) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Use provided URL or fall back to reverse-proxied HTTPS stream
    const streamUrl = propStreamUrl || `https://${domain}/stream/${streamPath}/`;

    const handleLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    return (
        <div className={`relative bg-black rounded-xl overflow-hidden ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-400">Connecting to stream...</span>
                    </div>
                </div>
            )}

            {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-red-400 text-xl">⚠</span>
                        </div>
                        <span className="text-sm text-gray-400">Stream unavailable</span>
                        <button
                            onClick={() => { setIsLoading(true); setHasError(false); }}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                            Retry connection
                        </button>
                    </div>
                </div>
            )}

            <iframe
                src={streamUrl}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
                onLoad={handleLoad}
                onError={handleError}
                style={{ minHeight: '200px' }}
            />
        </div>
    );
}
