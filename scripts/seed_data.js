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

        students.forEach((student, index) => {
            const uid = `student-${student.id}`;
            const studentRef = db.collection('users').doc(uid);
            batch.set(studentRef, {
                uid: uid,
                email: `student${student.id}@test.com`,
                fullName: student.name,
                prn: student.prn,
                stopId: student.stopId,
                assignedBusId: student.busId,
                parentId: `parent-${student.id}`,
                role: 'student'
            });
        });

        // 4. Driver
        // const driverRef = db.collection('users').doc('driver-1');
        // batch.set(driverRef, {
        //     uid: 'driver-1',
        //     email: 'driver1@test.com',
        //     fullName: 'Test Driver',
        //     role: 'driver',
        //     assignedBusId: 'bus-1'
        // });

        // 5. Trip
        const tripRef = db.collection('trips').doc('trip-1');
        const now = new Date();
        const past = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
        batch.set(tripRef, {
            driverId: "d1l7cGLNVUf9VkTNzEle7TaYL9h1",
            driverName: "Test Driver",
            busId: "bus-1",
            routeId: "route-1",
            status: "completed",
            startTime: past,
            endTime: now,
            location: { lat: 23.03, lng: 72.58, speed: 0 },
            attendance: {
                "student-1": { status: "present", timestamp: past.toISOString() },
                "student-2": { status: "present", timestamp: past.toISOString() }
            }
        });

        // 6. Attendance
        students.forEach((student) => {
            const uid = `student-${student.id}`;
            const isPresent = parseInt(student.id) % 2 !== 0; // Just some logic
            const attendanceRef = db.collection('attendance').doc(`trip-1_${uid}`);
            batch.set(attendanceRef, {
                id: `trip-1_${uid}`,
                tripId: 'trip-1',
                busId: 'bus-1',
                studentId: uid,
                studentName: student.name,
                status: isPresent ? 'present' : 'absent',
                timestamp: past.toISOString(),
                date: past.toISOString().split('T')[0],
                autoMarked: !isPresent
            });
        });

        // 7. StreamLogs
        const streamLogRef = db.collection('streamLogs').doc('log-1');
        batch.set(streamLogRef, {
            type: 'stream_started',
            busId: "bus-1",
            timestamp: past,
            ip: '127.0.0.1'
        });

        await batch.commit();
        console.log("✅ Database seeded successfully!");
    } catch (error) {
        console.error("❌ Error seeding database:", error);
    };

    seedData();
}
