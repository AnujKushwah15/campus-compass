/**
 * Campus Compass — VPS Backend Service
 * =====================================
 * Combined service running:
 *   1. Location Arbitration (existing) — enhanced with IMU signals
 *   2. Stream Auth Server (new) — Express on port 3001
 *   3. Stream Monitor (new) — polls MediaMTX API
 *   4. Heartbeat Monitor (new) — checks Pi liveness
 */

const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const serviceAccount = require('./service-account.json');

// ─── Configuration ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.STREAM_JWT_SECRET;
const JWT_EXPIRY = '10m'; // 10 minute stream tokens
const VPS_IP = process.env.VPS_IP || '72.61.250.73';
const MEDIAMTX_API = process.env.MEDIAMTX_API || 'http://127.0.0.1:9997';

// Fail fast — never run with a missing JWT secret
if (!JWT_SECRET) {
    console.error('❌ FATAL: STREAM_JWT_SECRET environment variable is not set.');
    console.error('   Set it in /etc/campus-compass.env and reload the service.');
    process.exit(1);
}

console.log('🔐 Config loaded:');
console.log(`   PORT        = ${PORT}`);
console.log(`   VPS_IP      = ${VPS_IP}`);
console.log(`   MEDIAMTX_API= ${MEDIAMTX_API}`);
console.log(`   JWT_SECRET  = [SET, ${JWT_SECRET.length} chars]`);

// ─── Firebase Init ──────────────────────────────────────────────────────────
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://transportation-system-1c24e-default-rtdb.firebaseio.com"
    });
}
const rtdb = admin.database();
const firestore = admin.firestore();

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: LOCATION ARBITRATION (Enhanced with IMU)
// ═══════════════════════════════════════════════════════════════════════════

const PI_TIMEOUT_MS = 10000;
const PHONE_TIMEOUT_MS = 30000;
const IMU_TIMEOUT_MS = 5000;
const PI_DEGRADED_TIMEOUT_MS = 30000; // Allow degraded GPS up to 30s if IMU says moving

const knownBuses = {};

console.log("🚀 Arbitration Service Started.");

const busesRef = rtdb.ref('buses');

busesRef.once('value', (snapshot) => {
    const count = snapshot.numChildren();
    console.log(`📦 Initial Scan found ${count} buses.`);
    snapshot.forEach(child => {
        knownBuses[child.key] = child.val();
    });
});

busesRef.on('child_changed', (snapshot) => {
    const busId = snapshot.key;
    const busData = snapshot.val();
    knownBuses[busId] = busData;
    evaluateSources(busId, busData);
});

busesRef.on('child_added', (snapshot) => {
    const busId = snapshot.key;
    const busData = snapshot.val();
    knownBuses[busId] = busData;
    evaluateSources(busId, busData);
});

// Heartbeat loop
setInterval(() => {
    Object.keys(knownBuses).forEach(busId => {
        evaluateSources(busId, knownBuses[busId]);
    });
}, 2000);

