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
const MEDIAMTX_API = process.env.MEDIAMTX_API || 'http://127.0.0.1:9997';
const VPS_DOMAIN = process.env.VPS_DOMAIN || 'thanganat25.com';

// JWT secret for signing stream access tokens — MUST be set in /etc/campus-compass.env
const STREAM_JWT_SECRET = process.env.STREAM_JWT_SECRET;
if (!STREAM_JWT_SECRET) {
    console.error('❌ FATAL: STREAM_JWT_SECRET is not set in environment. Exiting.');
    process.exit(1);
}

const STREAM_TOKEN_TTL_SECONDS = 300; // Token valid for 5 minutes (300s)

console.log('🔐 Config loaded:');
console.log(`   PORT        = ${PORT}`);
console.log(`   MEDIAMTX_API= ${MEDIAMTX_API}`);
console.log(`   VPS_DOMAIN  = ${VPS_DOMAIN}`);
console.log(`   JWT TTL     = ${STREAM_TOKEN_TTL_SECONDS}s`);

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
        let status = 'online';
        if (bestSource === 'none') status = 'offline';
        else if (bestSource === 'neo_m8n_degraded') status = 'degraded';

        const updatePayload = {
            active_source: bestSource,
            status: status
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
            knownBuses[busId].status = status;
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

// ─── CORS — explicit config required because requests carry Authorization header
// The Authorization header triggers a preflight (OPTIONS) request; browsers will
// reject a wildcard origin unless allowedHeaders is explicitly set.
// CORS_ORIGINS env var: comma-separated list of allowed origins.
// Defaults to localhost:3000 for local development.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());

// [2026-03-21] CORS is now handled by Nginx on the VPS. 
// Removing redundant express cors middleware to avoid duplicate headers.
// app.use(cors(...));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'campus-compass-backend', uptime: process.uptime() });
});

// ─── GET /api/stream-token ──────────────────────────────────────────────────
// Frontend calls this with a valid Firebase ID token to receive a short-lived
// signed JWT that can be appended to the WHEP stream URL as ?token=<JWT>.
//
// Request:
//   GET /api/stream-token?stream=live_bus-1
//   Authorization: Bearer <firebase-id-token>
//
// Response:
//   { url: "https://thanganat25.com/stream/live_bus-1/whep?token=<JWT>" }

