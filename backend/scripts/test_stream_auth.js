const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase
const serviceAccountPath = path.join(__dirname, '../service-account.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const firestore = admin.firestore();

// The exact arbitration logic from backend/index.js
async function executeAuthLogic(uid, role, requestedBusId) {
    let allowed = false;

    // Fetch user from Firestore
    const userDoc = await firestore.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        return { allowed: false, error: 'User not found in system' };
    }
    const userData = userDoc.data();

    const normalize = (id) => id ? String(id).replace(/^bus-/, '') : '';
    const requestedNorm = normalize(requestedBusId);

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
                const studentData = doc.data();
                return normalize(studentData.assignedBusId || studentData.busId);
            });
            allowed = allowedBuses.includes(requestedNorm);
        }
    }

    return { allowed };
}

async function runTests() {
    console.log('🧪 Starting Stream Auth Logic Tests...\n');
    let passed = 0;
    let failed = 0;

    const testEnv = {
        users: {
            'test-admin-123': { role: 'admin' },
            'test-driver-1': { role: 'driver', assignedBusId: 'bus-1' },
            'test-driver-2': { role: 'driver', assignedBusId: 'bus-2' },
            'test-parent-single': { role: 'parent' },
            'test-parent-multi': { role: 'parent' }
        },
        students: {
            'student-1': { parentId: 'test-parent-single', assignedBusId: 'bus-1' },
            'student-2': { parentId: 'test-parent-multi', assignedBusId: 'bus-1' },
            'student-3': { parentId: 'test-parent-multi', assignedBusId: 'bus-2' }
        }
    };

    console.log('🔨 Setting up test environment in Firestore...');
    for (const [uid, data] of Object.entries(testEnv.users)) {
        await firestore.collection('users').doc(uid).set(data);
    }
    for (const [sid, data] of Object.entries(testEnv.students)) {
        await firestore.collection('students').doc(sid).set(data);
    }

    const assertTest = async (name, uid, role, requestedBusId, expectedAllow) => {
        process.stdout.write(`[TEST] ${name}... `);
        try {
            const result = await executeAuthLogic(uid, role, requestedBusId);
            if (result.allowed === expectedAllow) {
                console.log('✅ PASS');
                passed++;
            } else {
                console.log(`❌ FAIL (Expected allowed=${expectedAllow}, got ${result.allowed})`);
                failed++;
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
            failed++;
        }
    };

    console.log('\n--- Running Test Cases ---\n');

    await assertTest('Admin views any bus (bus-1)', 'test-admin-123', 'admin', 'bus-1', true);
    await assertTest('Admin views any bus (bus-99)', 'test-admin-123', 'admin', 'bus-99', true);

    await assertTest('Driver views assigned bus (bus-1 === bus-1)', 'test-driver-1', 'driver', 'bus-1', true);
    await assertTest('Driver views assigned bus (String normalization: 1 === bus-1)', 'test-driver-1', 'driver', '1', true);
    await assertTest('Driver views unassigned bus (bus-1 !== bus-2)', 'test-driver-1', 'driver', 'bus-2', false);

    await assertTest('Parent (Single) views childs bus (bus-1)', 'test-parent-single', 'parent', 'bus-1', true);
    await assertTest('Parent (Single) views wrong bus (bus-2)', 'test-parent-single', 'parent', 'bus-2', false);

    await assertTest('Parent (Multi) views child-1 bus (bus-1)', 'test-parent-multi', 'parent', 'bus-1', true);
    await assertTest('Parent (Multi) views child-2 bus (bus-2)', 'test-parent-multi', 'parent', 'bus-2', true);
    await assertTest('Parent (Multi) views wrong bus (bus-3)', 'test-parent-multi', 'parent', 'bus-3', false);

    console.log('\n🧹 Cleaning up test environment...');
    for (const uid of Object.keys(testEnv.users)) {
        await firestore.collection('users').doc(uid).delete();
    }
    for (const sid of Object.keys(testEnv.students)) {
        await firestore.collection('students').doc(sid).delete();
    }

    console.log(`\n📊 Results: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runTests().catch(console.error);
