"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb, auth } from '@/lib/firebase';

const StreamContext = createContext(null);

/**
 * StreamProvider — Manages stream status, Pi health, and stream token acquisition.
 * 
 * Subscribes to RTDB for:
 *   - /buses/{busId}/streamStatus  → isLive, viewerCount
 *   - /buses/{busId}/piStatus      → alive, gps_fix, imu_ok
 *   - /buses/{busId}/sources/imu   → IMU telemetry (accelerometer, gyro, heading)
 * 
 * Provides getStreamToken(busId) to request an authenticated stream URL.
 */
export function StreamProvider({ children, busId }) {
    const [streamStatus, setStreamStatus] = useState({
        isLive: false,
        viewerCount: 0,
        lastChecked: null,
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

    // ─── RTDB Subscriptions ─────────────────────────────────────────────
    useEffect(() => {
        if (!busId) return;

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
            if (data) {
                setImuData(data);
            }
        });

        return () => {
            off(streamRef);
            off(piRef);
            off(imuRef);
            if (tokenRefreshTimer.current) {
                clearTimeout(tokenRefreshTimer.current);
            }
        };
    }, [busId]);

    // ─── Stream Token Acquisition ───────────────────────────────────────
    const VPS_URL = process.env.NEXT_PUBLIC_VPS_URL || 'http://72.61.250.73:3001';

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
            if (!user) {
                throw new Error('Not authenticated');
            }

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

            // Auto-refresh token before expiry (refresh at 8 minutes for 10min tokens)
            if (tokenRefreshTimer.current) {
                clearTimeout(tokenRefreshTimer.current);
            }
            tokenRefreshTimer.current = setTimeout(() => {
                getStreamToken(busToRequest);
            }, 8 * 60 * 1000);

            return data;

        } catch (error) {
            console.error('Stream token error:', error);
            setTokenError(error.message);
            setStreamToken(null);
            setStreamUrl(null);
            return null;

        } finally {
            setTokenLoading(false);
        }
    }, [busId, VPS_URL]);

    // ─── Clear token on busId change ────────────────────────────────────
    useEffect(() => {
        setStreamToken(null);
        setStreamUrl(null);
        setTokenError(null);
    }, [busId]);

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

        // Token
        streamToken,
        streamUrl,
        tokenLoading,
        tokenError,
        getStreamToken,
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
