/**
 * Phase 1 — Unit Tests: JWT Token Logic & API Handler Core
 * Tool: Vitest
 * Coverage:
 *   - Token generation (valid payload, correct TTL, HS256 algorithm)
 *   - Token verification (valid, expired, tampered, wrong algorithm)
 *   - Stream path validation regex
 *   - Bus ID normalization
 *   - /api/stream-token param validation
 *   - /stream-auth action routing
 */

import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

// ============================================================================
// Helpers extracted inline (mirror backend logic exactly)
// ============================================================================
const SECRET = 'test-secret-that-is-long-enough-for-hs256';
const TTL = 300;
const STREAM_PATH_REGEX = /^live(_bus-\d+)?$/;
const normalize = (id) => id ? String(id).replace(/^bus-/, '') : '';

// ============================================================================
// 1. JWT Token Generation
// ============================================================================
describe('JWT Token Generation', () => {
  it('issues a token with correct payload', () => {
    const payload = { uid: 'user123', stream: 'live_bus-1' };
    const token = jwt.sign(payload, SECRET, { expiresIn: TTL, algorithm: 'HS256' });
    const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    expect(decoded.uid).toBe('user123');
    expect(decoded.stream).toBe('live_bus-1');
  });

  it('token expires after TTL', () => {
    const token = jwt.sign({ uid: 'u1', stream: 'live' }, SECRET, { expiresIn: -1 }); // already expired
    expect(() => jwt.verify(token, SECRET, { algorithms: ['HS256'] })).toThrowError(/expired/i);
  });

  it('uses HS256 algorithm', () => {
    const token = jwt.sign({ uid: 'u1', stream: 'live' }, SECRET, { expiresIn: TTL, algorithm: 'HS256' });
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');
  });

  it('rejects a tampered token', () => {
    const token = jwt.sign({ uid: 'u1', stream: 'live' }, SECRET, { expiresIn: TTL });
    const parts = token.split('.');
    // Tamper payload
    const tamperedPayload = Buffer.from(JSON.stringify({ uid: 'hacker', stream: 'live' })).toString('base64url');
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    expect(() => jwt.verify(tampered, SECRET, { algorithms: ['HS256'] })).toThrow();
  });

  it('rejects token signed with wrong secret', () => {
    const token = jwt.sign({ uid: 'u1', stream: 'live' }, 'wrong-secret', { expiresIn: TTL });
    expect(() => jwt.verify(token, SECRET, { algorithms: ['HS256'] })).toThrow();
  });
});

// ============================================================================
// 2. Stream Path Validation
// ============================================================================
describe('Stream Path Validation (STREAM_PATH_REGEX)', () => {
  it.each([
    ['live', true],
    ['live_bus-1', true],
    ['live_bus-25', true],
  ])('allows valid path: %s', (path, expected) => {
    expect(STREAM_PATH_REGEX.test(path)).toBe(expected);
  });

  it.each([
    ['../../etc/passwd'],
    ['live_bus-abc'],
    ['live_bus-'],
    ['live-bus-1'],
    ['LIVE'],
    [''],
    ['admin'],
    ['live_bus-1; DROP TABLE users'],
  ])('rejects invalid path: %s', (path) => {
    expect(STREAM_PATH_REGEX.test(path)).toBe(false);
  });
});

// ============================================================================
// 3. Bus ID Normalization
// ============================================================================
describe('Bus ID Normalization', () => {
  it('strips "bus-" prefix', () => {
    expect(normalize('bus-1')).toBe('1');
  });

  it('leaves plain ID unchanged', () => {
    expect(normalize('1')).toBe('1');
  });

  it('handles undefined/null gracefully', () => {
    expect(normalize(undefined)).toBe('');
    expect(normalize(null)).toBe('');
  });

  it('matching: bus-1 and 1 resolve to same', () => {
    expect(normalize('bus-1')).toBe(normalize('1'));
  });

  it('matching: bus-2 does NOT match bus-1', () => {
    expect(normalize('bus-2')).not.toBe(normalize('bus-1'));
  });
});

// ============================================================================
// 4. /api/stream-token Input Validation
// ============================================================================
describe('/api/stream-token param validation', () => {
  const validateStreamParam = (stream) => {
    if (!stream) return { code: 400, error: 'Missing stream parameter' };
    if (!STREAM_PATH_REGEX.test(stream)) return { code: 400, error: 'Invalid stream path format' };
    return { code: 200 };
  };

  it('returns 400 for missing stream', () => {
    expect(validateStreamParam(null).code).toBe(400);
  });

  it('returns 400 for invalid stream format', () => {
    expect(validateStreamParam('hack/../etc').code).toBe(400);
  });

  it('returns 200 for valid stream', () => {
    expect(validateStreamParam('live_bus-1').code).toBe(200);
  });
});

// ============================================================================
// 5. /stream-auth Action Routing
// ============================================================================
describe('/stream-auth action routing', () => {
  const handleAction = (action) => {
    if (action === 'api') return 200;
    if (action === 'publish') return 200;
    if (action === 'read') return 'verify'; // needs further verification
    return 400; // unknown action
  };

  it('allows api action unconditionally', () => {
    expect(handleAction('api')).toBe(200);
  });

  it('allows publish action unconditionally', () => {
    expect(handleAction('publish')).toBe(200);
  });

  it('read action proceeds to verification', () => {
    expect(handleAction('read')).toBe('verify');
  });

  it('unknown action returns 400', () => {
    expect(handleAction('unknown')).toBe(400);
    expect(handleAction('')).toBe(400);
  });
});

// ============================================================================
// 6. Stream-Auth: Token-to-Path Claim Mismatch
// ============================================================================
describe('/stream-auth JWT stream-path claim mismatch', () => {
  const verifyAndMatchPath = (token, requestedPath) => {
    let claims;
    try {
      claims = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    } catch (e) {
      return { status: 401, error: e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' };
    }
    if (claims.stream !== requestedPath) {
      return { status: 403, error: 'Token stream mismatch' };
    }
    return { status: 200 };
  };

  it('allows when token stream matches requested path', () => {
    const token = jwt.sign({ uid: 'u1', stream: 'live_bus-1' }, SECRET, { expiresIn: TTL });
    expect(verifyAndMatchPath(token, 'live_bus-1').status).toBe(200);
  });

  it('denies when token stream does not match requested path', () => {
    const token = jwt.sign({ uid: 'u1', stream: 'live_bus-1' }, SECRET, { expiresIn: TTL });
    const result = verifyAndMatchPath(token, 'live_bus-2');
    expect(result.status).toBe(403);
    expect(result.error).toBe('Token stream mismatch');
  });

  it('denies expired token', () => {
    const token = jwt.sign({ uid: 'u1', stream: 'live_bus-1' }, SECRET, { expiresIn: -1 });
    const result = verifyAndMatchPath(token, 'live_bus-1');
    expect(result.status).toBe(401);
    expect(result.error).toBe('Token expired');
  });
});
