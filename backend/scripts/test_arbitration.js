const admin = require('firebase-admin');
const path = require('path');

// Ensure to run this script like: GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node test_arbitration.js
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn("⚠️  GOOGLE_APPLICATION_CREDENTIALS not set. Falling back to default service-account.json logic.");
    // In dev, you might fall back to requiring a local file if needed
    try {
        const serviceAccount = require(path.join(__dirname, '..', 'service-account.json'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://transportation-system-1c24e-default-rtdb.firebaseio.com"
        });
    } catch (err) {
        console.error("❌ Failed to initialize Firebase-Admin. Please provide GOOGLE_APPLICATION_CREDENTIALS.");
        process.exit(1);
    }
} else {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: "https://transportation-system-1c24e-default-rtdb.firebaseio.com"
    });
}

const db = admin.database();
const TEST_BUS_ID = 'test-bus-arbitration';
const busRef = db.ref(`buses/${TEST_BUS_ID}`);

async function setSource(sourceName, data) {
    await busRef.child(`sources/${sourceName}`).update({
        ...data,
        last_seen: Date.now()
    });
}

async function verifyState(expectedSource, expectedStatus, delayMs = 3000) {
    console.log(`⏳ Waiting for backend to arbitrate (${delayMs}ms)...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));

    const snapshot = await busRef.once('value');
    const data = snapshot.val();

    const actualSource = data?.active_source;
    const actualStatus = data?.status;

    if (actualSource === expectedSource && actualStatus === expectedStatus) {
        console.log(`✅ SUCCESS: Backend correctly updated active_source to '${actualSource}' and status to '${actualStatus}'`);
    } else {
        console.error(`❌ FAILED: Expected source='${expectedSource}', status='${expectedStatus}'. Got source='${actualSource}', status='${actualStatus}'`);
        process.exit(1);
    }
}

async function runTests() {
    console.log(`🚀 Starting Arbitration State Machine Tests for [${TEST_BUS_ID}]`);
    console.log("Ensure your local `node index.js` backend is running!\n");

    // Initialize clean slate
    await busRef.set({
        sources: {
            neo_m8n: { last_seen: 0 },
            phone: { last_seen: 0 },
            imu: { last_seen: 0 }
        }
    });

    console.log("--- TEST 1: GPS Fresh, Good Fix ---");
    await setSource('neo_m8n', { fix_type: '3D', lat: 10, lng: 10, speed: 15 });
    await setSource('imu', { is_moving: true, heading_imu: 90 });
    await verifyState('neo_m8n', 'online');

    console.log("\n--- TEST 2: GPS Stale, IMU Shows Movement (Degraded Mode) ---");
    // Make GPS 15 seconds old (stale), but keep IMU fresh and moving
    await busRef.child('sources/neo_m8n/last_seen').set(Date.now() - 15000);
    await setSource('imu', { is_moving: true, heading_imu: 90 });
    await verifyState('neo_m8n_degraded', 'degraded');

    console.log("\n--- TEST 3: Pi GPS Completely Stale, Falling back to Phone ---");
    // Make Pi GPS 40 seconds old (dead)
    await busRef.child('sources/neo_m8n/last_seen').set(Date.now() - 40000);
    await setSource('phone', { fix_type: '3D', lat: 10.1, lng: 10.1 });
    await verifyState('phone', 'online');

    console.log("\n--- TEST 4: Everything Stale (Offline) ---");
    // Make phone stale too
    await busRef.child('sources/phone/last_seen').set(Date.now() - 40000);
    await verifyState('none', 'offline');

    console.log("\n🎉 All Arbitration Logic Tests Passed!");

    // Cleanup
    await busRef.remove();
    process.exit(0);
}

runTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
