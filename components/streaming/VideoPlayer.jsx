"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';

const VPS_DOMAIN = process.env.NEXT_PUBLIC_VPS_DOMAIN || 'thanganat25.com';

/**
 * VideoPlayer — Renders a WebRTC stream via WHEP protocol.
 *
 * Uses WHEP (WebRTC HTTP Egress Protocol) instead of an iframe so that
 * the Firebase idToken is sent as an Authorization header in a single
 * HTTP request. No cookie relay, no cross-origin popup issues.
 *
 * Props:
 *   streamPath  — MediaMTX path name (e.g. "live_bus-1")
 *   className   — Optional CSS classes
 */
export default function VideoPlayer({ streamPath, className = "" }) {
    const videoRef = useRef(null);
    const pcRef = useRef(null);          // RTCPeerConnection
    const [status, setStatus] = useState('idle'); // idle | connecting | live | error | offline

    useEffect(() => {
        let isMounted = true;

        const doConnect = async () => {
            const video = videoRef.current;
            if (!video || !streamPath) return;

            // Clean up any old connection (safety net)
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }

            if (isMounted) setStatus('connecting');

            try {
                // 1. Get Firebase User
                const user = auth.currentUser;
                if (!user) throw new Error('Not authenticated');
                const documentID = user.uid;

                // 2. Create peer connection
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                pcRef.current = pc;

                // 3. Add receiver tracks
                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                // 4. Attach stream to video
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

                // 6. POST to WHEP endpoint with documentID as token
                const whepUrl = `https://${VPS_DOMAIN}/stream/${streamPath}/whep?token=${documentID}`;
                console.log('[VideoPlayer] Requesting WHEP URL:', whepUrl);
                const response = await fetch(whepUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body: offer.sdp,
                });

                if (!isMounted) return;

                if (response.status === 401) {
                    throw new Error('Unauthorized — check your stream access');
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
                    console.log('[VideoPlayer] Aborting: component unmounted or PC closed before setting answer.');
                    return;
                }

                await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

            } catch (err) {
                console.error('[VideoPlayer] WHEP connection failed:', err);
                if (isMounted) {
                    setStatus(err.message.includes('Unauthorized') ? 'unauthorized' : 'error');
                }
            }
        };

        doConnect();

        return () => {
            isMounted = false;
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
        };
    }, [streamPath, retryCount]);

    // We expose connect manually as a ref or fallback for the "Retry" button. 
    // Wait, the "Retry" button uses `onClick={connect}` but connect was removed. 
    // We can just set a dummy state to trigger a re-mount or re-run of useEffect.
    const [retryCount, setRetryCount] = useState(0);
    const triggerRetry = () => setRetryCount(c => c + 1);

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
