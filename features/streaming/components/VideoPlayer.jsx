"use client";

import { useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';

const VPS_DOMAIN = process.env.NEXT_PUBLIC_VPS_DOMAIN || 'thanganat25.com';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || `https://${VPS_DOMAIN}`;
const TOKEN_REFRESH_INTERVAL_MS = 290_000; // Refresh 10 sec before the 300s (5min) JWT expiry

/**
 * VideoPlayer — Renders a WebRTC stream via WHEP protocol.
 *
 * Auth flow:
 *   1. Firebase ID token is sent to GET /api/stream-token (cross-origin, CORS OK)
 *   2. Backend returns a signed, short-lived JWT (60s)
 *   3. Browser POSTs SDP offer to /api/whep?stream=...&token=... (same-origin, no CORS)
 *   4. Next.js /api/whep route proxies server-side to VPS MediaMTX (/stream/.../whep)
 *   5. MediaMTX calls /stream-auth on backend to verify JWT
 *   6. SDP answer flows back; WebRTC ICE negotiation completes over UDP
 *   7. Token is refreshed every 50s to prevent mid-stream expiry
 *
 * Props:
 *   streamPath  — MediaMTX path name (e.g. "live_bus-1")
 *   className   — Optional CSS classes
 */
export default function VideoPlayer({ streamPath, className = "" }) {
    const videoRef = useRef(null);
    const pcRef = useRef(null);              // RTCPeerConnection
    const tokenRefreshRef = useRef(null);   // setInterval handle for token refresh
    const [status, setStatus] = useState('idle'); // idle | connecting | live | error | offline | unauthorized
    const [retryCount, setRetryCount] = useState(0);
    const triggerRetry = () => setRetryCount(c => c + 1);

    // ─── Fetch a short-lived signed JWT from the backend ────────────────────────
    const getStreamToken = async (stream) => {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');

        const idToken = await user.getIdToken();
        const resp = await fetch(
            `/api/stream-token?stream=${encodeURIComponent(stream)}`,
            { headers: { Authorization: `Bearer ${idToken}` } }
        );

        if (resp.status === 401) throw new Error('Unauthorized');
        if (resp.status === 403) throw new Error('Forbidden');
        if (!resp.ok) throw new Error(`Token fetch failed: ${resp.status}`);

        const data = await resp.json();
        if (!data.token) throw new Error('Backend returned no token');
        // Return the raw JWT so the Next.js /api/whep proxy can use it
        return data.token;
    };

    useEffect(() => {
        let isMounted = true;

        const doConnect = async () => {
            const video = videoRef.current;
            if (!video || !streamPath) return;

            // Guard: don't reconnect if we're already connecting/live for the same path
            if (pcRef.current && pcRef.current.currentStreamPath === streamPath) {
                console.log(`[VideoPlayer] Already handling streamPath ${streamPath}, skipping redundant connect.`);
                return;
            }

            // Clean up any existing connection and refresh timer
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            if (tokenRefreshRef.current) {
                clearInterval(tokenRefreshRef.current);
                tokenRefreshRef.current = null;
            }

            if (isMounted) setStatus('connecting');

            try {
                // 1. Fetch a short-lived JWT from the backend
                let streamToken;
                try {
                    streamToken = await getStreamToken(streamPath);
                } catch (tokenErr) {
                    if (tokenErr.message === 'Unauthorized' || tokenErr.message === 'Forbidden') {
                        if (isMounted) setStatus('unauthorized');
                    } else {
                        if (isMounted) setStatus('error');
                    }
                    return;
                }

                // 2. Build the same-origin WHEP proxy URL (avoids browser CORS on cross-origin MediaMTX)
                //    /api/whep proxies server-side to thanganat25.com/stream/.../whep
                const whepProxyUrl = `/api/whep?stream=${encodeURIComponent(streamPath)}&token=${encodeURIComponent(streamToken)}`;
                console.log(`[VideoPlayer] Connecting via Next.js WHEP proxy for stream: ${streamPath}`);

                // 2. Create peer connection
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                pc.currentStreamPath = streamPath; // Attach path for guard check
                pcRef.current = pc;

                // 3. Add receiver transceivers
                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                // 4. Attach stream to video element
                const mediaStream = new MediaStream();
                video.srcObject = mediaStream;

                pc.ontrack = (event) => {
                    mediaStream.addTrack(event.track);
                    if (event.track.kind === 'video' && isMounted) {
                        setStatus('live');
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (!isMounted) return;
                    const state = pc.connectionState;
                    console.log(`[VideoPlayer] WebRTC state: ${state}`);
                    if (state === 'failed' || state === 'disconnected') {
                        setStatus('error');
                    } else if (state === 'closed') {
                        setStatus('idle');
                    }
                };

                // 5. Create SDP offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                if (!isMounted) return;

                // 6. POST SDP offer through the same-origin Next.js WHEP proxy
                const response = await fetch(whepProxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body: offer.sdp,
                });

                if (!isMounted) return;

                if (response.status === 401 || response.status === 403) {
                    setStatus('unauthorized');
                    return;
                }
                if (!response.ok) {
                    if (response.status === 404) {
                        setStatus('offline');
                        return;
                    }
                    throw new Error(`WHEP error: ${response.status}`);
                }

                // 7. Set remote SDP answer
                const answerSdp = await response.text();

                if (!isMounted || pc.signalingState === 'closed') {
                    console.log('[VideoPlayer] Aborting: unmounted or PC closed before setting answer.');
                    return;
                }

                await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

                // 8. Schedule token refresh every 50s (before the 60s JWT expiry).
                //    Note: we only refresh the token — the WebRTC connection stays alive.
                //    The next WHEP sub-request (ICE restart, etc.) will use the fresh token.
                tokenRefreshRef.current = setInterval(async () => {
                    if (!isMounted) return;
                    try {
                        await getStreamToken(streamPath); // Refresh; result discarded (warming cache)
                        console.log('[VideoPlayer] Stream token refreshed');
                    } catch (e) {
                        console.warn('[VideoPlayer] Token refresh failed:', e.message);
                    }
                }, TOKEN_REFRESH_INTERVAL_MS);

            } catch (err) {
                console.error('[VideoPlayer] WHEP connection failed:', err);
                if (isMounted) setStatus('error');
            }
        };

        doConnect();

        return () => {
            isMounted = false;
            if (tokenRefreshRef.current) {
                clearInterval(tokenRefreshRef.current);
                tokenRefreshRef.current = null;
            }
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
        };
    }, [streamPath, retryCount]);

    return (
        <div className={`relative bg-black rounded-xl overflow-hidden ${className}`}>

            {/* Connecting overlay */}
            {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-400">Connecting to stream...</span>
                    </div>
                </div>
            )}

            {/* Stream offline (publisher not active) */}
            {status === 'offline' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <span className="text-yellow-400 text-xl">📡</span>
                        </div>
                        <span className="text-sm text-gray-300">Stream is offline</span>
                        <span className="text-xs text-gray-500">The bus camera hasn&apos;t started yet</span>
                        <button
                            onClick={triggerRetry}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Auth error */}
            {status === 'unauthorized' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-red-400 text-xl">🔒</span>
                        </div>
                        <span className="text-sm text-gray-300">Access denied</span>
                        <span className="text-xs text-gray-500">You don&apos;t have permission to view this stream</span>
                    </div>
                </div>
            )}

            {/* Generic error */}
            {status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-red-400 text-xl">⚠</span>
                        </div>
                        <span className="text-sm text-gray-400">Stream unavailable</span>
                        <button
                            onClick={triggerRetry}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                            Retry connection
                        </button>
                    </div>
                </div>
            )}

            <video
                ref={videoRef}
                className="w-full h-full"
                autoPlay
                playsInline
                muted
                style={{ minHeight: '200px' }}
            />
        </div>
    );
}
