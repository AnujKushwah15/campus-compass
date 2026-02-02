const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const clearTrips = async () => {
    console.log("🗑️ Clearing 'trips' collection...");

    const tripsRef = db.collection('trips');
    const snapshot = await tripsRef.get();

    if (snapshot.empty) {
        console.log("No trips found to delete.");
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Successfully deleted ${snapshot.size} trips.`);
};

clearTrips();
