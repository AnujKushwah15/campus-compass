#!/usr/bin/env node
/**
 * Phase 1 — Unit Tests (plain Node.js, no build tool, instant startup)
 * Runs: node testing/unit/run_unit_tests.js
 * Output: testing/logs/unit.log
 */

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // built-in — no install needed

// ─── Minimal JWT implementation (HS256 only) ─────────────────────────────────
const b64u = (s) => Buffer.from(s).toString('base64url');
const b64uParse = (s) => JSON.parse(Buffer.from(s, 'base64url').toString());

const jwt = {
  sign(payload, secret, { expiresIn = 300 } = {}) {
    const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + expiresIn }));
    const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  },
  verify(token, secret) {
    const [h, p, sig] = token.split('.');
    if (!h || !p || !sig) throw Object.assign(new Error('Invalid token'), { name: 'JsonWebTokenError' });
    const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
    if (expected !== sig) throw Object.assign(new Error('invalid signature'), { name: 'JsonWebTokenError' });
    const claims = b64uParse(p);
    if (claims.exp < Math.floor(Date.now() / 1000)) throw Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
    return claims;
  }
};

const LOG_FILE = path.join(__dirname, '../logs/unit.log');
const lines = [];
let PASS = 0, FAIL = 0;

const log = (msg) => { console.log(msg); lines.push(msg); };

function pass(label) { log(`  ✓ ${label}`); PASS++; }
function fail(label, detail) { log(`  ✗ ${label}\n    → ${detail}`); FAIL++; }
function section(title) { log(`\n── ${title}`); }

// ─── Mirror of backend logic ─────────────────────────────────────────────────
const SECRET = 'test-secret-long-enough-for-hs256-testing';
const TTL = 300;
const STREAM_PATH_REGEX = /^live(_bus-\d+)?$/;
const normalize = (id) => id ? String(id).replace(/^bus-/, '') : '';

log('='.repeat(60));
log(' PHASE 1 — UNIT TESTS  ' + new Date().toISOString());
log('='.repeat(60));

// ─── 1. JWT Generation ────────────────────────────────────────────────────────
section('1. JWT Token Generation');
try {
  const tok = jwt.sign({ uid: 'u1', stream: 'live_bus-1' }, SECRET, { expiresIn: TTL, algorithm: 'HS256' });
  const dec = jwt.verify(tok, SECRET, { algorithms: ['HS256'] });
  dec.uid === 'u1' && dec.stream === 'live_bus-1' ? pass('payload roundtrips correctly') : fail('payload roundtrip', JSON.stringify(dec));
} catch(e) { fail('sign+verify threw', e.message); }

try {
  const tok = jwt.sign({ uid: 'u1' }, SECRET, { expiresIn: TTL, algorithm: 'HS256' });
  const hdr = JSON.parse(Buffer.from(tok.split('.')[0], 'base64url').toString());
  hdr.alg === 'HS256' ? pass('algorithm is HS256') : fail('algorithm is HS256', hdr.alg);
} catch(e) { fail('algorithm check threw', e.message); }

try {
  const tok = jwt.sign({ uid: 'u1' }, SECRET, { expiresIn: -1 });
  jwt.verify(tok, SECRET);
  fail('expired token should throw', 'no error thrown');
} catch(e) { e.name === 'TokenExpiredError' ? pass('expired token throws TokenExpiredError') : fail('wrong error type', e.name); }

try {
  const tok = jwt.sign({ uid: 'u1', stream: 'live' }, SECRET, { expiresIn: TTL });
  const parts = tok.split('.');
  const bad = `${parts[0]}.${Buffer.from('{"uid":"hacker"}').toString('base64url')}.${parts[2]}`;
  jwt.verify(bad, SECRET);
  fail('tampered token should throw', 'no error thrown');
} catch(e) { pass('tampered token is rejected'); }

try {
  const tok = jwt.sign({ uid: 'u1' }, 'wrong-secret', { expiresIn: TTL });
  jwt.verify(tok, SECRET);
  fail('wrong secret should throw', 'no error thrown');
} catch(e) { pass('token with wrong secret is rejected'); }

// ─── 2. Stream Path Validation ────────────────────────────────────────────────
section('2. Stream Path Validation');
const validPaths   = ['live', 'live_bus-1', 'live_bus-25'];
const invalidPaths = ['../../etc/passwd', 'live_bus-abc', 'live_bus-', 'live-bus-1', 'LIVE', '', 'admin', 'live_bus-1; DROP TABLE users'];

