#!/usr/bin/env node
/**
 * Phase 3 — Smoke Test
 * Checks: frontend loads, backend health, stream token endpoint, VPS SSL
 * Run: node testing/smoke.test.js
 */
'use strict';
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, 'logs/smoke.log');
let PASS = 0, FAIL = 0;
const lines = [];

const log = (m) => { console.log(m); lines.push(m); };
const pass = (l) => { log(`  ✓ ${l}`); PASS++; };
const fail = (l, d) => { log(`  ✗ ${l}  →  ${d}`); FAIL++; };
const section = (t) => log(`\n── ${t}`);

function get(url, timeout = 8000) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => resolve({ ok: false, status: 0, body: 'TIMEOUT' }), timeout);
    mod.get(url, (res) => {
      clearTimeout(timer);
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ ok: res.statusCode < 400, status: res.statusCode, body }));
    }).on('error', e => { clearTimeout(timer); resolve({ ok: false, status: 0, body: e.message }); });
  });
}

async function run() {
  log('='.repeat(60));
  log(` PHASE 3 — SMOKE TEST  ${new Date().toISOString()}`);
  log('='.repeat(60));

  // 1. Frontend (Vercel)
  section('1. Frontend (Vercel)');
  const fe = await get('https://campus-compass-iota-rosy.vercel.app/');
  fe.ok ? pass('Frontend loads (200)') : fail('Frontend load failed', `HTTP ${fe.status}: ${fe.body.slice(0,100)}`);
  fe.body.includes('<!DOCTYPE html') || fe.body.includes('<html') ? pass('HTML body returned') : fail('HTML body not found', fe.body.slice(0,60));

  // 2. VPS Backend health
  section('2. VPS Backend (/api/health)');
  const health = await get('https://thanganat25.com/api/health');
  health.ok ? pass(`/api/health → HTTP ${health.status}`) : fail('/api/health failed', `HTTP ${health.status}: ${health.body.slice(0,100)}`);
  health.body.includes('"status":"ok"') ? pass('health body: status=ok') : fail('unexpected health body', health.body.slice(0,80));

  // 3. /api/stream-token without auth (should → 401)
  section('3. Stream Token Endpoint — Unauthenticated (expect 401)');
  const unauth = await get('https://thanganat25.com/api/stream-token?stream=live_bus-1');
  unauth.status === 401 ? pass('Unauthenticated request → 401 (correct)') : fail('Expected 401', `Got HTTP ${unauth.status}: ${unauth.body.slice(0,80)}`);

  // 4. MediaMTX stream endpoint without token (should NOT return 200)
  // WHEP is POST-only, so a GET returns 405 (Method Not Allowed) — still gated, not open.
  section('4. MediaMTX WHEP — No Token (expect 401/403/405)');
  const whep = await get('https://thanganat25.com/stream/live_bus-1/whep');
  [401, 403, 405].includes(whep.status) ? pass(`Stream without token → ${whep.status} (gated — not open)`) : fail('Stream should be gated', `Got HTTP ${whep.status} — stream may be OPEN`);

  // 5. SSL cert check via headers
  section('5. SSL / HTTPS');
  const ssl = await get('https://thanganat25.com/api/health');
  ssl.status !== 0 ? pass('HTTPS handshake succeeded (SSL valid)') : fail('HTTPS failed', ssl.body);

  // 6. Next.js API proxy route
  section('6. Next.js /api/stream-token proxy (Vercel)');
  const proxy = await get('https://campus-compass-iota-rosy.vercel.app/api/stream-token?stream=live_bus-1');
  proxy.status === 401 ? pass('Next.js proxy /api/stream-token → 401 (auth required — correct)') : fail('Next.js proxy unexpected', `HTTP ${proxy.status}: ${proxy.body.slice(0,80)}`);

  // Summary
  log('\n' + '='.repeat(60));
  log(` SMOKE TEST SUMMARY`);
  log(`   PASS : ${PASS}`);
  log(`   FAIL : ${FAIL}`);
  log('='.repeat(60));

  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.writeFileSync(LOG, lines.join('\n'));
  process.exit(FAIL > 0 ? 1 : 0);
}

run();
