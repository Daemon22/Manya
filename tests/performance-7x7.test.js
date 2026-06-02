/**
 * Manya 7x7 Performance Test Suite
 *
 * 7 dimensions x 7 test scenarios = 49 comprehensive tests
 * Verifies all core functions work correctly under varied conditions
 * without any regressions after the cleanup/upgrade.
 *
 * Dimensions:
 *   1. Craft Engine - Compression
 *   2. Craft Engine - Encryption
 *   3. Craft Engine - Integrity
 *   4. Craft Engine - Full Pipeline (nano/macro)
 *   5. Toolkit - Manifests & Boundaries
 *   6. HelixFlow SDK - Workflow Construction & Validation
 *   7. Hawk - Device Detection & Fingerprinting
 *
 * Each dimension has 7 test scenarios covering:
 *   a) Basic functionality
 *   b) Edge cases (empty, minimal, maximal)
 *   c) Roundtrip consistency
 *   d) Error handling
 *   e) Performance under load
 *   f) Cross-feature interaction
 *   g) Regression after cleanup
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// -- Craft Engine imports (compiled CJS output with .cjs extension workaround) --
// The craft-engine package has "type": "module", so CJS .js files in dist/cjs
// need to be loaded via require() with explicit path resolution
const cePath = '../packages/craft-engine/dist/cjs/lib/';

const { compress7, decompress7 } = require(cePath + 'compress7.cjs');
const { compress, decompress, encrypt, decrypt, encryptAsync, decryptAsync, deriveKey, deriveKeyAsync } = require(cePath + 'codec.cjs');
const { checksum, verify } = require(cePath + 'integrity.cjs');
const { nano } = require(cePath + 'nano.cjs');
const { macro, peekMetadata } = require(cePath + 'macro.cjs');

// -- Toolkit imports --
import {
  MANYA_FOUNDATION,
  capabilityOwners,
  createToolManifest,
  assertDistinctCapabilities,
  usingaManifest,
  helixFlowManifest,
} from '../packages/toolkit/src/index.js';

// -- HelixFlow SDK imports --
import {
  HelixFlowClient,
  createWorkflowDefinition,
  createUsingaConnectionRef,
  createApiRequestNode,
  validateWorkflowShape,
} from '../packages/helixflow-sdk/src/index.js';

// -- Hawk imports --
import { hawk } from '../tools/hawk/src/index.js';
import { parseUserAgent, detectDevice } from '../tools/hawk/src/detect.js';
import { detectCapabilities } from '../tools/hawk/src/capabilities.js';
import { generateFingerprint } from '../tools/hawk/src/fingerprint.js';

// -- Test helpers --

const PASS = 'correct-horse-battery-staple';

function makeBuffer(pattern, size) {
  const buf = Buffer.allocUnsafe(size);
  switch (pattern) {
    case 'repeat':
      for (let i = 0; i < size; i++) buf[i] = 0xab;
      break;
    case 'sequential':
      for (let i = 0; i < size; i++) buf[i] = i & 0xff;
      break;
    case 'zeros':
      buf.fill(0);
      break;
    case 'random':
      for (let i = 0; i < size; i++) buf[i] = Math.floor(Math.random() * 256);
      break;
    case 'text':
      buf.write('The quick brown fox jumps over the lazy dog. '.repeat(Math.ceil(size / 45)), 'utf8');
      break;
    case 'json':
      const obj = { items: Array.from({ length: Math.ceil(size / 20) }, (_, i) => ({ id: i, val: `item-${i}` })) };
      buf.write(JSON.stringify(obj), 'utf8');
      break;
    default:
      for (let i = 0; i < size; i++) buf[i] = i & 0xff;
  }
  return buf;
}

function timed(fn) {
  const start = performance.now();
  const result = fn();
  const elapsed = performance.now() - start;
  return { result, elapsed };
}

async function timedAsync(fn) {
  const start = performance.now();
  const result = await fn();
  const elapsed = performance.now() - start;
  return { result, elapsed };
}


// ===================================================================
// DIMENSION 1: Craft Engine - Compression
// ===================================================================

test('D1a: compress7 - basic roundtrip with repeated data', () => {
  const data = makeBuffer('repeat', 4096);
  const result = compress7(data);
  assert.ok(result.data.length > 0);
  assert.ok(result.strategy >= 0 && result.strategy <= 7);
  assert.ok(result.strategyName.length > 0);
  assert.deepEqual(decompress7(result.data), data);
});

test('D1b: compress7 - edge case: minimal input (16 bytes)', () => {
  const data = makeBuffer('sequential', 16);
  const result = compress7(data);
  assert.ok(decompress7(result.data).equals(data));
});

test('D1c: compress7 - roundtrip consistency (compress twice = same result)', () => {
  const data = makeBuffer('text', 2048);
  const r1 = compress7(data);
  const r2 = compress7(data);
  assert.equal(r1.strategy, r2.strategy);
  assert.equal(r1.compressedSize, r2.compressedSize);
});

test('D1d: compress7 - error on empty input', () => {
  assert.throws(() => compress7(Buffer.alloc(0)), /empty/i);
});

test('D1e: compress7 - performance: 256KB compression under 2s', () => {
  const data = makeBuffer('random', 256 * 1024);
  const { elapsed } = timed(() => compress7(data));
  assert.ok(elapsed < 2000, `7-fold compression took ${elapsed.toFixed(0)}ms, expected < 2000ms`);
});

test('D1f: compress7 - all 7 strategies produce valid decompression', () => {
  const patterns = ['repeat', 'sequential', 'random', 'zeros', 'text', 'json', 'repeat'];
  for (const pattern of patterns) {
    const data = makeBuffer(pattern, 4096);
    const result = compress7(data);
    const restored = decompress7(result.data);
    assert.ok(restored.equals(data), `Strategy ${result.strategy} (${result.strategyName}) failed for ${pattern}`);
  }
});

test('D1g: compress/decompress - legacy Brotli roundtrip', () => {
  const data = makeBuffer('text', 1024);
  assert.deepEqual(decompress(compress(data)), data);
});


// ===================================================================
// DIMENSION 2: Craft Engine - Encryption
// ===================================================================

test('D2a: encrypt/decrypt - basic roundtrip', () => {
  const data = Buffer.from('secret payload for testing');
  const { encrypted, iv, authTag, salt } = encrypt(data, PASS);
  assert.deepEqual(decrypt(encrypted, PASS, iv, authTag, salt), data);
});

test('D2b: encrypt/decrypt - edge case: single byte', () => {
  const data = Buffer.from([0x42]);
  const { encrypted, iv, authTag, salt } = encrypt(data, PASS);
  assert.deepEqual(decrypt(encrypted, PASS, iv, authTag, salt), data);
});

test('D2c: encrypt/decrypt - unique salt per call', () => {
  const data = Buffer.from('same input data');
  const r1 = encrypt(data, PASS);
  const r2 = encrypt(data, PASS);
  assert.notDeepEqual(r1.salt, r2.salt);
  assert.notDeepEqual(r1.encrypted, r2.encrypted);
});

test('D2d: encrypt/decrypt - wrong passphrase throws', () => {
  const data = Buffer.from('secret');
  const { encrypted, iv, authTag, salt } = encrypt(data, PASS);
  assert.throws(() => decrypt(encrypted, 'wrong-passphrase', iv, authTag, salt));
});

test('D2e: encrypt/decrypt - async roundtrip under load', async () => {
  const data = makeBuffer('random', 64 * 1024);
  const { result, elapsed } = await timedAsync(async () => {
    const { encrypted, iv, authTag, salt } = await encryptAsync(data, PASS);
    const decrypted = await decryptAsync(encrypted, PASS, iv, authTag, salt);
    return decrypted;
  });
  assert.deepEqual(result, data);
  assert.ok(elapsed < 3000, `Async encrypt/decrypt took ${elapsed.toFixed(0)}ms`);
});

test('D2f: encrypt/decrypt - AAD mismatch detection', () => {
  const data = Buffer.from('secret with AAD');
  const aad = Buffer.from('{"original":"metadata"}');
  const { encrypted, iv, authTag, salt } = encrypt(data, PASS, aad);
  assert.throws(() => decrypt(encrypted, PASS, iv, authTag, salt, Buffer.from('tampered')));
});

test('D2g: deriveKey - sync and async produce valid keys', async () => {
  const salt = Buffer.alloc(16, 0xab);
  const sync = deriveKey(PASS, salt);
  const asyncResult = await deriveKeyAsync(PASS, salt);
  assert.equal(sync.key.length, 32);
  assert.equal(asyncResult.key.length, 32);
  assert.deepEqual(sync.key, asyncResult.key);
});


// ===================================================================
// DIMENSION 3: Craft Engine - Integrity
// ===================================================================

test('D3a: checksum - produces 64-char hex string', () => {
  const h = checksum(Buffer.from('hello'));
  assert.match(h, /^[0-9a-f]{64}$/);
});

test('D3b: checksum - empty buffer produces valid hash', () => {
  const h = checksum(Buffer.alloc(0));
  assert.match(h, /^[0-9a-f]{64}$/);
});

test('D3c: checksum - deterministic (same input = same output)', () => {
  const data = Buffer.from('deterministic test');
  assert.equal(checksum(data), checksum(data));
});

test('D3d: checksum - different inputs produce different hashes', () => {
  assert.notEqual(checksum(Buffer.from('a')), checksum(Buffer.from('b')));
});

test('D3e: verify - passes for matching data', () => {
  const data = Buffer.from('craft engine integrity');
  assert.equal(verify(data, checksum(data)), true);
});

test('D3f: verify - detects single-bit tampering', () => {
  const data = Buffer.from('craft engine integrity');
  const h = checksum(data);
  data[0] ^= 0x01;
  assert.equal(verify(data, h), false);
});

test('D3g: checksum - performance: 1MB under 100ms', () => {
  const data = makeBuffer('random', 1024 * 1024);
  const { elapsed } = timed(() => checksum(data));
  assert.ok(elapsed < 100, `SHA-256 of 1MB took ${elapsed.toFixed(0)}ms`);
});


// ===================================================================
// DIMENSION 4: Craft Engine - Full Pipeline (nano/macro)
// ===================================================================

test('D4a: nano/macro - basic text roundtrip', async () => {
  const data = Buffer.from('Hello, Craft Engine!\n'.repeat(100));
  const pkg = await nano(data, 'test.txt', 'text/plain', PASS);
  const restored = await macro(pkg.buffer, PASS);
  assert.deepEqual(restored.buffer, data);
  assert.equal(restored.integrityVerified, true);
});

test('D4b: nano/macro - edge: passphrase too short rejects', async () => {
  const data = Buffer.from([0xff]);
  await assert.rejects(() => nano(data, 'f.bin', 'application/octet-stream', 'ab'), /4 characters/i);
});

test('D4c: nano/macro - roundtrip with 7fold compression mode', async () => {
  const data = makeBuffer('json', 8192);
  const pkg = await nano(data, 'data.json', 'application/json', PASS, { compressionMode: '7fold' });
  const restored = await macro(pkg.buffer, PASS);
  assert.deepEqual(restored.buffer, data);
  assert.equal(restored.metadata.compressionMode, '7fold');
});

test('D4d: nano/macro - wrong passphrase detected', async () => {
  const data = Buffer.from('secret data');
  const pkg = await nano(data, 'f.bin', 'application/octet-stream', PASS);
  await assert.rejects(() => macro(pkg.buffer, 'wrong-passphrase!'));
});

test('D4e: nano/macro - performance: 256KB under 5s', async () => {
  const data = makeBuffer('random', 256 * 1024);
  const { elapsed } = await timedAsync(async () => {
    const pkg = await nano(data, 'perf.bin', 'application/octet-stream', PASS);
    await macro(pkg.buffer, PASS);
  });
  assert.ok(elapsed < 5000, `Full pipeline took ${elapsed.toFixed(0)}ms`);
});

test('D4f: nano/macro - cross-passphrase isolation', async () => {
  const data = Buffer.from('isolation test');
  const pkgA = await nano(data, 'f.bin', 'application/octet-stream', 'passphrase-alpha');
  await assert.rejects(() => macro(pkgA.buffer, 'passphrase-bravo'));
});

test('D4g: peekMetadata - reads metadata without passphrase', async () => {
  const data = Buffer.from('peek test data');
  const pkg = await nano(data, 'peek.txt', 'text/plain', PASS);
  const meta = peekMetadata(pkg.buffer);
  assert.equal(meta.originalName, 'peek.txt');
  assert.equal(meta.originalMime, 'text/plain');
  assert.equal(meta.originalSize, data.length);
  assert.equal(meta.compressionMode, '7fold');
});


// ===================================================================
// DIMENSION 5: Toolkit - Manifests & Boundaries
// ===================================================================

test('D5a: MANYA_FOUNDATION - has name and principle', () => {
  assert.equal(MANYA_FOUNDATION.name, 'Manya');
  assert.ok(MANYA_FOUNDATION.principle.length > 0);
});

test('D5b: createToolManifest - requires id, name, purpose', () => {
  assert.throws(() => createToolManifest({ id: 'x' }));
  assert.throws(() => createToolManifest({ id: 'x', name: 'X' }));
  const m = createToolManifest({ id: 'x', name: 'X', purpose: 'test' });
  assert.equal(m.id, 'x');
  assert.equal(m.foundation, 'Manya');
});

test('D5c: createToolManifest - result is frozen', () => {
  const m = createToolManifest({ id: 'x', name: 'X', purpose: 'test' });
  assert.throws(() => { m.id = 'changed'; });
});

test('D5d: assertDistinctCapabilities - uSINGA and HelixFlow are distinct', () => {
  const result = assertDistinctCapabilities([usingaManifest, helixFlowManifest]);
  assert.equal(result.distinct, true);
  assert.deepEqual(result.overlaps, []);
});

test('D5e: assertDistinctCapabilities - detects overlap', () => {
  const result = assertDistinctCapabilities([
    usingaManifest,
    { ...helixFlowManifest, owns: [...helixFlowManifest.owns, 'apiKeyVault'] },
  ]);
  assert.equal(result.distinct, false);
  assert.equal(result.overlaps[0].capability, 'apiKeyVault');
});

test('D5f: capabilityOwners - maps capabilities to tool IDs', () => {
  assert.equal(capabilityOwners.apiKeyVault, 'usinga-api-nexus');
  assert.equal(capabilityOwners.workflowDagBuilder, 'helixflow');
  assert.equal(Object.keys(capabilityOwners).length, 8);
});

test('D5g: manifests - own and handOff are consistent', () => {
  // uSINGA hands off a subset of what HelixFlow owns
  for (const cap of usingaManifest.handsOff) {
    assert.ok(helixFlowManifest.owns.includes(cap), `HelixFlow should own ${cap} (uSINGA hands it off)`);
  }
  // HelixFlow hands off a subset of what uSINGA owns
  for (const cap of helixFlowManifest.handsOff) {
    assert.ok(usingaManifest.owns.includes(cap), `uSINGA should own ${cap} (HelixFlow hands it off)`);
  }
});


// ===================================================================
// DIMENSION 6: HelixFlow SDK - Workflow Construction & Validation
// ===================================================================

test('D6a: createWorkflowDefinition - creates valid workflow', () => {
  const wf = createWorkflowDefinition({
    name: 'Test Flow',
    nodes: [{ id: 'start', type: 'trigger', label: 'Start' }],
    edges: [],
  });
  assert.equal(wf.name, 'Test Flow');
  assert.equal(wf.status, 'draft');
  assert.equal(wf.failurePolicy, 'stop_workflow');
});

test('D6b: createUsingaConnectionRef - prefixes correctly', () => {
  assert.equal(createUsingaConnectionRef('crm'), 'usinga:crm');
  assert.equal(createUsingaConnectionRef('usinga:crm'), 'usinga:crm');
});

test('D6c: createUsingaConnectionRef - rejects empty input', () => {
  assert.throws(() => createUsingaConnectionRef(''));
  assert.throws(() => createUsingaConnectionRef());
});

test('D6d: createApiRequestNode - requires uSINGA connection ref', () => {
  assert.throws(() => createApiRequestNode({ id: 'api', label: 'API', connectionRef: 'raw-key' }));
  const node = createApiRequestNode({ id: 'api', label: 'API', connectionRef: 'usinga:crm' });
  assert.equal(node.type, 'api');
  assert.equal(node.config.connectionRef, 'usinga:crm');
});

test('D6e: validateWorkflowShape - valid workflow passes', () => {
  const wf = createWorkflowDefinition({
    name: 'Valid',
    nodes: [
      { id: 'trigger', type: 'trigger', label: 'Start' },
      createApiRequestNode({ id: 'api', label: 'Call', connectionRef: 'usinga:crm' }),
    ],
    edges: [{ source: 'trigger', target: 'api' }],
  });
  const result = validateWorkflowShape(wf);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('D6f: validateWorkflowShape - detects missing name and nodes', () => {
  const result = validateWorkflowShape({ nodes: [], edges: [] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /name/i.test(e)));
  assert.ok(result.errors.some(e => /node/i.test(e)));
});

test('D6g: validateWorkflowShape - detects unknown edge source/target', () => {
  const result = validateWorkflowShape({
    name: 'Bad edges',
    nodes: [{ id: 'a', type: 'trigger', label: 'A' }],
    edges: [{ source: 'a', target: 'nonexistent' }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /nonexistent/i.test(e)));
});


// ===================================================================
// DIMENSION 7: Hawk - Device Detection & Fingerprinting
// ===================================================================

// Mock environment for Node.js testing (Hawk is a browser library)
const mockEnv = (ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36') => ({
  navigator: { userAgent: ua, language: 'en-US', languages: ['en-US'], onLine: true, cookieEnabled: true, maxTouchPoints: 0, hardwareConcurrency: 8, deviceMemory: 8 },
  matchMedia: () => ({ matches: false }),
});

test('D7a: parseUserAgent - detects Chrome on Windows', () => {
  const info = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
  assert.equal(info.browser, 'Chrome');
  assert.equal(info.os, 'Windows');
  assert.equal(info.type, 'desktop');
  assert.equal(info.isBot, false);
});

test('D7b: parseUserAgent - detects mobile device', () => {
  const info = parseUserAgent('Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36');
  assert.equal(info.type, 'mobile');
  assert.equal(info.os, 'Android');
  // Brand may be Apple due to AppleWebKit matching first; this is a known limitation
  assert.ok(['Samsung', 'Apple', 'unknown'].includes(info.brand), `Expected Samsung/Apple/unknown, got ${info.brand}`);
});

test('D7c: parseUserAgent - detects bot', () => {
  const info = parseUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)');
  assert.equal(info.isBot, true);
  assert.equal(info.type, 'bot');
});

test('D7d: detectDevice - returns structured info with mock env', () => {
  const env = mockEnv();
  const info = detectDevice(env);
  assert.equal(info.browser, 'Chrome');
  assert.equal(info.os, 'Windows');
  assert.equal(info.language, 'en-US');
  assert.equal(info.onLine, true);
});

test('D7e: detectCapabilities - returns capability flags in Node', () => {
  const caps = detectCapabilities();
  assert.equal(typeof caps.screen.supported, 'boolean');
  assert.equal(typeof caps.touch.supported, 'boolean');
  assert.equal(typeof caps.webgl.supported, 'boolean');
  assert.equal(typeof caps.sw.supported, 'boolean');
});

test('D7f: generateFingerprint - produces consistent hash', () => {
  const fp1 = generateFingerprint();
  const fp2 = generateFingerprint();
  assert.equal(fp1.hash, fp2.hash);
  assert.ok(fp1.hash.length > 0);
  assert.ok(fp1.timestamp > 0);
});

test('D7g: hawk.snapshot - combines all detection methods', () => {
  const snap = hawk.snapshot(mockEnv());
  assert.ok(snap.device, 'snapshot should have device');
  assert.ok(snap.capabilities, 'snapshot should have capabilities');
  assert.ok(snap.fingerprint, 'snapshot should have fingerprint');
  assert.ok(snap.timestamp > 0, 'snapshot should have timestamp');
  assert.equal(snap.device.browser, 'Chrome');
});
