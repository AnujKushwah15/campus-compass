/**
 * Stream Auth Test Script
 * =======================
 * Tests JWT generation/verification and role-based access logic locally.
 * Run: cd backend && npm test
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.STREAM_JWT_SECRET || 'campus-compass-stream-secret-CHANGE-ME';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.log(`  ❌ ${message}`);
        failed++;
    }
}

console.log('\n═══════════════════════════════════════════');
console.log('  Campus Compass — Stream Auth Tests');
console.log('═══════════════════════════════════════════\n');

// ─── Test 1: JWT Generation ─────────────────────────────────────────────────
console.log('1. JWT Generation');
const token = jwt.sign(
    { uid: 'test-user', role: 'parent', busId: 'bus-1', type: 'stream_access' },
    JWT_SECRET,
    { expiresIn: '10m' }
);
assert(typeof token === 'string' && token.length > 50, 'Token generated successfully');

// ─── Test 2: JWT Verification ───────────────────────────────────────────────
console.log('\n2. JWT Verification');
const decoded = jwt.verify(token, JWT_SECRET);
assert(decoded.uid === 'test-user', 'UID matches');
assert(decoded.role === 'parent', 'Role matches');
assert(decoded.busId === 'bus-1', 'BusId matches');
assert(decoded.type === 'stream_access', 'Token type matches');
assert(decoded.exp > Date.now() / 1000, 'Token not expired');

// ─── Test 3: Expired Token Rejection ────────────────────────────────────────
console.log('\n3. Expired Token');
const expiredToken = jwt.sign(
    { uid: 'test-user', role: 'parent', busId: 'bus-1' },
    JWT_SECRET,
    { expiresIn: '0s' }
);
// Wait a tick for expiry
setTimeout(() => {
    try {
        jwt.verify(expiredToken, JWT_SECRET);
        assert(false, 'Should have rejected expired token');
    } catch (err) {
        assert(err.name === 'TokenExpiredError', 'Expired token correctly rejected');
    }

    // ─── Test 4: Wrong Secret Rejection ─────────────────────────────────
    console.log('\n4. Invalid Secret');
    try {
        jwt.verify(token, 'wrong-secret');
        assert(false, 'Should have rejected invalid secret');
    } catch (err) {
        assert(err.name === 'JsonWebTokenError', 'Invalid secret correctly rejected');
    }

    // ─── Test 5: Path Matching Logic ────────────────────────────────────
    console.log('\n5. Path Matching');
    const decodedForPath = jwt.verify(token, JWT_SECRET);
    const expectedPath = `live_${decodedForPath.busId}`;
    assert(expectedPath === 'live_bus-1', 'Path correctly constructed');
    assert(expectedPath !== 'live_bus-2', 'Mismatched path correctly detected');

    // ─── Test 6: Role-Based Access Logic ────────────────────────────────
    console.log('\n6. Role-Based Access Logic');

    function checkAccess(role, userBusId, requestedBusId) {
        if (role === 'admin') return true;
        if (role === 'driver' || role === 'parent') return userBusId === requestedBusId;
        return false;
    }

    assert(checkAccess('admin', null, 'bus-5') === true, 'Admin can access any bus');
    assert(checkAccess('parent', 'bus-1', 'bus-1') === true, 'Parent can access own child bus');
    assert(checkAccess('parent', 'bus-1', 'bus-2') === false, 'Parent cannot access other bus');
    assert(checkAccess('driver', 'bus-1', 'bus-1') === true, 'Driver can access assigned bus');
    assert(checkAccess('driver', 'bus-1', 'bus-2') === false, 'Driver cannot access other bus');
    assert(checkAccess('student', 'bus-1', 'bus-1') === false, 'Unknown role denied');

    // ─── Summary ────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);

}, 100);
