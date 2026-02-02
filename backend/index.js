const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// 1. Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://transportation-system-1c24e-default-rtdb.firebaseio.com"
    });
}
const db = admin.database();

const PI_TIMEOUT_MS = 10000; // 10 seconds (Pi considered offline)
const PHONE_TIMEOUT_MS = 30000; // 30 seconds

// Local cache for Heartbeat
const knownBuses = {};

console.log("🚀 Arbitration Service Started.");

// 2. Listen to ALL Buses
const busesRef = db.ref('buses');

// Initial Scan
busesRef.once('value', (snapshot) => {
    const count = snapshot.numChildren();
    console.log(`📦 Initial Scan found ${count} buses.`);
    snapshot.forEach(child => {
        knownBuses[child.key] = child.val();
    });
});

// Realtime Listeners
busesRef.on('child_changed', (snapshot) => {
    const busId = snapshot.key;
    const busData = snapshot.val();
    knownBuses[busId] = busData; // Update cache
    evaluateSources(busId, busData);
});

busesRef.on('child_added', (snapshot) => {
    const busId = snapshot.key;
    const busData = snapshot.val();
    knownBuses[busId] = busData; // Update cache
    evaluateSources(busId, busData);
});

// 3. Heartbeat Loop (Crucial for Timeouts)
// If data STOPS coming (e.g. Pi dies), no events fire. 
// We must manually check "Are we stale?" periodically.
setInterval(() => {
    Object.keys(knownBuses).forEach(busId => {
        // We re-evaluate using the cached data. 
        // The 'last_seen' inside cached data is old, so 'Age' will increase correctly.
        evaluateSources(busId, knownBuses[busId]);
    });
}, 2000); // Check every 2 seconds

async function evaluateSources(busId, busData) {
    if (!busData || !busData.sources) return;

    const sources = busData.sources;
    const pi = sources.neo_m8n || {};
    const phone = sources.phone || {};
    const currentOutput = busData.location || {}; // cached view

    const now = Date.now();
    const piAge = now - (pi.last_seen || 0);
    const phoneAge = now - (phone.last_seen || 0);

    let bestSource = 'none';
    let finalLocation = null;

    // Rule 1: Priority to Pi (Hardware) if Fresh & Good Fix
    if (piAge < PI_TIMEOUT_MS && pi.fix_type === '3D') {
        bestSource = 'neo_m8n';
        finalLocation = { ...pi, source: 'neo_m8n', arbitrated_at: now };
    }
    // Rule 2: Fallback to Phone if Fresh
    else if (phoneAge < PHONE_TIMEOUT_MS) {
        bestSource = 'phone';
        finalLocation = { ...phone, source: 'phone', arbitrated_at: now };
    }
    // Rule 3: Offline
    else {
        bestSource = 'none';
        // Note: We don't necessarily wipe the location, just set source to none
    }

    // [CRITICAL FIX]: Redundant Write Prevention

    // 1. If we have a new location candidate
    if (finalLocation) {
        // If DB already matching source and timestamp, SKIP.
        if (currentOutput.source === finalLocation.source &&
            currentOutput.timestamp === finalLocation.timestamp) {
            return;
        }
    }
    // 2. If we decided "None"
    else {
        // If DB is already active_source=none, SKIP.
        // We check cached currentOutput.source (which usually stores the 'source' string inside location object)
        // OR check busData.active_source
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
            console.log(`[${busId}] 🔄 UPDATE: ${bestSource.toUpperCase()} (Pi Age: ${piAge}ms)`);
        } else {
            console.log(`[${busId}] 🔻 OFFLINE (Pi: ${piAge}ms, Phone: ${phoneAge}ms)`);

            // Explicitly mark offline in location object too, so clients know
            updatePayload.location = {
                source: 'none',
                lat: currentOutput.lat || 0, // Keep last known pos?
                lng: currentOutput.lng || 0,
                timestamp: now
            };
        }

        await db.ref(`buses/${busId}`).update(updatePayload);

        // Update local cache to reflect what we just wrote (prevent immediate re-fire)
        if (knownBuses[busId]) {
            knownBuses[busId].active_source = bestSource;
            if (updatePayload.location) knownBuses[busId].location = updatePayload.location;
        }

    } catch (error) {
        console.error(`[${busId}] Error writing arbitration:`, error.message);
    }
}