app.get('/api/stream-token', async (req, res) => {
    try {
        // 1. Extract Firebase ID token from Authorization header
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing Authorization: Bearer <token>' });
        }
        const idToken = authHeader.slice(7);

        // 2. Verify Firebase ID token using Admin SDK
        let decoded;
        try {
            decoded = await admin.auth().verifyIdToken(idToken);
        } catch (err) {
            console.log(`[stream-token] DENIED: Invalid Firebase ID token — ${err.message}`);
            return res.status(401).json({ error: 'Invalid Firebase token' });
        }
        const uid = decoded.uid;

        // 3. Determine the requested stream path
        //    Defaults to 'live_bus-1' if not specified — frontend should always pass this.
        const stream = req.query.stream || 'live_bus-1';

        // Validate stream path format (only allow known path patterns)
        if (!/^live(_bus-\d+)?$/.test(stream)) {
            return res.status(400).json({ error: 'Invalid stream path format' });
        }

        // 4. Issue a short-lived JWT
        const payload = { uid, stream };
        const token = jwt.sign(payload, STREAM_JWT_SECRET, {
            expiresIn: STREAM_TOKEN_TTL_SECONDS,
            algorithm: 'HS256',
        });

        // 5. Return the full signed WHEP URL
        const url = `https://${VPS_DOMAIN}/stream/${stream}/whep?token=${token}`;
        console.log(`[stream-token] ISSUED: uid=${uid} stream=${stream} ttl=${STREAM_TOKEN_TTL_SECONDS}s`);
        return res.status(200).json({ url, token, ttl: STREAM_TOKEN_TTL_SECONDS });

    } catch (error) {
        console.error('[stream-token] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /stream-auth ──────────────────────────────────────────────────────
// MediaMTX calls this on every read/publish attempt.
// Verifies the Firebase idToken passed in stream URL as ?token=<idToken>
// Then applies Firestore RBAC to enforce role-based bus access.
// See: https://github.com/bluenviron/mediamtx#authentication

// Helper: normalize bus IDs ('bus-1' and '1' are treated as the same)
const normalize = (id) => id ? String(id).replace(/^bus-/, '') : '';

app.post('/stream-auth', async (req, res) => {
    try {
        const { action, path, query, ip, protocol } = req.body;

        console.log(`[stream-auth] action=${action} path=${path} ip=${ip} protocol=${protocol}`);

        // Allow MediaMTX internal API actions
        if (action === 'api') {
            return res.status(200).json({ ok: true });
        }

        // Allow publish — Pi cameras are authenticated via MediaMTX internal users
        if (action === 'publish') {
            return res.status(200).json({ ok: true });
        }

        // For read actions: verify JWT + RBAC
        if (action === 'read') {
            // 1. Extract token from query string
            let token = null;
            if (query) {
                const params = new URLSearchParams(query);
                token = params.get('token');
            }

            console.log(`[stream-auth-debug] FULL QUERY: ${query}`);
            console.log(`[stream-auth-debug] TOKEN PRESENT: ${!!token}`);

            if (!token) {
                console.log(`[stream-auth] DENIED: No token provided from ${ip}`);
                return res.status(401).json({ error: 'No stream token provided' });
            }

            // 2. Verify JWT signature and expiry
            let claims;
            try {
                claims = jwt.verify(token, STREAM_JWT_SECRET, { algorithms: ['HS256'] });
            } catch (err) {
                const reason = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
                console.log(`[stream-auth] DENIED: ${reason} from ${ip} — ${err.message}`);
                return res.status(401).json({ error: reason });
            }

            const uid = claims.uid;
            const claimedStream = claims.stream;

            // 3. Verify the JWT's stream claim matches the path being accessed
            if (claimedStream !== path) {
                console.log(`[stream-auth] DENIED: JWT stream '${claimedStream}' does not match requested path '${path}'`);
                return res.status(403).json({ error: 'Token stream mismatch' });
            }

            // 4. Fetch user role from Firestore (RBAC)
            const userDoc = await firestore.collection('users').doc(uid).get();
            if (!userDoc.exists) {
                console.log(`[stream-auth] DENIED: User ${uid} not found in Firestore`);
                return res.status(403).json({ error: 'User not found in system' });
            }
            const userData = userDoc.data();
            const role = userData.role;

            // 5. Extract busId from stream path (e.g. 'live_bus-1' → 'bus-1')
            const pathMatch = path.match(/^live[_-](.+)$/);
            if (!pathMatch) {
                console.log(`[stream-auth] DENIED: Unrecognised stream path '${path}'`);
                return res.status(403).json({ error: 'Invalid stream path' });
            }
            const requestedBusId = pathMatch[1];
            const requestedNorm = normalize(requestedBusId);

            // 5. Role-based access control
            let allowed = false;

            if (role === 'admin') {
                allowed = true;
            } else if (role === 'driver') {
                const assignedNorm = normalize(userData.assignedBusId);
                allowed = assignedNorm === requestedNorm && assignedNorm !== '';
            } else if (role === 'parent') {
                const studentsSnap = await firestore.collection('students')
                    .where('parentId', '==', uid)
                    .get();
                if (!studentsSnap.empty) {
                    const allowedBuses = studentsSnap.docs.map(doc => {
                        const d = doc.data();
                        return normalize(d.assignedBusId || d.busId);
                    });
                    allowed = allowedBuses.includes(requestedNorm);
                }
            }

            if (!allowed) {
                console.log(`[stream-auth] DENIED: uid=${uid} role=${role} has no access to bus ${requestedBusId}`);
                await logStreamAccess(uid, role, requestedBusId, 'denied', 'jwt');
                return res.status(403).json({ error: 'Access denied' });
            }

            console.log(`[stream-auth] ALLOWED: uid=${uid} role=${role} bus=${requestedBusId}`);
            await logStreamAccess(uid, role, requestedBusId, 'granted', 'jwt');
            return res.status(200).json({ ok: true });
        }

        // Unknown action
        return res.status(400).json({ error: 'Unknown action' });

    } catch (error) {
        console.error('[stream-auth] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Stream Access Logging ──────────────────────────────────────────────────
async function logStreamAccess(uid, role, busId, result, method = 'unknown') {
    try {
        await firestore.collection('streamLogs').add({
            uid,
            role,
            busId,
            result,      // 'granted' | 'denied'
            method,      // 'jwt'
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

// Poll every 30 seconds to reduce UI churn, while still keeping status fresh enough
setInterval(pollStreamStatus, 30000);
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
    console.log(`   GET  /api/stream-token  — Firebase ID token → short-lived JWT WHEP URL (${STREAM_TOKEN_TTL_SECONDS}s)`);
    console.log(`   POST /stream-auth       — MediaMTX auth callback (JWT verification)`);
    console.log(`   GET  /health            — Health check`);
});
