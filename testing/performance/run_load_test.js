#!/usr/bin/env node
/**
 * Phase 7 — Performance / Load Test
 * Tests: API response time, concurrent requests, stream endpoint under load
 * Run: node testing/performance/run_load_test.js
 * No external tools (k6/JMeter) — pure Node.js concurrent requests
 */
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

const REPORT = path.join(__dirname, '../reports/performance.json');
const LOG = path.join(__dirname, '../logs/performance.log');
const lines = [];
const log = (m) => { console.log(m); lines.push(m); };
const section = (t) => log(`\n── ${t}`);

const CONCURRENCY_LEVELS = [5, 10, 20];
const ENDPOINTS = [
  { name: '/api/health', url: 'https://thanganat25.com/api/health' },
  { name: '/api/stream-token (no auth)', url: 'https://thanganat25.com/api/stream-token?stream=live_bus-1' },
  { name: 'Vercel frontend', url: 'https://campus-compass-iota-rosy.vercel.app/' },
];

function timedGet(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    https.get(url, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, ms: Date.now() - start, ok: res.statusCode < 500 }));
    }).on('error', e => resolve({ status: 0, ms: Date.now() - start, ok: false, err: e.message }));
    // 10s timeout
    setTimeout(() => resolve({ status: 0, ms: 10000, ok: false, err: 'TIMEOUT' }), 10000);
  });
}

async function loadTest(endpoint, concurrency) {
  const promises = Array.from({ length: concurrency }, () => timedGet(endpoint.url));
  const results = await Promise.all(promises);
  const times = results.map(r => r.ms);
  const failures = results.filter(r => !r.ok).length;
  return {
    endpoint: endpoint.name,
    concurrency,
    min_ms: Math.min(...times),
    max_ms: Math.max(...times),
    avg_ms: Math.round(times.reduce((a,b) => a+b,0) / times.length),
    failures,
    failure_rate: `${((failures/concurrency)*100).toFixed(1)}%`
  };
}

async function run() {
  log('='.repeat(60));
  log(` PHASE 7 — PERFORMANCE / LOAD TEST  ${new Date().toISOString()}`);
  log('='.repeat(60));

  const allResults = [];

  for (const endpoint of ENDPOINTS) {
    section(`Endpoint: ${endpoint.name}`);
    for (const concurrency of CONCURRENCY_LEVELS) {
      log(`  Testing ${concurrency} concurrent requests...`);
      const result = await loadTest(endpoint, concurrency);
      allResults.push(result);
      log(`  [c=${concurrency}] avg=${result.avg_ms}ms  min=${result.min_ms}ms  max=${result.max_ms}ms  failures=${result.failures} (${result.failure_rate})`);
      if (result.failures > 0) log(`  ⚠ ${result.failures} failures at concurrency ${concurrency}`);
    }
  }

  // Summary table
  log('\n' + '='.repeat(60));
  log(' PERFORMANCE SUMMARY');
  log('='.repeat(60));
  log(` ${'Endpoint'.padEnd(35)} ${'c'.padStart(4)} ${'avg'.padStart(7)} ${'max'.padStart(7)} ${'fail%'.padStart(7)}`);
  log(' ' + '-'.repeat(58));
  allResults.forEach(r => {
    const status = r.failures > 0 ? '⚠' : '✓';
    log(` ${status} ${r.endpoint.padEnd(33)} ${String(r.concurrency).padStart(4)} ${String(r.avg_ms+'ms').padStart(7)} ${String(r.max_ms+'ms').padStart(7)} ${r.failure_rate.padStart(7)}`);
  });

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify({ generated: new Date().toISOString(), results: allResults }, null, 2));
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.writeFileSync(LOG, lines.join('\n'));
  log(`\nReport saved to: testing/reports/performance.json`);
}

run();
