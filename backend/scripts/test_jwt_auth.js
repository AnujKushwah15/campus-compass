/**
 * test_jwt_auth.js — JWT Stream Auth Test Suite
 * ================================================
 * Tests the /api/stream-token and /stream-auth endpoints
 * for all security scenarios defined in the implementation plan.
 *
 * Usage:
 *   STREAM_JWT_SECRET=<your-secret> node scripts/test_jwt_auth.js
 *
 * Or if the backend is running with /etc/campus-compass.env:
 *   source /etc/campus-compass.env && node scripts/test_jwt_auth.js
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const STREAM_JWT_SECRET = process.env.STREAM_JWT_SECRET;

if (!STREAM_JWT_SECRET) {
    console.error('❌ FATAL: STREAM_JWT_SECRET env var must be set');
    process.exit(1);
}

// ─── Helper: POST to /stream-auth ───────────────────────────────────────────
function callStreamAuth(token, path = 'live_bus-1') {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            action: 'read',
            path,
            query: token ? `token=${token}` : '',
            ip: '127.0.0.1',
            protocol: 'webrtc',
        });

        const url = new URL(`${BACKEND_URL}/stream-auth`);
        const options = {
            hostname: url.hostname,
            port: url.port || 3001,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', (e) => resolve({ status: 0, error: e.message }));
        req.write(body);
        req.end();
    });
}

// ─── Helper: POST to /stream-auth for publish (should always be 200) ────────
function callStreamAuthPublish() {
    return new Promise((resolve) => {
        const body = JSON.stringify({ action: 'publish', path: 'live', ip: '127.0.0.1', protocol: 'rtsp' });
        const url = new URL(`${BACKEND_URL}/stream-auth`);
        const options = {
            hostname: url.hostname, port: url.port || 3001,
            path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ status: res.statusCode }));
        });
        req.on('error', (e) => resolve({ status: 0, error: e.message }));
        req.write(body);
        req.end();
    });
}

// ─── Sign a token with arbitrary claims ─────────────────────────────────────
function signToken(payload, opts = {}) {
    return jwt.sign(payload, STREAM_JWT_SECRET, { algorithm: 'HS256', ...opts });
}

// ─── Run tests ───────────────────────────────────────────────────────────────
async function runTests() {
    console.log('🧪 JWT Stream Auth Test Suite\n');
    let passed = 0;
    let failed = 0;

    const assert = async (name, fn, expectedStatus) => {
        process.stdout.write(`[TEST] ${name}... `);
        try {
            const result = await fn();
            if (result.status === expectedStatus) {
                console.log(`✅ PASS (HTTP ${result.status})`);
                passed++;
            } else {
                console.log(`❌ FAIL — expected HTTP ${expectedStatus}, got ${result.status}`);
                if (result.body) console.log(`       body: ${JSON.stringify(result.body)}`);
                failed++;
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
            failed++;
        }
    };

    console.log('--- Security Tests ---\n');

    // Test 1: No token → 401
    await assert(
        'No token → 401 Unauthorized',
        () => callStreamAuth(null),
        401
    );

    // Test 2: Random garbage token → 401
    await assert(
        'Garbage token → 401 Unauthorized',
        () => callStreamAuth('not-a-jwt-at-all'),
        401
    );

    // Test 3: Expired token → 401
    const expiredToken = signToken(
        { uid: 'test-uid', stream: 'live_bus-1' },
        { expiresIn: -1 } // Already expired
    );
    await assert(
        'Expired JWT → 401 Unauthorized',
        () => callStreamAuth(expiredToken),
        401
    );

    // Test 4: Token signed with the WRONG secret → 401
    const wrongSecretToken = jwt.sign(
        { uid: 'test-uid', stream: 'live_bus-1' },
        'completely-wrong-secret',
        { algorithm: 'HS256', expiresIn: 60 }
    );
    await assert(
        'Wrong-secret JWT → 401 Unauthorized',
        () => callStreamAuth(wrongSecretToken),
        401
    );

    // Test 5: Valid JWT but WRONG stream claim (stream mismatch) → 403
    const mismatchToken = signToken(
        { uid: 'test-uid', stream: 'live_bus-2' }, // claims bus-2, but accessing bus-1
        { expiresIn: 60 }
    );
    await assert(
        'Stream-mismatch JWT (bus-2 token for bus-1 path) → 403 Forbidden',
        () => callStreamAuth(mismatchToken, 'live_bus-1'),
        403
    );

    // Test 6: Valid JWT, correct stream, user NOT in Firestore → 403
    const validTokenBadUser = signToken(
        { uid: 'non-existent-uid-xyz-12345', stream: 'live_bus-1' },
        { expiresIn: 60 }
    );
    await assert(
        'Valid JWT but user not in Firestore → 403 Forbidden',
        () => callStreamAuth(validTokenBadUser),
        403
    );

    console.log('\n--- Publisher Tests ---\n');

    // Test 7: Publish action always passes (bypassed in stream-auth)
    await assert(
        'Publisher (Pi) action → 200 OK (always allowed)',
        () => callStreamAuthPublish(),
        200
    );

    console.log('\n--- Backend Health ---\n');

    // Test 8: Health endpoint
    await assert(
        'GET /health → 200 OK',
        () => new Promise((resolve) => {
            http.get(`${BACKEND_URL}/health`, (res) => {
                resolve({ status: res.statusCode });
            }).on('error', (e) => resolve({ status: 0, error: e.message }));
        }),
        200
    );

    console.log(`\n📊 Results: ${passed} Passed / ${failed} Failed`);
    if (failed > 0) {
        console.log('\n⚠️  Some tests failed. Check that:');
        console.log('   1. Backend is running (systemctl status campus-compass)');
        console.log('   2. STREAM_JWT_SECRET matches what the backend uses');
        console.log('   3. Firestore is reachable from the backend');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    }
}

runTests().catch((e) => {
    console.error('Fatal test runner error:', e);
    process.exit(1);
});
