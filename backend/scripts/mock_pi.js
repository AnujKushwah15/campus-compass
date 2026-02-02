const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://transportation-system-1c24e-default-rtdb.firebaseio.com"
    });
}
const db = admin.database();

const BUS_ID = 'bus-1'; // Target Bus

async function simulatePi() {
    console.log(`📡 Simulation Started: Sending 'neo_m8n' data for ${BUS_ID}...`);
    console.log("Press Ctrl+C to stop.");

    // Simulate movement
    let lat = 23.0225;
    let lng = 72.5714;

    setInterval(async () => {
        // Move slightly
        lat += 0.0001;
        lng += 0.0001;

        const payload = {
            active: true,
            lat: lat,
            lng: lng,
            speed: 45.5,
            heading: 90,
            fix_type: '3D', // Perfect signal
            hdop: 0.8,
            satellites: 8,
            timestamp: Date.now(),
            last_seen: Date.now()
        };

        try {
            await db.ref(`buses/${BUS_ID}/sources/neo_m8n`).set(payload);
            console.log(`✅ Sent Update: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } catch (error) {
            console.error("❌ Send Failed:", error.message);
        }

    }, 1000); // 1Hz updates
}

simulatePi();
