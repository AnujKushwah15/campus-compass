const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const seedData = async () => {
    const batch = db.batch();

    console.log("🌱 Seeding Firestore Data (Admin SDK)...");

    try {
        // 1. Bus
        const busRef = db.collection('buses').doc('bus-1');
        batch.set(busRef, {
            plateNumber: "GJ-01-AB-1234",
            capacity: 40,
            driverId: null,
            status: "idle"
        });

        // 2. Route
        const routeRef = db.collection('routes').doc('route-1');
        batch.set(routeRef, {
            name: "Route A - City Center",
            busId: "bus-1",
            stops: [
                { id: "stop-1", name: "North Stop", location: { lat: 23.03, lng: 72.58 }, order: 1 },
                { id: "stop-2", name: "Main Road", location: { lat: 23.02, lng: 72.57 }, order: 2 },
                { id: "stop-3", name: "City Center", location: { lat: 23.01, lng: 72.56 }, order: 3 }
            ]
        });

        // 3. Students
        const students = [
            { id: "1", name: "Aarav Patel", prn: "2023001", stopId: "stop-1", busId: "bus-1" },
            { id: "2", name: "Riya Sharma", prn: "2023042", stopId: "stop-2", busId: "bus-1" },
            { id: "3", name: "Vihaan Gupta", prn: "2023015", stopId: "stop-1", busId: "bus-1" },
            { id: "4", name: "Ananya Singh", prn: "2023089", stopId: "stop-3", busId: "bus-1" },
            { id: "5", name: "Aditya Kumar", prn: "2023022", stopId: "stop-2", busId: "bus-1" }
        ];

        students.forEach(student => {
            const studentRef = db.collection('students').doc(student.id);
            batch.set(studentRef, { ...student, parentId: `parent-${student.id}`, role: 'student', assignedBusId: "bus-1" });
        });

        await batch.commit();
        console.log("✅ Database seeded successfully!");
    } catch (error) {
        console.error("❌ Error seeding database:", error);
    }
};

seedData();