validPaths.forEach(p => {
  STREAM_PATH_REGEX.test(p) ? pass(`valid path accepted: "${p}"`) : fail(`valid path rejected: "${p}"`, 'regex returned false');
});
invalidPaths.forEach(p => {
  !STREAM_PATH_REGEX.test(p) ? pass(`invalid path rejected: "${p}"`) : fail(`invalid path allowed: "${p}"`, 'regex returned true — SECURITY RISK');
});

// ─── 3. Bus ID Normalization ──────────────────────────────────────────────────
section('3. Bus ID Normalization');
normalize('bus-1') === '1' ? pass('strips "bus-" prefix') : fail('strip prefix', normalize('bus-1'));
normalize('1') === '1' ? pass('leaves plain ID unchanged') : fail('plain ID', normalize('1'));
normalize(undefined) === '' ? pass('handles undefined') : fail('undefined', normalize(undefined));
normalize(null) === '' ? pass('handles null') : fail('null', normalize(null));
normalize('bus-1') === normalize('1') ? pass('bus-1 and 1 resolve to same') : fail('cross-match', `${normalize('bus-1')} vs ${normalize('1')}`);
normalize('bus-2') !== normalize('bus-1') ? pass('bus-2 does NOT match bus-1') : fail('mismatch check', 'they matched when they shouldnt');

// ─── 4. /api/stream-token Param Validation ────────────────────────────────────
section('4. /api/stream-token param validation');
const validateStream = (s) => {
  if (!s) return 400;
  if (!STREAM_PATH_REGEX.test(s)) return 400;
  return 200;
};
validateStream(null) === 400 ? pass('null stream → 400') : fail('null stream', 'expected 400');
validateStream('') === 400 ? pass('empty stream → 400') : fail('empty stream', 'expected 400');
validateStream('../etc') === 400 ? pass('path traversal → 400') : fail('path traversal', 'expected 400 — SECURITY RISK');
validateStream('live_bus-1') === 200 ? pass('valid stream → 200') : fail('valid stream', 'expected 200');

// ─── 5. /stream-auth Action Routing ──────────────────────────────────────────
section('5. /stream-auth action routing');
const route = (action) => {
  if (action === 'api')     return 200;
  if (action === 'publish') return 200;
  if (action === 'read')    return 'verify';
  return 400;
};
route('api') === 200 ? pass('"api" action → 200') : fail('"api"', route('api'));
route('publish') === 200 ? pass('"publish" action → 200') : fail('"publish"', route('publish'));
route('read') === 'verify' ? pass('"read" action → proceeds to verify') : fail('"read"', route('read'));
route('unknown') === 400 ? pass('"unknown" action → 400') : fail('"unknown"', route('unknown'));

// ─── 6. JWT Stream-Path Claim Mismatch ───────────────────────────────────────
section('6. /stream-auth JWT stream-path mismatch');
const verifyAndMatch = (token, requestedPath) => {
  let claims;
  try { claims = jwt.verify(token, SECRET, { algorithms: ['HS256'] }); }
  catch(e) { return { status: 401, err: e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' }; }
  if (claims.stream !== requestedPath) return { status: 403, err: 'Token stream mismatch' };
  return { status: 200 };
};

const tok1 = jwt.sign({ uid: 'u1', stream: 'live_bus-1' }, SECRET, { expiresIn: TTL });
verifyAndMatch(tok1, 'live_bus-1').status === 200 ? pass('matching stream → 200') : fail('matching stream', '200 expected');
const r = verifyAndMatch(tok1, 'live_bus-2');
(r.status === 403 && r.err === 'Token stream mismatch') ? pass('mismatched stream → 403 Token stream mismatch') : fail('mismatch', JSON.stringify(r));
const expTok = jwt.sign({ uid: 'u1', stream: 'live_bus-1' }, SECRET, { expiresIn: -1 });
const re = verifyAndMatch(expTok, 'live_bus-1');
(re.status === 401 && re.err === 'Token expired') ? pass('expired token → 401 Token expired') : fail('expired', JSON.stringify(re));

// ─── Summary ─────────────────────────────────────────────────────────────────
log('\n' + '='.repeat(60));
log(` UNIT TEST SUMMARY`);
log(`   PASS : ${PASS}`);
log(`   FAIL : ${FAIL}`);
log(`   TOTAL: ${PASS + FAIL}`);
log('='.repeat(60));

// Write log file
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
fs.writeFileSync(LOG_FILE, lines.join('\n'), 'utf8');

process.exit(FAIL > 0 ? 1 : 0);
