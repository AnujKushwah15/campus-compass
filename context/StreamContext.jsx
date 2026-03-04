"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb, auth } from '@/lib/firebase';

const StreamContext = createContext(null);

const VPS_DOMAIN = process.env.NEXT_PUBLIC_VPS_DOMAIN || 'thanganat25.com';

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
            if (data) setImuData(data);
        });

        return () => {
            off(streamRef);
            off(piRef);
            off(imuRef);
        };
    }, [busId]);

    // ─── Build Stream URL (Firebase idToken in query string) ───────────────────────────
    // No extra API call needed — user’s Firebase idToken is appended directly.
    // MediaMTX calls /stream-auth which verifies the token via Firebase Admin SDK.
    const buildStreamUrl = useCallback(async (targetPathName) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');
            const idToken = await user.getIdToken();
            const path = targetPathName || streamStatus.pathName || (busId ? `live_${busId}` : 'live');
            return `https://${VPS_DOMAIN}/stream/${path}/?token=${idToken}`;
        } catch (error) {
            console.error('[StreamContext] buildStreamUrl error:', error);
            return null;
        }
    }, [busId, streamStatus.pathName]);

    // ─── Direct URL (no JWT — for fallback when auth is excluded for reads) ─
    // Built from RTDB pathName; useful if MediaMTX read auth is bypassed.
    const pathName = streamStatus.pathName || (busId ? `live_${busId}` : 'live');
    const directStreamUrl = `https://${VPS_DOMAIN}/stream/${pathName}/`;

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

        // Stream URL builder (uses Firebase idToken, no extra API call)
        buildStreamUrl,

        // Direct URL (no-auth fallback — for MediaMTX paths that don't require auth)
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