async function evaluateSources(busId, busData) {
    if (!busData || !busData.sources) return;

    const sources = busData.sources;
    const pi = sources.neo_m8n || {};
    const phone = sources.phone || {};
    const imu = sources.imu || {};       // [NEW] IMU data
    const currentOutput = busData.location || {};

    const now = Date.now();
    const piAge = now - (pi.last_seen || 0);
    const phoneAge = now - (phone.last_seen || 0);
    const imuAge = now - (imu.last_seen || 0);

    // [NEW] IMU quality signals
    const imuFresh = imuAge < IMU_TIMEOUT_MS;
    const imuMoving = imuFresh && imu.is_moving === true;
    const imuStationary = imuFresh && imu.is_moving === false;

    let bestSource = 'none';
    let finalLocation = null;

    // Rule 1: Pi GPS fresh + good fix
    if (piAge < PI_TIMEOUT_MS && pi.fix_type === '3D') {
        bestSource = 'neo_m8n';
        finalLocation = { ...pi, source: 'neo_m8n', arbitrated_at: now };

        // [NEW] IMU fusion: if GPS says moving but IMU says stationary, zero speed
        if (imuStationary && finalLocation.speed > 0) {
            finalLocation.speed = 0;
            finalLocation.source = 'neo_m8n_imu_corrected';
        }

        // [NEW] Use IMU heading if GPS heading is unavailable or speed is very low
        if (imuFresh && imu.heading_imu !== undefined) {
            if (!finalLocation.heading || finalLocation.speed < 2) {
                finalLocation.heading_imu = imu.heading_imu;
            }
        }
    }
    // [NEW] Rule 1.5: Pi GPS stale BUT IMU says still moving → degraded mode
    else if (piAge < PI_DEGRADED_TIMEOUT_MS && pi.fix_type === '3D' && imuMoving) {
        bestSource = 'neo_m8n_degraded';
        finalLocation = {
            ...pi,
            source: 'neo_m8n_degraded',
            arbitrated_at: now,
            gps_age_ms: piAge,
            imu_confirms_motion: true
        };
    }
    // Rule 2: Fallback to phone
    else if (phoneAge < PHONE_TIMEOUT_MS) {
        bestSource = 'phone';
        finalLocation = { ...phone, source: 'phone', arbitrated_at: now };
    }
    // Rule 3: Offline
    else {
        bestSource = 'none';
    }

    // Redundant write prevention
    if (finalLocation) {
        if (currentOutput.source === finalLocation.source &&
            currentOutput.timestamp === finalLocation.timestamp) {
            return;
        }
    } else {
        if ((!busData.active_source || busData.active_source === 'none' || busData.active_source === 'offline') &&
            (!currentOutput.source || currentOutput.source === 'none')) {
            return;
        }
    }

    try {
        const updatePayload = {
            active_source: bestSource
        };

        if (finalLocation) {
            updatePayload.location = finalLocation;
            const imuStatus = imuFresh ? (imuMoving ? 'MOVING' : 'STATIONARY') : 'NO_IMU';
            console.log(`[${busId}] 🔄 UPDATE: ${bestSource.toUpperCase()} | IMU: ${imuStatus} | GPS Age: ${piAge}ms`);
        } else {
            console.log(`[${busId}] 🔻 OFFLINE (Pi: ${piAge}ms, Phone: ${phoneAge}ms, IMU: ${imuAge}ms)`);
            updatePayload.location = {
                source: 'none',
                lat: currentOutput.lat || 0,
                lng: currentOutput.lng || 0,
                timestamp: now
            };
        }

        await rtdb.ref(`buses/${busId}`).update(updatePayload);

        if (knownBuses[busId]) {
            knownBuses[busId].active_source = bestSource;
            if (updatePayload.location) knownBuses[busId].location = updatePayload.location;
        }

    } catch (error) {
        console.error(`[${busId}] Error writing arbitration:`, error.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: EXPRESS SERVER (Stream Auth)
// ═══════════════════════════════════════════════════════════════════════════

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'campus-compass-backend', uptime: process.uptime() });
});

// ─── POST /api/stream-token ─────────────────────────────────────────────────
// Frontend calls this to get a signed stream URL.
// Requires Firebase ID token in Authorization header.

// Simple rate limiter
const tokenRateLimit = {};
const RATE_LIMIT_MAX = 10;    // max requests
const RATE_LIMIT_WINDOW = 60000; // per 1 minute

