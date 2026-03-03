"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb, auth } from '@/lib/firebase';

const StreamContext = createContext(null);

const VPS_IP = process.env.NEXT_PUBLIC_VPS_IP || '72.61.250.73';
const VPS_URL = process.env.NEXT_PUBLIC_VPS_URL || `http://${VPS_IP}:3001`;
const WEBRTC_PORT = process.env.NEXT_PUBLIC_WEBRTC_PORT || '8889';

/**
 * StreamProvider — Manages stream status, Pi health, and stream token acquisition.
 *
 * Subscribes to RTDB for:
 *   - /buses/{busId}/streamStatus  → isLive, viewerCount, pathName
 *   - /buses/{busId}/piStatus      → alive, gps_fix, imu_ok
 *   - /buses/{busId}/sources/imu   → IMU telemetry
 *
 * Auto-requests a JWT stream token when the stream goes live.
 * Exposes `directStreamUrl` as a direct WebRTC URL (no JWT, for fallback).
 */
export function StreamProvider({ children, busId }) {
    const [streamStatus, setStreamStatus] = useState({
        isLive: false,
        viewerCount: 0,
        lastChecked: null,
        pathName: null,
    });

    const [piStatus, setPiStatus] = useState({
        alive: false,
        lastSeen: null,
        gps_fix: false,
        imu_ok: false,
    });

    const [imuData, setImuData] = useState({
        accel_x: 0, accel_y: 0, accel_z: 0,
        gyro_x: 0, gyro_y: 0, gyro_z: 0,
        heading_imu: 0,
        is_moving: false,
        temperature: 0,
    });

    const [streamToken, setStreamToken] = useState(null);
    const [streamUrl, setStreamUrl] = useState(null);
    const [tokenLoading, setTokenLoading] = useState(false);
    const [tokenError, setTokenError] = useState(null);
    const tokenRefreshTimer = useRef(null);
    // Prevents duplicate auto-requests when isLive fires multiple RTDB updates
    const autoRequestedRef = useRef(false);

    // ─── RTDB Subscriptions ─────────────────────────────────────────────
    useEffect(() => {
        if (!busId) return;

        autoRequestedRef.current = false; // reset on busId change

        const streamRef = ref(rtdb, `buses/${busId}/streamStatus`);
        const piRef = ref(rtdb, `buses/${busId}/piStatus`);
        const imuRef = ref(rtdb, `buses/${busId}/sources/imu`);

        const unsubStream = onValue(streamRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setStreamStatus({
                    isLive: data.isLive || false,
                    viewerCount: data.viewerCount || 0,
                    lastChecked: data.lastChecked || null,
                    pathName: data.pathName || null,
                });
            }
        });

        const unsubPi = onValue(piRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setPiStatus({
                    alive: data.alive || false,
                    lastSeen: data.lastSeen || null,
                    gps_fix: data.gps_fix || false,
                    imu_ok: data.imu_ok || false,
                    gps_enabled: data.gps_enabled || false,
                    imu_enabled: data.imu_enabled || false,
                });
            }
        });

        const unsubImu = onValue(imuRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setImuData(data);
        });

        return () => {
            off(streamRef);
            off(piRef);
            off(imuRef);
            if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
        };
    }, [busId]);

    // ─── Stream Token Acquisition ───────────────────────────────────────
    const getStreamToken = useCallback(async (targetBusId) => {
        const busToRequest = targetBusId || busId;
        if (!busToRequest) {
            setTokenError('No bus ID specified');
            return null;
        }

        setTokenLoading(true);
        setTokenError(null);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');

            const idToken = await user.getIdToken();

            const response = await fetch(`${VPS_URL}/api/stream-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ busId: busToRequest }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            setStreamToken(data.token);
            setStreamUrl(data.streamUrl);

            // Auto-refresh token before expiry (8 min for 10-min tokens)
            if (tokenRefreshTimer.current) clearTimeout(tokenRefreshTimer.current);
            tokenRefreshTimer.current = setTimeout(() => {
                autoRequestedRef.current = false; // allow refresh
                getStreamToken(busToRequest);
            }, 8 * 60 * 1000);

            return data;

        } catch (error) {
            console.error('[StreamContext] Token error:', error);
            setTokenError(error.message);
            setStreamToken(null);
            setStreamUrl(null);
            return null;

        } finally {
            setTokenLoading(false);
        }
    }, [busId, VPS_URL]);

    // ─── Auto-request token when stream goes live ───────────────────────
    useEffect(() => {
        if (streamStatus.isLive && !streamToken && !tokenLoading && !autoRequestedRef.current) {
            const user = auth.currentUser;
            if (user) {
                autoRequestedRef.current = true;
                getStreamToken(busId);
            }
        }
    }, [streamStatus.isLive, streamToken, tokenLoading, busId, getStreamToken]);

    // ─── Clear token on busId change ────────────────────────────────────
    useEffect(() => {
        setStreamToken(null);
        setStreamUrl(null);
        setTokenError(null);
        autoRequestedRef.current = false;
    }, [busId]);

    // ─── Direct URL (no JWT — for fallback when auth is excluded for reads) ─
    // Built from RTDB pathName; useful if MediaMTX read auth is bypassed.
    const pathName = streamStatus.pathName || (busId ? `live_${busId}` : 'live');
    const directStreamUrl = `http://${VPS_IP}:${WEBRTC_PORT}/${pathName}/`;

    const value = {
        // Status
        streamStatus,
        piStatus,
        imuData,

        // Derived helpers
        isLive: streamStatus.isLive,
        isPiOnline: piStatus.alive,
        isGpsFix: piStatus.gps_fix,
        isImuOk: piStatus.imu_ok,
        isMoving: imuData.is_moving,
        viewerCount: streamStatus.viewerCount,

        // Token (JWT flow)
        streamToken,
        streamUrl,
        tokenLoading,
        tokenError,
        getStreamToken,

        // Direct URL (no-JWT fallback)
        directStreamUrl,
    };

    return (
        <StreamContext.Provider value={value}>
            {children}
        </StreamContext.Provider>
    );
}

export function useStream() {
    const context = useContext(StreamContext);
    if (!context) {
        throw new Error('useStream must be used within a StreamProvider');
    }
    return context;
}

export default StreamContext;