app.post('/api/stream-token', async (req, res) => {
    try {
        // 1. Extract Firebase ID token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }
        const idToken = authHeader.split('Bearer ')[1];

        // 2. Verify Firebase ID token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired Firebase token' });
        }

        const uid = decodedToken.uid;

        // 3. Rate limiting
        const now = Date.now();
        if (!tokenRateLimit[uid]) tokenRateLimit[uid] = [];
        tokenRateLimit[uid] = tokenRateLimit[uid].filter(t => now - t < RATE_LIMIT_WINDOW);
        if (tokenRateLimit[uid].length >= RATE_LIMIT_MAX) {
            return res.status(429).json({ error: 'Too many stream token requests. Try again later.' });
        }
        tokenRateLimit[uid].push(now);

        // 4. Fetch user from Firestore
        const userDoc = await firestore.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(403).json({ error: 'User not found in system' });
        }
        const userData = userDoc.data();
        const role = userData.role; // 'parent' | 'driver' | 'admin'

        // 5. Determine which bus to access
        const requestedBusId = req.body.busId;
        if (!requestedBusId) {
            return res.status(400).json({ error: 'busId is required' });
        }

        // 6. Role-based access control
        let allowed = false;

        if (role === 'admin') {
            // Admin can access all buses
            allowed = true;
        } else if (role === 'driver') {
            // Driver can only access their assigned bus.
            // Normalize IDs: 'bus-1' and '1' are treated as the same.
            const normalize = (id) => id ? String(id).replace(/^bus-/, '') : '';
            const assignedNorm = normalize(userData.assignedBusId);
            const requestedNorm = normalize(requestedBusId);
            allowed = assignedNorm === requestedNorm && assignedNorm !== '';
        } else if (role === 'parent') {
            // Parent can only access their child's bus
            // Find the student linked to this parent
            const studentsSnap = await firestore.collection('students')
                .where('parentId', '==', uid)
                .limit(1)
                .get();

            if (!studentsSnap.empty) {
                const studentData = studentsSnap.docs[0].data();
                const childBusId = studentData.assignedBusId || studentData.busId;
                allowed = childBusId === requestedBusId;
            }
        }

        if (!allowed) {
            // Log denied attempt
            await logStreamAccess(uid, role, requestedBusId, 'denied');
            return res.status(403).json({ error: 'You do not have access to this bus stream' });
        }

        // 7. Generate short-lived JWT stream token
        //    (No active-trip check — stream is available whenever the camera is live.
        //     Role-based access is still enforced above.)
        const streamToken = jwt.sign(
            {
                uid: uid,
                role: role,
                busId: requestedBusId,
                type: 'stream_access'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        // 8. Build stream URL
        const streamPath = `live_${requestedBusId}`;
        const streamUrl = `http://${VPS_IP}:8889/${streamPath}/?token=${streamToken}`;

        // 9. Log access
        await logStreamAccess(uid, role, requestedBusId, 'granted');

        res.json({
            streamUrl,
            streamPath,
            token: streamToken,
            expiresIn: JWT_EXPIRY
        });

    } catch (error) {
        console.error('Stream token error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /stream-auth ──────────────────────────────────────────────────────
// MediaMTX calls this on every read/publish attempt.
// See: https://github.com/bluenviron/mediamtx#authentication

app.post('/stream-auth', async (req, res) => {
    try {
        const { action, path, query, user, password, ip, protocol } = req.body;

        console.log(`[stream-auth] action=${action} path=${path} ip=${ip} protocol=${protocol}`);

        // Allow API actions (MediaMTX internal API queries)
        if (action === 'api') {
            return res.status(200).json({ ok: true });
        }

        // Allow publish actions with static Pi credentials (checked by MediaMTX internally)
        if (action === 'publish') {
            // Publisher auth is handled by MediaMTX internal users for now
            // We just allow it through the HTTP endpoint
            return res.status(200).json({ ok: true });
        }

        // For read actions, verify our JWT
        if (action === 'read') {
            // Extract token from query string
            let token = null;
            if (query) {
                const params = new URLSearchParams(query);
                token = params.get('token');
            }

            if (!token) {
                console.log(`[stream-auth] DENIED: No token provided from ${ip}`);
                return res.status(401).json({ error: 'No stream token provided' });
            }

            // Verify JWT
            try {
                const decoded = jwt.verify(token, JWT_SECRET);

                // Verify the token is for the right stream path
                const expectedPath = `live_${decoded.busId}`;
                if (path !== expectedPath) {
                    console.log(`[stream-auth] DENIED: Path mismatch. Expected ${expectedPath}, got ${path}`);
                    return res.status(403).json({ error: 'Stream path mismatch' });
                }

                console.log(`[stream-auth] ALLOWED: uid=${decoded.uid} role=${decoded.role} bus=${decoded.busId}`);
                return res.status(200).json({ ok: true });

            } catch (jwtErr) {
                if (jwtErr.name === 'TokenExpiredError') {
                    console.log(`[stream-auth] DENIED: Token expired from ${ip}`);
                    return res.status(401).json({ error: 'Stream token expired' });
                }
                console.log(`[stream-auth] DENIED: Invalid token from ${ip}: ${jwtErr.message}`);
                return res.status(403).json({ error: 'Invalid stream token' });
            }
        }

        // Unknown action
        return res.status(400).json({ error: 'Unknown action' });

    } catch (error) {
        console.error('[stream-auth] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Stream Access Logging ──────────────────────────────────────────────────
async function logStreamAccess(uid, role, busId, result) {
    try {
        await firestore.collection('streamLogs').add({
            uid,
            role,
            busId,
            result, // 'granted' | 'denied'
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error('Stream log write failed:', e.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: STREAM STATUS MONITOR
// ═══════════════════════════════════════════════════════════════════════════

async function pollStreamStatus() {
    try {
        const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

        // Try v3 API first (MediaMTX ≥ 1.0), fall back to v2
        let data = null;
        for (const version of ['v3', 'v2']) {
            const url = `${MEDIAMTX_API}/${version}/paths/list`;
            let res;
            try {
                res = await fetch(url);
            } catch (connErr) {
                if (connErr.code === 'ECONNREFUSED') {
                    console.warn('[StreamMonitor] MediaMTX not running (ECONNREFUSED) — will retry');
                } else {
                    console.error(`[StreamMonitor] Connection error to ${url}:`, connErr.message);
                }
                return;
            }

            if (!res.ok) {
                console.warn(`[StreamMonitor] ${version} API returned HTTP ${res.status} — trying next version`);
                continue;
            }

            data = await res.json();
            break;
        }

        if (!data) {
            console.error('[StreamMonitor] All MediaMTX API versions failed');
            return;
        }

        const paths = data.items || data.paths || [];
        const now = Date.now();

        for (const pathInfo of paths) {
            const pathName = pathInfo.name;
            const match = pathName.match(/^live[_-](.+)$/);
            if (!match) {
                if (pathName === 'live') {
                    await updateStreamStatus('bus-1', pathInfo, now);
                }
                continue;
            }
            const busId = match[1];
            await updateStreamStatus(busId, pathInfo, now);
        }

    } catch (error) {
        console.error('[StreamMonitor] Unexpected poll error:', error.message);
    }
}

async function updateStreamStatus(busId, pathInfo, now) {
    const hasPublisher = pathInfo.source && pathInfo.source.type !== '';
    const readerCount = (pathInfo.readers || []).length;

    const status = {
        isLive: hasPublisher,
        lastPublisherSeen: hasPublisher ? now : null,
        viewerCount: readerCount,
        lastChecked: now,
        pathName: pathInfo.name
    };

    try {
        await rtdb.ref(`buses/${busId}/streamStatus`).update(status);
    } catch (e) {
        console.error(`[StreamMonitor] RTDB write failed for ${busId}:`, e.message);
    }
}

// Poll every 5 seconds
setInterval(pollStreamStatus, 5000);
// Initial poll
setTimeout(pollStreamStatus, 2000);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: PI HEARTBEAT MONITOR
// ═══════════════════════════════════════════════════════════════════════════

const PI_HEARTBEAT_TIMEOUT = 30000; // 30 seconds

async function checkPiHeartbeats() {
    try {
        const busesSnap = await rtdb.ref('buses').once('value');
        const buses = busesSnap.val() || {};
        const now = Date.now();

        for (const [busId, busData] of Object.entries(buses)) {
            const piStatus = busData.piStatus;
            if (!piStatus) continue;

            if (piStatus.alive && piStatus.lastSeen) {
                const age = now - piStatus.lastSeen;
                if (age > PI_HEARTBEAT_TIMEOUT) {
                    console.log(`[Heartbeat] ⚠ Pi for ${busId} is STALE (${Math.round(age / 1000)}s old). Marking offline.`);
                    await rtdb.ref(`buses/${busId}/piStatus`).update({
                        alive: false,
                        markedOfflineAt: now,
                        lastSeen: piStatus.lastSeen
                    });
                }
            }
        }
    } catch (error) {
        console.error('[Heartbeat] Check error:', error.message);
    }
}

// Check heartbeats every 10 seconds
setInterval(checkPiHeartbeats, 10000);

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`🌐 Stream Auth Server running on port ${PORT}`);
    console.log(`   POST /api/stream-token  — Get signed stream URL`);
    console.log(`   POST /stream-auth       — MediaMTX auth callback`);
    console.log(`   GET  /health            — Health check`);
});
