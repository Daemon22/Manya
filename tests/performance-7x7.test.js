/**
 * Manya 7x7 Performance Test Suite — v12
 *
 * 29 dimensions x 7 test scenarios = 203 comprehensive tests
 * Covering all core functions across the entire Manya ecosystem
 *
 * Dimensions:
 *   1-22. (existing tools)
 *  23. Unify - Federation, Event Bus, Mesh & Vocabularies
 *  24. CLI - Argument Parsing, Command Dispatch & Weave Generation
 *  25. Serve & Repl - HTTP Server + SSE Stream + Interactive Shell
 *  26. Lycon Browser - Privacy Browser Integration
 *  27. Lycon Deep Integration - Shield Intel, Identity Panel, Private Sessions
 *  28. Weaver Rules - Connection Rules Engine (canConnect, findPotentialConnections)
 *  29. UPMP - Activity Tracking, Stuck Points, Discoveries, Intelligence Engagement
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';

const require = createRequire(import.meta.url);

// -- Craft Engine imports (compiled ESM output) --
import { compress7, decompress7 } from '../packages/craft-engine/dist/esm/lib/compress7.js';
import { compress, decompress, encrypt, decrypt, encryptAsync, decryptAsync, deriveKey, deriveKeyAsync } from '../packages/craft-engine/dist/esm/lib/codec.js';
import { checksum, verify } from '../packages/craft-engine/dist/esm/lib/integrity.js';
import { nano } from '../packages/craft-engine/dist/esm/lib/nano.js';
import { macro, peekMetadata } from '../packages/craft-engine/dist/esm/lib/macro.js';
import { archive, extract, peekArchiveMetadata } from '../packages/craft-engine/dist/esm/lib/archive.js';
import { nanoStream, macroStream } from '../packages/craft-engine/dist/esm/lib/stream.js';
import { CompressionAnalytics } from '../packages/craft-engine/dist/esm/lib/analytics.js';

// -- Toolkit imports --
import {
  MANYA_FOUNDATION,
  capabilityOwners,
  createToolManifest,
  assertDistinctCapabilities,
  usingaManifest,
  helixFlowManifest,
  forgeManifest,
  craftEngineManifest,
  stampManifest,
  vaultManifest,
  lensManifest,
  shieldManifest,
  signalManifest,
  pulseManifest,
  primarySectorManifest,
  cybersecurityManifest,
  transportLogisticsManifest,
  researchAcademicManifest,
  unifyManifest,
  lyconManifest,
  upmpManifest,
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

// -- Forge imports --
import { scorePassphrase } from '../tools/forge/src/strength.js';
import { deriveKeyPair, deriveKeyPairAsync, rotateKey } from '../tools/forge/src/derive.js';
import { hash, hashWithSalt } from '../tools/forge/src/hash.js';
import { timingSafeEqual, timingSafeCompare } from '../tools/forge/src/timing.js';

// -- Stamp imports --
import { stamp as stampProof, verify as verifyStamp } from '../tools/stamp/src/stamp.js';
import { buildChain, verifyChain } from '../tools/stamp/src/chain.js';
import { audit as stampAudit, buildTrail, verifyTrail } from '../tools/stamp/src/audit.js';

// -- Vault imports --
import { create as vaultCreate, put as vaultPut, get as vaultGet, del as vaultDel, keys as vaultKeys, has as vaultHas, size as vaultSize, seal as vaultSeal, open as vaultOpen, inspect as vaultInspect, search as vaultSearch } from '../tools/vault/src/store.js';

// -- Lens imports --
import { detect as lensDetect } from '../tools/lens/src/detect.js';
import { redact, scan, PRESETS } from '../tools/lens/src/redact.js';
import { classify, profile, LEVELS } from '../tools/lens/src/classify.js';

// -- Shield imports --
import { createPolicy, defineRole, grant, revoke, registerSubject, assignRole, removeRole, checkAccess, addRule, getEffectivePermissions } from '../tools/shield/src/policy.js';
import { auditAccess, buildAuditTrail, verifyAuditTrail } from '../tools/shield/src/audit.js';

// -- Signal imports --
import { compose, seal as signalSeal, open as signalOpen, sign as signalSign, verifySignature, hmac as signalHmac, verifyHmac, generateSigningKeys } from '../tools/signal/src/envelope.js';

// -- Pulse imports --
import { getIndustry, listIndustries, createRedactionConfig, createIndustryPolicy, createAuditTemplate, createPreset, INDUSTRIES, INDUSTRY_IDS } from '../tools/pulse/src/index.js';

// -- Primary Sector imports --
import { getSector, listSectors, validateCoordinates, validateCommodity, validateSensorReading, validateProductionReport, createPreset as createSectorPreset, checkCompliance, SECTORS, SECTOR_IDS } from '../tools/primary-sector/src/index.js';

// -- Cybersecurity imports --
import { classifyThreat, createIOC, createCVEReference, calculateCVSS, createVulnerability, assessRisk, getFramework, createAssessment, createEvidence, verifyEvidenceIntegrity, validateChainOfCustody, createIncident, escalateIncident, classifyIncident } from '../tools/cybersecurity/src/index.js';

// -- Transport & Logistics imports --
import {
  validateAWB,
  validateIMO,
  validateContainerNumber,
  validateWagonNumber,
  validateFlightNumber,
  validateHSCode,
  validateTIRCarnet,
  validateCountryCode,
  createShipment,
  recordEvent,
  createGeofence,
  checkGeofence,
  estimateETA,
  lookupDangerousGood,
  createDangerousGoodsDeclaration,
  screenSanctions,
  createCustomsDeclaration,
  checkCompliance as checkTransportCompliance,
  listModes,
} from '../tools/transport-logistics/src/index.js';

// -- Research & Academic imports --
import {
  validateDOI,
  validateORCID,
  validateArxivID,
  validatePMID,
  validateNCT,
  validateROR,
  validateISBN13,
  createManifest,
  verifyManifest,
  assessFAIR,
  createSubmission,
  assignReviewer,
  recordReview,
  recordDecision,
  recordRevision,
  verifyReviewIntegrity,
  createDMP,
  listDomains,
  checkCompliance as checkResearchCompliance,
} from '../tools/research-academic/src/index.js';

// -- Unify imports --
import {
  registerTool,
  unregisterTool,
  listTools,
  route as routeCapability,
  dispatch,
  getSyncChannels,
  createIdentity,
  linkIdentity,
  resolveIdentity,
  mergeIdentities,
  createBus,
  subscribe,
  publish,
  routeEvent,
  busStats,
  translate,
  listTranslations,
  _resetMesh,
  _resetFederation,
} from '../tools/unify/src/index.js';

// -- CLI imports --
import { parseArgs, tryParseJson } from '../tools/cli/src/parser.js';
import { runCommand } from '../tools/cli/src/dispatcher.js';
import { generateWeaveHtml } from '../tools/cli/src/weave.js';
import { knownToolIds } from '../tools/cli/src/registry.js';
import { startServer } from '../tools/cli/src/serve.js';
import { startRepl } from '../tools/cli/src/repl.js';

// -- Lycon imports --
import {
  createAdapter as createLyconAdapter,
  createNavigationEvent,
  createShieldBlockedEvent,
  createBookmarkEvent,
  createDownloadEvent,
  LYCON_SYNC_CHANNELS,
  LYCON_CAPABILITIES,
} from '../tools/lycon-browser/manya/index.js';
import {
  createShieldIntelligence,
  createIdentityPanel,
  createPrivateSessionFactory,
} from '../tools/lycon-browser/manya/deep-integration.js';

// -- Weaver Rules imports --
import {
  canConnect,
  findPotentialConnections,
  buildContext as buildWeaverContext,
  getTypeToToolMap,
} from '../tools/cli/src/weaver-rules.js';

// -- UPMP imports --
import {
  createAdapter as createUpmpAdapter,
  UPMP_SYNC_CHANNELS,
  UPMP_CAPABILITIES,
  DEFAULT_INTELLIGENCES,
} from '../tools/upmp/manya/index.js';

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
  await assert.rejects(() => nano(data, 'f.bin', 'application/octet-stream', 'ab'), /8 characters/i);
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

test('D5d: assertDistinctCapabilities - all manifests are distinct', () => {
  const result = assertDistinctCapabilities([usingaManifest, helixFlowManifest, forgeManifest, craftEngineManifest, stampManifest, vaultManifest, lensManifest, shieldManifest, signalManifest, pulseManifest, primarySectorManifest, cybersecurityManifest]);
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

test('D5f: capabilityOwners - maps all capabilities to tool IDs', () => {
  assert.equal(capabilityOwners.apiKeyVault, 'usinga-api-nexus');
  assert.equal(capabilityOwners.workflowDagBuilder, 'helixflow');
  assert.equal(capabilityOwners.keyDerivation, 'forge');
  assert.equal(capabilityOwners.passphraseStrength, 'forge');
  assert.equal(capabilityOwners.multiAlgorithmHash, 'forge');
  assert.equal(capabilityOwners.compressionAnalytics, 'craft-engine');
  assert.equal(capabilityOwners.timestampProof, 'stamp');
  assert.equal(capabilityOwners.provenanceChain, 'stamp');
  assert.equal(capabilityOwners.auditTrail, 'stamp');
  assert.equal(capabilityOwners.encryptedStorage, 'vault');
  assert.equal(capabilityOwners.secretManagement, 'vault');
  assert.equal(capabilityOwners.dataDetection, 'lens');
  assert.equal(capabilityOwners.dataRedaction, 'lens');
  assert.equal(capabilityOwners.sensitivityClassification, 'lens');
  assert.equal(capabilityOwners.accessControl, 'shield');
  assert.equal(capabilityOwners.roleManagement, 'shield');
  assert.equal(capabilityOwners.accessAudit, 'shield');
  assert.equal(capabilityOwners.secureMessaging, 'signal');
  assert.equal(capabilityOwners.messageSigning, 'signal');
  assert.equal(capabilityOwners.envelopeEncryption, 'signal');
  assert.ok(Object.keys(capabilityOwners).length >= 36);
});

test('D5g: manifests - own and handOff are consistent across all tools', () => {
  const allManifests = [usingaManifest, helixFlowManifest, forgeManifest, craftEngineManifest, stampManifest, vaultManifest, lensManifest, shieldManifest, signalManifest, pulseManifest, primarySectorManifest, cybersecurityManifest];
  const allOwns = new Set();
  for (const m of allManifests) {
    for (const cap of m.owns) allOwns.add(cap);
  }
  // Each manifest's handsOff should be owned by some other manifest
  for (const m of allManifests) {
    for (const cap of m.handsOff) {
      assert.ok(allOwns.has(cap), `${m.name} hands off ${cap} but nobody owns it`);
    }
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


// ===================================================================
// DIMENSION 8: Forge - Key Derivation & Passphrase Strength
// ===================================================================

test('D8a: scorePassphrase - scores weak passphrase correctly', () => {
  const result = scorePassphrase('password');
  assert.ok(result.score < 40, `Expected weak score, got ${result.score}`);
  assert.ok(['weak', 'fair'].includes(result.level), `Expected weak/fair level, got ${result.level}`);
  assert.ok(result.checks.noCommonPattern === false, 'Should detect common pattern');
  assert.ok(result.suggestions.length > 0, 'Should have suggestions for weak password');
});

test('D8b: scorePassphrase - scores strong passphrase correctly', () => {
  const result = scorePassphrase('K#9m$pL2xQ!vR7nZ');
  assert.ok(result.score >= 60, `Expected strong score, got ${result.score}`);
  assert.ok(['strong', 'excellent', 'good'].includes(result.level), `Expected good+ level, got ${result.level}`);
  assert.ok(result.entropy > 50, `Expected high entropy, got ${result.entropy}`);
  assert.ok(result.checks.length, 'Should pass length check');
  assert.ok(result.checks.uppercase, 'Should pass uppercase check');
  assert.ok(result.checks.numbers, 'Should pass numbers check');
  assert.ok(result.checks.symbols, 'Should pass symbols check');
});

test('D8c: deriveKeyPair - produces valid 32-byte key with salt', () => {
  const result = deriveKeyPair(PASS);
  assert.equal(result.key.length, 32);
  assert.equal(result.salt.length, 16);
  assert.equal(result.iterations, 600000);
  assert.ok(result.derivedAt);
});

test('D8d: deriveKeyPair - different salts produce different keys', () => {
  const r1 = deriveKeyPair(PASS);
  const r2 = deriveKeyPair(PASS);
  assert.notDeepEqual(r1.key, r2.key);
  assert.notDeepEqual(r1.salt, r2.salt);
});

test('D8e: deriveKeyPairAsync - async matches sync with same salt', async () => {
  const salt = Buffer.alloc(16, 0xcd);
  const sync = deriveKeyPair(PASS, salt);
  const async = await deriveKeyPairAsync(PASS, salt);
  assert.deepEqual(sync.key, async.key);
});

test('D8f: rotateKey - produces both old and new keys', () => {
  const salt = Buffer.alloc(16, 0xab);
  const result = rotateKey('old-passphrase-123', 'new-passphrase-456', salt);
  assert.equal(result.oldKey.length, 32);
  assert.equal(result.newKey.length, 32);
  assert.notDeepEqual(result.oldKey, result.newKey);
});

test('D8g: hash - supports multiple algorithms', () => {
  const data = Buffer.from('test data for hashing');
  const algorithms = ['sha256', 'sha384', 'sha512', 'sha3-256', 'sha3-512', 'blake2b512'];
  for (const algo of algorithms) {
    const result = hash(data, algo);
    assert.ok(result.digest.length > 0, `${algo} should produce a digest`);
    assert.equal(result.algorithm, algo);
    assert.ok(result.length > 0);
  }
});


// ===================================================================
// DIMENSION 9: Craft Engine - Archive (Multi-file)
// ===================================================================

test('D9a: archive/extract - basic multi-file roundtrip', async () => {
  const entries = [
    { name: 'readme.txt', mime: 'text/plain', data: Buffer.from('Hello, World!') },
    { name: 'data.json', mime: 'application/json', data: Buffer.from('{"key":"value"}') },
    { name: 'binary.bin', mime: 'application/octet-stream', data: makeBuffer('random', 1024) },
  ];
  const result = await archive(entries, PASS);
  assert.ok(result.buffer.length > 0);
  assert.equal(result.entryCount, 3);

  const extracted = await extract(result.buffer, PASS);
  assert.equal(extracted.entries.length, 3);
  assert.equal(extracted.integrityVerified, true);

  for (let i = 0; i < entries.length; i++) {
    assert.equal(extracted.entries[i].name, entries[i].name);
    assert.deepEqual(extracted.entries[i].data, entries[i].data);
  }
});

test('D9b: archive - rejects empty entries', async () => {
  await assert.rejects(() => archive([], PASS));
});

test('D9c: archive - rejects short passphrase', async () => {
  const entries = [{ name: 'f.txt', mime: 'text/plain', data: Buffer.from('data') }];
  await assert.rejects(() => archive(entries, 'short'), /8 characters/i);
});

test('D9d: archive/extract - wrong passphrase rejected', async () => {
  const entries = [{ name: 'f.txt', mime: 'text/plain', data: Buffer.from('secret') }];
  const result = await archive(entries, PASS);
  await assert.rejects(() => extract(result.buffer, 'wrong-passphrase-!'));
});

test('D9e: peekArchiveMetadata - reads entry names without passphrase', async () => {
  const entries = [
    { name: 'file1.txt', mime: 'text/plain', data: Buffer.from('one') },
    { name: 'file2.json', mime: 'application/json', data: Buffer.from('{"two":2}') },
  ];
  const result = await archive(entries, PASS);
  const meta = peekArchiveMetadata(result.buffer);
  assert.equal(meta.entryCount, 2);
  assert.ok(meta.entryNames.includes('file1.txt'));
  assert.ok(meta.entryNames.includes('file2.json'));
});

test('D9f: archive - single file works', async () => {
  const entries = [{ name: 'single.txt', mime: 'text/plain', data: Buffer.from('just one file') }];
  const result = await archive(entries, PASS);
  const extracted = await extract(result.buffer, PASS);
  assert.equal(extracted.entries.length, 1);
  assert.equal(extracted.entries[0].name, 'single.txt');
  assert.deepEqual(extracted.entries[0].data, Buffer.from('just one file'));
});

test('D9g: archive - large multi-file roundtrip', async () => {
  const entries = Array.from({ length: 10 }, (_, i) => ({
    name: `file-${i}.bin`,
    mime: 'application/octet-stream',
    data: makeBuffer(i % 2 === 0 ? 'text' : 'random', 4096),
  }));
  const result = await archive(entries, PASS);
  assert.equal(result.entryCount, 10);
  const extracted = await extract(result.buffer, PASS);
  assert.equal(extracted.entries.length, 10);
  assert.equal(extracted.integrityVerified, true);
});


// ===================================================================
// DIMENSION 10: Craft Engine - Analytics
// ===================================================================

test('D10a: CompressionAnalytics - record and report', () => {
  const analytics = new CompressionAnalytics();
  const data = makeBuffer('text', 4096);
  const result = compress7(data);
  analytics.recordFromResult(result, 'text');

  const report = analytics.report();
  assert.equal(report.totalObservations, 1);
  assert.ok(report.strategies.length > 0);
  assert.ok(report.topStrategy);
  assert.ok(report.topStrategy.winRate > 0);
});

test('D10b: CompressionAnalytics - empty report returns hints', () => {
  const analytics = new CompressionAnalytics();
  const report = analytics.report();
  assert.equal(report.totalObservations, 0);
  assert.ok(report.hints.length > 0);
  assert.ok(report.hints[0].includes('No observations'));
});

test('D10c: CompressionAnalytics - multiple observations track wins', () => {
  const analytics = new CompressionAnalytics();
  const patterns = ['repeat', 'sequential', 'random', 'zeros', 'text'];
  for (const pattern of patterns) {
    const result = compress7(makeBuffer(pattern, 4096));
    analytics.recordFromResult(result, pattern);
  }
  const report = analytics.report();
  assert.equal(report.totalObservations, 5);
  assert.ok(report.strategies.length > 0);
  // Top strategy should have wins
  assert.ok(report.topStrategy.wins > 0);
});

test('D10d: CompressionAnalytics - size distribution', () => {
  const analytics = new CompressionAnalytics();
  // Small file
  const r1 = compress7(makeBuffer('text', 512));
  analytics.recordFromResult(r1);
  // Medium file
  const r2 = compress7(makeBuffer('text', 50 * 1024));
  analytics.recordFromResult(r2);

  const report = analytics.report();
  assert.ok(report.sizeDistribution.small > 0);
  assert.ok(report.sizeDistribution.medium > 0);
});

test('D10e: CompressionAnalytics - clear resets observations', () => {
  const analytics = new CompressionAnalytics();
  const result = compress7(makeBuffer('text', 4096));
  analytics.recordFromResult(result);
  assert.equal(analytics.getObservations().length, 1);
  analytics.clear();
  assert.equal(analytics.getObservations().length, 0);
});

test('D10f: CompressionAnalytics - max observations eviction', () => {
  const analytics = new CompressionAnalytics(3);
  for (let i = 0; i < 5; i++) {
    const result = compress7(makeBuffer('text', 4096 + i * 100));
    analytics.recordFromResult(result);
  }
  assert.equal(analytics.getObservations().length, 3);
});

test('D10g: CompressionAnalytics - report hints for dominant strategy', () => {
  const analytics = new CompressionAnalytics();
  // Feed same pattern many times — likely same winner
  for (let i = 0; i < 20; i++) {
    const result = compress7(makeBuffer('repeat', 4096));
    analytics.recordFromResult(result);
  }
  const report = analytics.report();
  assert.ok(report.hints.length > 0);
  // Should mention strategy dominance if one strategy wins >70%
  if (report.topStrategy.winRate > 0.7) {
    assert.ok(report.hints.some(h => h.includes('dominates')));
  }
});


// ===================================================================
// DIMENSION 11: Stamp - Timestamping & Audit Trails
// ===================================================================

test('D11a: stamp - creates proof with correct structure', () => {
  const data = Buffer.from('important document content');
  const proof = stampProof(data);
  assert.ok(proof.hash.length > 0);
  assert.equal(proof.algorithm, 'sha256');
  assert.ok(proof.timestamp);
  assert.ok(proof.nonce.length > 0);
  assert.equal(proof.issuer, 'manya');
  assert.equal(proof.version, 1);
});

test('D11b: stamp + verify - roundtrip verification', () => {
  const data = Buffer.from('verifiable document');
  const proof = stampProof(data);
  const result = verifyStamp(proof, data);
  assert.equal(result.valid, true);
  assert.equal(result.hash, proof.hash);
});

test('D11c: stamp + verify - tampered data detected', () => {
  const data = Buffer.from('original data');
  const proof = stampProof(data);
  const tampered = Buffer.from('modified data');
  const result = verifyStamp(proof, tampered);
  assert.equal(result.valid, false);
});

test('D11d: buildChain - creates provenance chain', () => {
  const entries = [
    { data: Buffer.from('step-1'), label: 'Genesis' },
    { data: Buffer.from('step-2'), label: 'Transfer' },
    { data: Buffer.from('step-3'), label: 'Final' },
  ];
  const chain = buildChain(entries, { name: 'supply-chain' });
  assert.equal(chain.name, 'supply-chain');
  assert.equal(chain.entries.length, 3);
  assert.equal(chain.entries[0].previousHash, null);
  assert.ok(chain.entries[1].previousHash);
  assert.ok(chain.rootHash.length > 0);
});

test('D11e: buildChain + verifyChain - valid chain passes', () => {
  const entries = Array.from({ length: 5 }, (_, i) => ({
    data: Buffer.from(`entry-${i}`),
    label: `Step ${i}`,
  }));
  const chain = buildChain(entries);
  const result = verifyChain(chain);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('D11f: buildTrail + verifyTrail - audit trail integrity', () => {
  const events = [
    { event: 'user.login', actor: 'alice', resource: 'system', action: 'login' },
    { event: 'document.read', actor: 'alice', resource: 'doc-1', action: 'read' },
    { event: 'document.update', actor: 'bob', resource: 'doc-1', action: 'write' },
  ];
  const trail = buildTrail(events);
  assert.equal(trail.trail.length, 3);
  assert.equal(trail.verified, true);
  const verification = verifyTrail(trail);
  assert.equal(verification.valid, true);
});

test('D11g: stamp - custom issuer and algorithm', () => {
  const data = Buffer.from('custom stamp test');
  const proof = stampProof(data, { issuer: 'legal-dept', algorithm: 'sha256' });
  assert.equal(proof.issuer, 'legal-dept');
  assert.equal(proof.algorithm, 'sha256');
});


// ===================================================================
// DIMENSION 12: Vault - Encrypted Key-Value Store
// ===================================================================

test('D12a: vault create + put + get - basic operations', () => {
  const v = vaultCreate('test-vault');
  vaultPut(v, 'api-key', 'sk-1234567890');
  assert.equal(vaultGet(v, 'api-key'), 'sk-1234567890');
  assert.equal(vaultSize(v), 1);
});

test('D12b: vault put + get - object values', () => {
  const v = vaultCreate('config-vault');
  vaultPut(v, 'database', { host: 'db.example.com', port: 5432, ssl: true });
  const val = vaultGet(v, 'database');
  assert.equal(val.host, 'db.example.com');
  assert.equal(val.port, 5432);
  assert.equal(val.ssl, true);
});

test('D12c: vault seal + open - encrypted roundtrip', () => {
  const v = vaultCreate('secure-vault');
  vaultPut(v, 'secret-key', 'super-secret-value');
  vaultPut(v, 'db-password', 'P@ssw0rd!23');
  const sealed = vaultSeal(v, PASS);
  assert.ok(Buffer.isBuffer(sealed));
  const { vault: opened, metadata } = vaultOpen(sealed, PASS);
  assert.equal(metadata.name, 'secure-vault');
  assert.equal(vaultGet(opened, 'secret-key'), 'super-secret-value');
  assert.equal(vaultGet(opened, 'db-password'), 'P@ssw0rd!23');
});

test('D12d: vault seal + open - wrong passphrase fails', () => {
  const v = vaultCreate('fail-vault');
  vaultPut(v, 'key', 'value');
  const sealed = vaultSeal(v, PASS);
  assert.throws(() => vaultOpen(sealed, 'wrong-passphrase-x'), /Failed to decrypt/);
});

test('D12e: vault del + has + keys - CRUD operations', () => {
  const v = vaultCreate('crud-vault');
  vaultPut(v, 'a', '1');
  vaultPut(v, 'b', '2');
  vaultPut(v, 'c', '3');
  assert.equal(vaultHas(v, 'b'), true);
  vaultDel(v, 'b');
  assert.equal(vaultHas(v, 'b'), false);
  assert.deepEqual(vaultKeys(v).sort(), ['a', 'c']);
  assert.equal(vaultSize(v), 2);
});

test('D12f: vault search - tag-based search', () => {
  const v = vaultCreate('tagged-vault');
  vaultPut(v, 'aws-key', 'AKIA...', { tags: ['cloud', 'aws'] });
  vaultPut(v, 'gcp-key', 'gcp...', { tags: ['cloud', 'gcp'] });
  vaultPut(v, 'local-config', 'dev', { tags: ['local'] });
  const results = vaultSearch(v, ['cloud']);
  assert.equal(results.length, 2);
});

test('D12g: vault - large scale: 100 entries seal/open roundtrip', () => {
  const v = vaultCreate('large-vault');
  for (let i = 0; i < 100; i++) {
    vaultPut(v, `key-${i}`, `value-${i}`, { tags: [i % 2 === 0 ? 'even' : 'odd'] });
  }
  assert.equal(vaultSize(v), 100);
  const sealed = vaultSeal(v, PASS);
  const { vault: opened } = vaultOpen(sealed, PASS);
  assert.equal(vaultSize(opened), 100);
  assert.equal(vaultGet(opened, 'key-50'), 'value-50');
});


// ===================================================================
// DIMENSION 13: Lens - Data Inspection & Redaction
// ===================================================================

test('D13a: detect - identifies JSON data', () => {
  const result = lensDetect(Buffer.from('{"name":"test","value":42}'));
  assert.equal(result.format, 'json');
  assert.equal(result.binary, false);
});

test('D13b: detect - identifies CSV data', () => {
  const csv = 'name,age,city\nAlice,30,NYC\nBob,25,LA\nCarol,35,SF';
  const result = lensDetect(Buffer.from(csv));
  assert.equal(result.format, 'csv');
});

test('D13c: redact - removes PII patterns', () => {
  const text = 'Contact john@example.com or call 555-123-4567. SSN: 123-45-6789';
  const result = redact(text, { rules: ['pii'] });
  assert.ok(result.count >= 2, `Expected at least 2 redactions, got ${result.count}`);
  assert.ok(!result.redacted.includes('john@example.com'));
  assert.ok(!result.redacted.includes('123-45-6789'));
});

test('D13d: scan - detects sensitive data without modifying', () => {
  const text = 'Email: admin@corp.com and user@test.org';
  const result = scan(text, ['pii']);
  assert.ok(result.total >= 2);
  assert.ok(result.findings.some(f => f.type === 'EMAIL'));
});

test('D13e: classify - identifies restricted content', () => {
  const text = 'This document contains HIPAA protected health information and patient records.';
  const result = classify(text);
  assert.equal(result.level, 'restricted');
  assert.ok(result.score >= 85);
  assert.ok(result.recommendations.length > 0);
});

test('D13f: classify - identifies public content', () => {
  const text = 'This is a public press release about our marketing strategy for the new product launch.';
  const result = classify(text);
  assert.ok(['public', 'internal'].includes(result.level), `Expected public/internal, got ${result.level}`);
});

test('D13g: profile - statistical analysis', () => {
  const data = Buffer.from('Hello, World! This is a test string with some entropy.');
  const result = profile(data);
  assert.ok(result.size > 0);
  assert.ok(result.entropy > 0);
  assert.equal(result.format, 'text');
  assert.ok(result.printableRatio > 0.9);
});


// ===================================================================
// DIMENSION 14: Shield - Access Control & RBAC
// ===================================================================

test('D14a: createPolicy + defineRole + grant - setup policy', () => {
  const policy = createPolicy('healthcare-access', { description: 'HIPAA access control' });
  defineRole(policy, 'doctor', { description: 'Medical professional' });
  defineRole(policy, 'nurse', { description: 'Nursing staff' });
  grant(policy, 'doctor', [
    { resource: 'patient-records', actions: ['read', 'write'] },
    { resource: 'prescriptions', actions: ['read', 'write', 'sign'] },
  ]);
  grant(policy, 'nurse', [
    { resource: 'patient-records', actions: ['read'] },
  ]);
  assert.equal(policy.roles.size, 2);
});

test('D14b: registerSubject + assignRole + checkAccess - RBAC flow', () => {
  const policy = createPolicy('finance-rbac');
  defineRole(policy, 'trader', { description: 'Can trade' });
  grant(policy, 'trader', [{ resource: 'trades', actions: ['read', 'execute'] }]);
  registerSubject(policy, 'alice', { roles: ['trader'] });
  assignRole(policy, 'alice', 'trader');
  const result = checkAccess(policy, 'alice', 'trades', 'execute');
  assert.equal(result.allowed, true);
});

test('D14c: checkAccess - denies unauthorized access', () => {
  const policy = createPolicy('strict-policy', { defaultAction: 'deny' });
  defineRole(policy, 'viewer', { description: 'Read only' });
  grant(policy, 'viewer', [{ resource: 'reports', actions: ['read'] }]);
  registerSubject(policy, 'bob', { roles: ['viewer'] });
  assignRole(policy, 'bob', 'viewer');
  const result = checkAccess(policy, 'bob', 'reports', 'delete');
  assert.equal(result.allowed, false);
});

test('D14d: checkAccess - wildcard resource patterns', () => {
  const policy = createPolicy('wildcard-policy');
  defineRole(policy, 'admin');
  grant(policy, 'admin', [{ resource: 'documents:*', actions: ['read', 'write', 'delete'] }]);
  registerSubject(policy, 'admin-user', { roles: ['admin'] });
  assignRole(policy, 'admin-user', 'admin');
  const result = checkAccess(policy, 'admin-user', 'documents:contracts:2024', 'read');
  assert.equal(result.allowed, true);
});

test('D14e: addRule + checkAccess - ABAC time-based rule', () => {
  const policy = createPolicy('abac-policy');
  defineRole(policy, 'employee');
  grant(policy, 'employee', [{ resource: 'internal-wiki', actions: ['read'] }]);
  registerSubject(policy, 'charlie', { roles: ['employee'] });
  assignRole(policy, 'charlie', 'employee');
  addRule(policy, {
    name: 'business-hours-only',
    effect: 'deny',
    condition: (subject, resource, action, context) => {
      const hour = context.hour || 12;
      return hour < 9 || hour > 17;
    },
    description: 'Deny access outside business hours',
  });
  const afterHours = checkAccess(policy, 'charlie', 'internal-wiki', 'read', { hour: 22 });
  assert.equal(afterHours.matchedRules.some(r => r.type === 'abac'), true);
});

test('D14f: getEffectivePermissions - lists all permissions', () => {
  const policy = createPolicy('perm-check');
  defineRole(policy, 'senior', { parent: null });
  defineRole(policy, 'junior', { parent: 'senior' });
  grant(policy, 'senior', [{ resource: 'projects', actions: ['read', 'write', 'admin'] }]);
  grant(policy, 'junior', [{ resource: 'projects', actions: ['read'] }]);
  registerSubject(policy, 'dave', { roles: ['junior'] });
  assignRole(policy, 'dave', 'junior');
  const perms = getEffectivePermissions(policy, 'dave');
  assert.ok(perms.permissions.length > 0);
});

test('D14g: buildAuditTrail + verifyAuditTrail - tamper-proof access log', () => {
  const decisions = [
    { subject: 'alice', resource: 'records', action: 'read', granted: true, reason: 'RBAC: doctor' },
    { subject: 'bob', resource: 'records', action: 'write', granted: false, reason: 'Insufficient permissions' },
    { subject: 'alice', resource: 'records', action: 'update', granted: true, reason: 'RBAC: doctor' },
  ];
  const trail = buildAuditTrail(decisions);
  assert.equal(trail.entries.length, 3);
  assert.equal(trail.verified, true);
  const verification = verifyAuditTrail(trail);
  assert.equal(verification.valid, true);
});


// ===================================================================
// DIMENSION 15: Signal - Secure Message Envelopes
// ===================================================================

test('D15a: compose + signalSeal + signalOpen - encrypted message roundtrip', () => {
  const envelope = compose('Patient lab results: CBC normal', {
    sender: 'lab-system',
    recipients: ['dr-smith'],
    priority: 'high',
    type: 'lab-result',
  });
  assert.ok(envelope.id);
  assert.equal(envelope.sender, 'lab-system');
  assert.equal(envelope.priority, 'high');

  const sealed = signalSeal(envelope, PASS);
  assert.ok(Buffer.isBuffer(sealed));

  const { envelope: opened, metadata } = signalOpen(sealed, PASS);
  assert.equal(opened.sender, 'lab-system');
  assert.equal(opened.priority, 'high');
  assert.equal(opened.payload, envelope.payload);
});

test('D15b: compose + signalSeal + signalOpen - wrong passphrase fails', () => {
  const envelope = compose('Secret trade signal');
  const sealed = signalSeal(envelope, PASS);
  assert.throws(() => signalOpen(sealed, 'wrong-passphrase-!'), /Failed to decrypt/);
});

test('D15c: compose + signalSign + verifySignature - RSA signature roundtrip', () => {
  const { privateKey, publicKey } = generateSigningKeys();
  const envelope = compose('Authenticated command', { sender: 'controller' });
  const signed = signalSign(envelope, privateKey);
  assert.ok(signed.signature);
  assert.equal(signed.signature.algorithm, 'RSA-SHA256');

  const result = verifySignature(signed, publicKey);
  assert.equal(result.valid, true);
});

test('D15d: verifySignature - tampered content detected', () => {
  const { privateKey, publicKey } = generateSigningKeys();
  const envelope = compose('Original message', { sender: 'alice' });
  const signed = signalSign(envelope, privateKey);
  // Tamper with the payload
  signed.payload = 'Tampered message';
  const result = verifySignature(signed, publicKey);
  assert.equal(result.valid, false);
});

test('D15e: compose + signalHmac + verifyHmac - HMAC integrity roundtrip', () => {
  const envelope = compose('IoT sensor reading: 72.5F', { sender: 'sensor-01', type: 'telemetry' });
  const authenticated = signalHmac(envelope, 'shared-secret-key');
  assert.ok(authenticated.hmac);
  assert.equal(authenticated.hmac.algorithm, 'HMAC-SHA256');

  const result = verifyHmac(authenticated, 'shared-secret-key');
  assert.equal(result.valid, true);
});

test('D15f: verifyHmac - wrong secret detected', () => {
  const envelope = compose('Data packet', { sender: 'device-42' });
  const authenticated = signalHmac(envelope, 'correct-secret');
  const result = verifyHmac(authenticated, 'wrong-secret');
  assert.equal(result.valid, false);
});

test('D15g: compose - priority levels and metadata', () => {
  const envelope = compose('Critical alert: server down', {
    sender: 'monitoring',
    recipients: ['ops-team', 'cto'],
    channel: 'alerts',
    priority: 'critical',
    type: 'alert',
    headers: { retry: '3', ttl: '300' },
  });
  assert.equal(envelope.priority, 'critical');
  assert.equal(envelope.channel, 'alerts');
  assert.deepEqual(envelope.recipients, ['ops-team', 'cto']);
  assert.equal(envelope.headers.retry, '3');
});


// ===================================================================
// DIMENSION 16: Pulse — Industry Presets
// ===================================================================

test('D16a: getIndustry - returns valid config for each industry', () => {
  for (const id of INDUSTRY_IDS) {
    const industry = getIndustry(id);
    assert.equal(industry.id, id, `Industry id mismatch for ${id}`);
    assert.ok(industry.name.length > 0, `Industry ${id} missing name`);
    assert.ok(industry.description.length > 0, `Industry ${id} missing description`);
    assert.ok(industry.frameworks.length > 0, `Industry ${id} missing frameworks`);
    assert.ok(industry.redactionPreset.length > 0, `Industry ${id} missing redactionPreset`);
    assert.ok(industry.accessTemplate.length > 0, `Industry ${id} missing accessTemplate`);
    assert.ok(industry.stampTemplate.length > 0, `Industry ${id} missing stampTemplate`);
    assert.ok(industry.signalTypes.length > 0, `Industry ${id} missing signalTypes`);
  }
});

test('D16b: listIndustries - returns all 10 industries', () => {
  const list = listIndustries();
  assert.equal(list.length, 10, `Expected 10 industries, got ${list.length}`);
  const ids = list.map(i => i.id).sort();
  const expectedIds = [...INDUSTRY_IDS].sort();
  assert.deepEqual(ids, expectedIds);
  // Each entry has summary fields
  for (const entry of list) {
    assert.ok(entry.name.length > 0, `Industry ${entry.id} missing name in listing`);
    assert.ok(entry.frameworks.length > 0, `Industry ${entry.id} missing frameworks in listing`);
  }
});

test('D16c: createRedactionConfig - healthcare uses phi preset with mrn/npi', () => {
  const config = createRedactionConfig('healthcare');
  assert.equal(config.preset, 'phi');
  assert.ok(config.rules.includes('mrn'), 'Healthcare redaction should include mrn');
  assert.ok(config.rules.includes('npi'), 'Healthcare redaction should include npi');
  assert.ok(config.rules.length > 0, 'Healthcare redaction should have rules');
  assert.equal(config.replacement, '[REDACTED]');
});

test('D16d: createRedactionConfig - finance uses financial preset with creditCard/swiftCode', () => {
  const config = createRedactionConfig('finance');
  assert.equal(config.preset, 'financial');
  assert.ok(config.rules.includes('creditCard'), 'Finance redaction should include creditCard');
  assert.ok(config.rules.includes('swiftCode'), 'Finance redaction should include swiftCode');
  assert.ok(config.rules.length > 0, 'Finance redaction should have rules');
});

test('D16e: createIndustryPolicy - returns role templates without shield module', () => {
  const policy = createIndustryPolicy('healthcare');
  assert.ok(policy.template, 'Policy should have a template name');
  assert.ok(policy.roles.length > 0, 'Policy should have role templates');
  assert.ok(policy.description.length > 0, 'Policy should have a description');
  // Without shield module, should not return a live policy object
  assert.equal(typeof policy.template, 'string');
  // Role templates should have name and description
  for (const role of policy.roles) {
    assert.ok(role.name.length > 0, 'Role should have a name');
    assert.ok(role.description.length > 0, 'Role should have a description');
  }
});

test('D16f: createAuditTemplate - finance has transaction events', () => {
  const template = createAuditTemplate('finance');
  assert.ok(template.template, 'Audit template should have a template name');
  assert.ok(template.events.length > 0, 'Finance audit should have events');
  assert.ok(template.events.includes('transaction.execute'), 'Finance audit should include transaction.execute');
  assert.ok(template.description.length > 0, 'Audit template should have a description');
});

test('D16g: createPreset - complete preset for each industry validates', () => {
  for (const id of INDUSTRY_IDS) {
    const preset = createPreset(id);
    // Industry info
    assert.ok(preset.industry, `Preset for ${id} missing industry`);
    assert.equal(preset.industry.id, id);
    assert.ok(preset.industry.name.length > 0);
    assert.ok(preset.industry.frameworks.length > 0);
    // Redaction config
    assert.ok(preset.redaction, `Preset for ${id} missing redaction`);
    assert.ok(preset.redaction.rules.length > 0);
    // Policy
    assert.ok(preset.policy, `Preset for ${id} missing policy`);
    // Audit
    assert.ok(preset.audit, `Preset for ${id} missing audit`);
    // Signal
    assert.ok(preset.signal, `Preset for ${id} missing signal`);
    assert.ok(preset.signal.availableTypes.length > 0);
    // Vault
    assert.ok(preset.vault, `Preset for ${id} missing vault`);
    // Compliance
    assert.ok(preset.compliance.length > 0, `Preset for ${id} missing compliance notes`);
  }
});


// ===================================================================
// DIMENSION 17: Lens — Extended Industry Redaction
// ===================================================================

test('D17a: redact - legal preset redacts case numbers', () => {
  const text = 'Refer to Case No. 2024-CV-00142 and Docket #3-CR-2023';
  const result = redact(text, { rules: ['legal'] });
  assert.ok(result.count >= 1, `Expected at least 1 redaction, got ${result.count}`);
  assert.ok(!result.redacted.includes('Case No. 2024-CV-00142'), 'Case number should be redacted');
});

test('D17b: redact - education preset redacts student IDs', () => {
  const text = 'Student ID: 912345678 and SID 1234567 are on file';
  const result = redact(text, { rules: ['education'] });
  assert.ok(result.count >= 1, `Expected at least 1 redaction, got ${result.count}`);
  assert.ok(result.found.some(f => f.type === 'STUDENT_ID'), 'Should find STUDENT_ID patterns');
});

test('D17c: redact - telecom preset redacts IMEI-like patterns', () => {
  // Test that the IMEI pattern itself works
  const text = 'Device IMEI: 490154203237518 registered on network';
  const imeiResult = redact(text, { rules: ['imei'] });
  assert.ok(imeiResult.count >= 1, `Expected at least 1 IMEI redaction, got ${imeiResult.count}`);
  assert.ok(imeiResult.found.some(f => f.type === 'IMEI'), 'Should find IMEI patterns');
  // Telecom preset redacts the same text (may classify as PHONE due to overlap)
  const telecomResult = redact(text, { rules: ['telecom'] });
  assert.ok(telecomResult.count >= 1, `Telecom preset should redact, got ${telecomResult.count}`);
});

test('D17d: redact - iot preset redacts MAC addresses', () => {
  const text = 'Sensor reading from device AA:BB:CC:DD:EE:FF at noon';
  const result = redact(text, { rules: ['iot'] });
  assert.ok(result.count >= 1, `Expected at least 1 redaction, got ${result.count}`);
  assert.ok(result.found.some(f => f.type === 'MAC_ADDRESS'), 'Should find MAC_ADDRESS patterns');
  assert.ok(!result.redacted.includes('AA:BB:CC:DD:EE:FF'), 'MAC address should be redacted');
});

test('D17e: scan - financial preset finds IBAN patterns', () => {
  const text = 'Transfer to IBAN DE89370400440532013000 confirmed';
  const result = scan(text, ['financial']);
  assert.ok(result.total >= 1, `Expected at least 1 finding, got ${result.total}`);
  assert.ok(result.findings.some(f => f.type === 'IBAN'), 'Should find IBAN patterns');
});

test('D17f: PRESETS - has legal, education, telecom, iot keys', () => {
  assert.ok('legal' in PRESETS, 'PRESETS should have legal key');
  assert.ok('education' in PRESETS, 'PRESETS should have education key');
  assert.ok('telecom' in PRESETS, 'PRESETS should have telecom key');
  assert.ok('iot' in PRESETS, 'PRESETS should have iot key');
  // Verify each preset is a non-empty array of rule names
  for (const key of ['legal', 'education', 'telecom', 'iot']) {
    assert.ok(Array.isArray(PRESETS[key]), `PRESETS.${key} should be an array`);
    assert.ok(PRESETS[key].length > 0, `PRESETS.${key} should have at least one rule`);
  }
});

test('D17g: redact - healthcare phi preset finds DEA numbers', () => {
  const text = 'Prescription by provider DEANumber: BG1234567 on file';
  const result = redact(text, { rules: ['phi'] });
  assert.ok(result.count >= 1, `Expected at least 1 redaction, got ${result.count}`);
  assert.ok(result.found.some(f => f.type === 'DEA_NUMBER'), 'PHI preset should find DEA_NUMBER patterns');
});


// ===================================================================
// DIMENSION 18: Toolkit — Expanded Manifests
// ===================================================================

test('D18a: capabilityOwners - maps pulse capabilities', () => {
  assert.equal(capabilityOwners.industryPresets, 'pulse');
  assert.equal(capabilityOwners.complianceTemplates, 'pulse');
  assert.equal(capabilityOwners.industryPolicyTemplates, 'pulse');
  assert.equal(capabilityOwners.industrySignalTypes, 'pulse');
});

test('D18b: pulseManifest - has correct id and purpose', () => {
  assert.equal(pulseManifest.id, 'pulse');
  assert.equal(pulseManifest.name, 'Pulse');
  assert.ok(pulseManifest.purpose.length > 0, 'Pulse manifest should have a purpose');
  assert.equal(pulseManifest.foundation, 'Manya');
});

test('D18c: assertDistinctCapabilities - all 17 manifests are distinct (including pulse, primary-sector, cybersecurity, transport-logistics, research-academic, unify, lycon-browser, upmp)', () => {
  const allManifests = [
    usingaManifest, helixFlowManifest, forgeManifest, craftEngineManifest,
    stampManifest, vaultManifest, lensManifest, shieldManifest, signalManifest,
    pulseManifest, primarySectorManifest, cybersecurityManifest,
    transportLogisticsManifest, researchAcademicManifest, unifyManifest, lyconManifest, upmpManifest,
  ];
  const result = assertDistinctCapabilities(allManifests);
  assert.equal(result.distinct, true, `Manifests overlap: ${JSON.stringify(result.overlaps)}`);
  assert.deepEqual(result.overlaps, []);
});

test('D18d: capabilityOwners - has at least 64 capabilities', () => {
  const capCount = Object.keys(capabilityOwners).length;
  assert.ok(capCount >= 64, `Expected at least 64 capabilities, got ${capCount}`);
});

test('D18e: pulseManifest - owns industryPresets and complianceTemplates', () => {
  assert.ok(pulseManifest.owns.includes('industryPresets'), 'Pulse should own industryPresets');
  assert.ok(pulseManifest.owns.includes('complianceTemplates'), 'Pulse should own complianceTemplates');
  assert.ok(pulseManifest.owns.includes('industryPolicyTemplates'), 'Pulse should own industryPolicyTemplates');
  assert.ok(pulseManifest.owns.includes('industrySignalTypes'), 'Pulse should own industrySignalTypes');
});

test('D18f: pulseManifest - handsOff does not overlap with owns', () => {
  const ownsSet = new Set(pulseManifest.owns);
  for (const cap of pulseManifest.handsOff) {
    assert.ok(!ownsSet.has(cap), `Pulse handsOff ${cap} overlaps with owns`);
  }
});

test('D18g: manifests - all manifests have consistent foundation name', () => {
  const allManifests = [
    usingaManifest, helixFlowManifest, forgeManifest, craftEngineManifest,
    stampManifest, vaultManifest, lensManifest, shieldManifest, signalManifest,
    pulseManifest, primarySectorManifest, cybersecurityManifest,
    transportLogisticsManifest, researchAcademicManifest, unifyManifest, lyconManifest, upmpManifest,
  ];
  for (const m of allManifests) {
    assert.equal(m.foundation, 'Manya', `${m.name} has wrong foundation: ${m.foundation}`);
  }
});


// ===================================================================
// DIMENSION 19: Primary Sector - Validation & Compliance
// ===================================================================

test('D19a: validateCoordinates - valid GPS coordinates roundtrip', () => {
  const result = validateCoordinates({ latitude: -33.9249, longitude: 18.4241 });
  assert.equal(result.valid, true);
  assert.ok(result.normalized);
  assert.equal(result.normalized.latitude, -33.9249);
  assert.equal(result.normalized.longitude, 18.4241);
});

test('D19b: validateCommodity - agriculture wheat is valid', () => {
  const result = validateCommodity('agriculture', 'wheat', SECTORS);
  assert.equal(result.valid, true);
  assert.equal(result.commodity, 'wheat');
});

test('D19c: validateSensorReading - temperature reading validates', () => {
  const result = validateSensorReading({ type: 'temperature', value: 25.5, unit: 'celsius' });
  assert.equal(result.valid, true);
  assert.ok(result.reading.timestamp);
});

test('D19d: checkCompliance - agriculture pesticide requires applicator', () => {
  const result = checkCompliance('agriculture', { type: 'pesticide-application', timestamp: '2024-01-15T10:00:00Z' });
  assert.equal(result.compliant, false);
  assert.ok(result.issues.some(i => /applicator/i.test(i)));
});

test('D19e: createSectorPreset - mining has complete preset', () => {
  const preset = createSectorPreset('mining');
  assert.equal(preset.sector.id, 'mining');
  assert.ok(preset.commodities.includes('gold'));
  assert.ok(preset.redaction.rules.length > 0);
  assert.ok(preset.compliance.length > 0);
});

test('D19f: validateProductionReport - valid report with location', () => {
  const result = validateProductionReport({
    sectorId: 'fishing',
    commodity: 'tuna',
    quantity: 500,
    unit: 'tonne',
    location: { latitude: -34.0, longitude: 18.5 },
  });
  assert.equal(result.valid, true);
});

test('D19g: listSectors - all 4 primary sectors present', () => {
  const sectors = listSectors();
  assert.equal(sectors.length, 4);
  assert.ok(sectors.every(s => s.commodities.length > 0));
});


// ===================================================================
// DIMENSION 20: Cybersecurity - Threat Intel & Vulnerability
// ===================================================================

test('D20a: classifyThreat - critical threat classification', () => {
  const result = classifyThreat({ name: 'Log4Shell', cvssScore: 10.0 });
  assert.equal(result.severity, 'critical');
  assert.equal(result.riskLevel, 'extreme');
});

test('D20b: createIOC - IP indicator with hash', () => {
  const result = createIOC({ type: 'ip', value: '10.0.0.1', source: 'firewall' });
  assert.equal(result.type, 'ip');
  assert.ok(result.hash.length === 64);
  assert.equal(result.source, 'firewall');
});

test('D20c: calculateCVSS - critical CVSS score', () => {
  const result = calculateCVSS({
    attackVector: 'N', attackComplexity: 'L', privilegesRequired: 'N',
    userInteraction: 'N', scope: 'U', confidentiality: 'H', integrity: 'H', availability: 'H',
  });
  assert.ok(result.score >= 9.0, `Expected critical score, got ${result.score}`);
  assert.equal(result.severity, 'critical');
  assert.ok(result.vector.startsWith('CVSS:3.1/'));
});

test('D20d: createEvidence - integrity hash and chain of custody', () => {
  const evidence = createEvidence({ name: 'Access Log', type: 'log', data: 'log data here' });
  assert.ok(evidence.hash.length === 64);
  assert.equal(evidence.chainOfCustody.length, 1);
  assert.equal(evidence.state, 'collected');
});

test('D20e: verifyEvidenceIntegrity - tamper detection', () => {
  const evidence = createEvidence({ name: 'Test', data: 'original data' });
  const valid = verifyEvidenceIntegrity(evidence, 'original data');
  assert.equal(valid.valid, true);
  const tampered = verifyEvidenceIntegrity(evidence, 'tampered data');
  assert.equal(tampered.valid, false);
});

test('D20f: createIncident + escalateIncident - full incident lifecycle', () => {
  const incident = createIncident({ title: 'Breach Detected', severity: 'medium', category: 'data-breach' });
  assert.equal(incident.status, 'new');
  escalateIncident(incident, 'Scope widened to production', 'soc-lead');
  assert.equal(incident.severity, 'high');
});

test('D20g: assessRisk - mixed vulnerability risk assessment', () => {
  const vulns = [
    createVulnerability({ name: 'SQLi', cvss: { attackVector: 'N', attackComplexity: 'L', privilegesRequired: 'N', userInteraction: 'N', scope: 'U', confidentiality: 'H', integrity: 'H', availability: 'H' } }),
    createVulnerability({ name: 'XSS', cvss: { attackVector: 'N', attackComplexity: 'L', privilegesRequired: 'N', userInteraction: 'R', scope: 'U', confidentiality: 'L', integrity: 'L', availability: 'N' } }),
  ];
  const risk = assessRisk(vulns);
  assert.equal(risk.total, 2);
  assert.ok(risk.riskScore > 0);
  assert.ok(risk.recommendations.length > 0);
});


// ===================================================================
// DIMENSION 21: Transport & Logistics - Identifier Validation & Tracking
// ===================================================================

test('D21a: validateAWB - valid IATA modulo-11 sample 02000000003', () => {
  const result = validateAWB('02000000003');
  assert.equal(result.valid, true);
  assert.equal(result.carrierPrefix, '020');
  assert.equal(result.checkDigit, 3);
});

test('D21b: validateIMO - valid IMO 9074729', () => {
  const result = validateIMO('9074729');
  assert.equal(result.valid, true);
  assert.equal(result.checkDigit, 9);
});

test('D21c: validateContainerNumber - ISO 6346 sample MSCU6639870', () => {
  const result = validateContainerNumber('MSCU6639870');
  assert.equal(result.valid, true);
  assert.equal(result.ownerCode, 'MSC');
  assert.equal(result.categoryId, 'U');
});

test('D21d: createShipment + recordEvent - maritime container tracking lifecycle', () => {
  const shipment = createShipment({
    trackingNumber: 'MSCU6639870',
    mode: 'maritime',
    origin: 'ZACPT',
    destination: 'NLRTM',
    carrier: { id: 'MSC', name: 'MSC' },
  });
  assert.equal(shipment.status, 'booked');
  recordEvent(shipment, { type: 'departure', location: 'ZACPT', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(shipment.status, 'in-transit');
  recordEvent(shipment, { type: 'arrival', location: 'NLRTM', timestamp: '2026-02-01T00:00:00Z' });
  assert.equal(shipment.status, 'arrived');
});

test('D21e: createGeofence + checkGeofence - port geofencing', () => {
  const g = createGeofence({
    id: 'port-ct', name: 'Cape Town Port', type: 'circle',
    center: { latitude: -33.91, longitude: 18.43 }, radiusMeters: 10000,
  });
  const inside = checkGeofence({ latitude: -33.91, longitude: 18.43 }, g);
  assert.equal(inside.inside, true);
  const outside = checkGeofence({ latitude: -33.0, longitude: 18.43 }, g);
  assert.equal(outside.inside, false);
});

test('D21f: lookupDangerousGood + createDangerousGoodsDeclaration - DG classification', () => {
  const lookup = lookupDangerousGood('1203');
  assert.equal(lookup.found, true);
  assert.equal(lookup.properShippingName, 'Gasoline');
  const dg = createDangerousGoodsDeclaration({
    unNumber: '1203', properShippingName: 'Gasoline', hazardClass: '3', packingGroup: 'II',
    quantity: 5000, unit: 'L', transportMode: 'road',
  });
  assert.equal(dg.lookupMatch, true);
  assert.equal(dg.verifiedAgainstLookup, true);
});

test('D21g: screenSanctions - clear counterparty vs flagged entity', () => {
  const clear = screenSanctions({ name: 'Acme Logistics Inc.' });
  assert.equal(clear.clear, true);
  const flagged = screenSanctions({ name: 'Sanctioned Entity Alpha' });
  assert.equal(flagged.clear, false);
  assert.ok(flagged.matches.length >= 1);
});


// ===================================================================
// DIMENSION 22: Research & Academic - Citations, Reproducibility & Peer Review
// ===================================================================

test('D22a: validateDOI + validateORCID - citation identifiers', () => {
  const doi = validateDOI('10.1000/182');
  assert.equal(doi.valid, true);
  assert.equal(doi.registrant, '1000');
  const orcid = validateORCID('0000-0002-1825-0097');
  assert.equal(orcid.valid, true);
  assert.equal(orcid.checkDigit, '7');
});

test('D22b: validateArxivID + validateISBN13 - mixed-format identifiers', () => {
  const arxiv = validateArxivID('2304.12345');
  assert.equal(arxiv.valid, true);
  assert.equal(arxiv.scheme, 'modern');
  assert.equal(arxiv.year, 2023);
  const isbn = validateISBN13('9780306406157');
  assert.equal(isbn.valid, true);
  assert.equal(isbn.checkDigit, 7);
});

test('D22c: createManifest + verifyManifest - reproducibility manifest roundtrip', () => {
  const manifest = createManifest({
    experimentId: 'exp-d22',
    software: { name: 'manya', version: '0.3.0' },
    parameters: { epochs: 5, lr: 0.001 },
    seed: 42,
    inputs: [{ name: 'data.csv', content: 'col1,col2\n1,2\n' }],
    outputs: [{ name: 'result.json', hash: 'fakehash' }],
  });
  assert.equal(manifest.schema, 'manya-repro-v1');
  const verified = verifyManifest(manifest, [{ name: 'data.csv', content: 'col1,col2\n1,2\n' }], [{ name: 'result.json', hash: 'fakehash' }]);
  assert.equal(verified.verified, true);
  assert.equal(verified.manifestHashVerified, true);
});

test('D22d: assessFAIR - fully FAIR artifact achieves score 1', () => {
  const assessment = assessFAIR({
    doi: '10.1000/182',
    license: 'CC-BY-4.0',
    format: 'csv',
    metadataStandard: 'DataCite',
    repository: 'zenodo',
    provenance: 'ro-crate-manifest.json',
  });
  assert.equal(assessment.fair, true);
  assert.equal(assessment.score, 1);
});

test('D22e: createSubmission + assignReviewer + recordReview - peer-review lifecycle', () => {
  const submission = createSubmission({
    manuscriptId: 'ms-d22',
    title: 'Test',
    authors: ['orcid-author-1'],
    correspondingAuthor: 'orcid-author-1',
    journalId: '1234-5678',
  });
  assignReviewer(submission, { reviewerId: 'orcid-reviewer-1', coiDisclosed: false });
  assert.equal(submission.reviewers.length, 1);
  assert.equal(submission.status, 'under-review');
  recordReview(submission, { reviewerId: 'orcid-reviewer-1', recommendation: 'minor-revision' });
  assert.equal(submission.reviews.length, 1);
  recordDecision(submission, { decision: 'minor-revision', editorId: 'editor-1' });
  assert.equal(submission.status, 'revision-requested');
});

test('D22f: verifyReviewIntegrity - detects out-of-order events', () => {
  const submission = createSubmission({
    manuscriptId: 'ms-d22-integrity',
    title: 'X',
    authors: ['a'],
    correspondingAuthor: 'a',
    journalId: 'j',
    submittedAt: '2026-01-01T00:00:00Z',
  });
  submission.timeline.push({ event: 'pre-dated', at: '2025-12-01T00:00:00Z' });
  const result = verifyReviewIntegrity(submission);
  assert.equal(result.verified, false);
});

test('D22g: createDMP + checkCompliance - life-sciences DMP and clinical-trial compliance', () => {
  const dmp = createDMP({
    domainId: 'life_sciences',
    projectTitle: 'Cancer genomics study',
    funder: 'NIH',
    storage: { retentionYears: 15 },
    sharing: { embargoMonths: 12, repository: 'dbGaP' },
  });
  assert.equal(dmp.funder, 'NIH');
  assert.equal(dmp.storage.retentionYears, 15);
  // Compliance check: clinical trial without NCT fails
  const compliant = checkResearchCompliance('life_sciences', { type: 'clinical-trial', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(compliant.compliant, false);
  assert.ok(compliant.issues.some(i => /NCT/i.test(i)));
});


// ===================================================================
// DIMENSION 23: Unify - Federation, Event Bus, Mesh & Vocabularies
// ===================================================================
// The connective tissue that makes "Everything Connected. Everyone Unified." true at runtime.

test('D23a: registerTool + route + dispatch - capability-based dispatch to owning tool', () => {
  _resetMesh();
  _resetFederation();
  registerTool({
    manifest: researchAcademicManifest,
    api: {
      validateDOI: (doi) => ({ valid: true, normalized: `https://doi.org/${doi}` }),
    },
  });
  const r = routeCapability('citationValidation');
  assert.equal(r.toolId, 'research-academic');
  assert.equal(r.registered, true);
  const result = dispatch('citationValidation', 'validateDOI', ['10.1000/182']);
  assert.equal(result.valid, true);
  assert.equal(result.normalized, 'https://doi.org/10.1000/182');
});

test('D23b: createIdentity + linkIdentity + resolveIdentity - cross-tool identity federation', () => {
  _resetMesh();
  _resetFederation();
  const researcher = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  linkIdentity(researcher, { type: 'doi', value: '10.1000/182', source: 'research-academic' });
  linkIdentity(researcher, { type: 'email', value: 'j.carberry@brown.edu', source: 'pulse' });
  // Resolve by any of the linked identifiers
  const byOrcid = resolveIdentity('orcid', '0000-0002-1825-0097');
  const byDoi = resolveIdentity('doi', '10.1000/182');
  const byEmail = resolveIdentity('email', 'j.carberry@brown.edu');
  assert.equal(byOrcid.id, researcher.id);
  assert.equal(byDoi.id, researcher.id);
  assert.equal(byEmail.id, researcher.id);
  assert.equal(byOrcid.linked.length, 2);
});

test('D23c: createBus + subscribe + publish + routeEvent - event bus with sync-channel routing', () => {
  const bus = createBus({ replay: true });
  const received = [];
  subscribe(bus, 'citation-verified', (evt) => received.push(evt));
  subscribe(bus, 'manifest-verified', (evt) => received.push(evt));
  // routeEvent publishes to all declared sync channels of the source tool
  const result = routeEvent(bus, {
    type: 'doi-verified',
    sourceToolId: 'research-academic',
    payload: { doi: '10.1000/182' },
  }, researchAcademicManifest.syncChannels);
  assert.equal(result.routes.length, researchAcademicManifest.syncChannels.length);
  assert.equal(received.length, 2);
  // Both subscribers should have received an event
  assert.ok(received.some(e => e.topic === 'citation-verified'));
  assert.ok(received.some(e => e.topic === 'manifest-verified'));
  // Bus stats reflect the activity — one event per channel published
  const stats = busStats(bus);
  assert.equal(stats.eventCount, researchAcademicManifest.syncChannels.length);
  assert.equal(stats.historySize, researchAcademicManifest.syncChannels.length);
});

test('D23d: translate - HS code → industry → research_domain chain', () => {
  // HS 3004 = pharmaceutical products → healthcare → life_sciences
  const r1 = translate('hs_code', 'industry', '300490');
  assert.equal(r1.translated, true);
  assert.equal(r1.value, 'healthcare');
  const r2 = translate('industry', 'research_domain', r1.value);
  assert.equal(r2.translated, true);
  assert.equal(r2.value, 'life_sciences');
});

test('D23e: translate - UN/LOCODE → country + capability → tool_id', () => {
  const r1 = translate('unlocode', 'country', 'NLRTM');
  assert.equal(r1.value, 'NL');
  const r2 = translate('capability', 'tool_id', 'shipmentTracking');
  assert.equal(r2.value, 'transport-logistics');
});

test('D23f: mergeIdentities - consolidates two identities and their linked identifiers', () => {
  _resetMesh();
  _resetFederation();
  const a = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097', metadata: { name: 'Josiah' } });
  const b = createIdentity({ type: 'doi', value: '10.1000/182', metadata: { affiliation: 'Brown' } });
  linkIdentity(b, { type: 'email', value: 'jc@brown.edu', source: 'research-academic' });
  const merged = mergeIdentities(a.id, b.id);
  // b's primary DOI should now be in a's linked
  assert.ok(merged.linked.some(l => l.type === 'doi' && l.value === '10.1000/182'));
  // b's linked email should also be in a's linked
  assert.ok(merged.linked.some(l => l.type === 'email' && l.value === 'jc@brown.edu'));
  // Metadata should be merged
  assert.equal(merged.metadata.name, 'Josiah');
  assert.equal(merged.metadata.affiliation, 'Brown');
  // Resolving the DOI should now return the merged identity
  const byDoi = resolveIdentity('doi', '10.1000/182');
  assert.equal(byDoi.id, merged.id);
});

test('D23g: getSyncChannels - collects union of all declared channels across registered tools', () => {
  _resetMesh();
  _resetFederation();
  registerTool({ manifest: forgeManifest, api: {} });
  registerTool({ manifest: researchAcademicManifest, api: {} });
  registerTool({ manifest: transportLogisticsManifest, api: {} });
  const channels = getSyncChannels();
  const channelNames = channels.map(c => c.channel);
  // Each tool contributes distinct channels
  assert.ok(channelNames.includes('key-rotation-event'));
  assert.ok(channelNames.includes('citation-verified'));
  assert.ok(channelNames.includes('shipment-event-recorded'));
  // listTranslations returns supported vocabulary translation pairs
  const translations = listTranslations();
  assert.ok(translations.length >= 8);
});


// ===================================================================
// DIMENSION 24: CLI - Argument Parsing, Command Dispatch & Weave Generation
// ===================================================================
// The command-line interface that makes Unify accessible from the shell.

// Helper: run a CLI command with an isolated state file and mock process.
async function runCli(argv, stateFile) {
  const parsed = parseArgs([...argv, '--state', stateFile]);
  const proc = {
    stdout: { _out: '', write(s) { this._out += s; } },
    stderr: { _out: '', write(s) { this._out += s; } },
    env: {},
  };
  const result = await runCommand(parsed, { process: proc });
  return { exitCode: result.exitCode, output: result.output, stdout: proc.stdout._out, stderr: proc.stderr._out };
}

test('D24a: parseArgs - parses command + subcommand + value flags', () => {
  const r = parseArgs(['mesh', 'register', 'forge', '--state', '/tmp/x.json']);
  assert.equal(r.command, 'mesh');
  assert.equal(r.subcommand, 'register');
  assert.deepEqual(r.args, ['forge']);
  assert.equal(r.flags.state, '/tmp/x.json');
});

test('D24b: mesh register-all via dispatcher - registers all 7 tools', async () => {
  const stateFile = `/tmp/manya-7x7-d24b-${Date.now()}.json`;
  const r = await runCli(['mesh', 'register-all'], stateFile);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.output);
  assert.ok(out.registered.length >= 5);
  assert.ok(out.registered.includes('forge'));
  assert.ok(out.registered.includes('research-academic'));
  assert.ok(out.registered.includes('unify'));
});

test('D24c: identity create + link + resolve via CLI dispatcher', async () => {
  const stateFile = `/tmp/manya-7x7-d24c-${Date.now()}.json`;
  // Create
  const createR = await runCli(['identity', 'create', 'orcid', '0000-0002-1825-0097', '--metadata', '{"name":"Josiah"}'], stateFile);
  assert.equal(createR.exitCode, 0);
  const identityId = JSON.parse(createR.output).id;
  // Link a DOI
  const linkR = await runCli(['identity', 'link', identityId, 'doi', '10.1000/182', '--source', 'research-academic'], stateFile);
  assert.equal(linkR.exitCode, 0);
  assert.equal(JSON.parse(linkR.output).linked.length, 1);
  // Resolve by DOI
  const resolveR = await runCli(['identity', 'resolve', 'doi', '10.1000/182'], stateFile);
  assert.equal(resolveR.exitCode, 0);
  assert.equal(JSON.parse(resolveR.output).identity.id, identityId);
});

test('D24d: mesh dispatch via CLI - invokes validateDOI on research-academic', async () => {
  const stateFile = `/tmp/manya-7x7-d24d-${Date.now()}.json`;
  await runCli(['mesh', 'register', 'research-academic'], stateFile);
  const r = await runCli(['mesh', 'dispatch', 'citationValidation', 'validateDOI', '10.1000/182'], stateFile);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.output);
  assert.equal(out.capability, 'citationValidation');
  assert.equal(out.result.valid, true);
});

test('D24e: translate via CLI - HS code → industry', async () => {
  const stateFile = `/tmp/manya-7x7-d24e-${Date.now()}.json`;
  const r = await runCli(['translate', 'hs_code', 'industry', '300490'], stateFile);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.output);
  assert.equal(out.value, 'healthcare');
  assert.equal(out.translated, true);
});

test('D24f: generateWeaveHtml - produces self-contained HTML with embedded data', () => {
  const html = generateWeaveHtml({
    tools: [
      { toolId: 'forge', name: 'Forge', owns: ['keyDerivation'], syncChannels: ['key-rotation-event'], registeredAt: '2026-01-01T00:00:00Z' },
      { toolId: 'research-academic', name: 'Research & Academic', owns: ['citationValidation'], syncChannels: ['citation-verified'], registeredAt: '2026-01-01T00:00:00Z' },
    ],
    identities: [
      { id: 'id-test', primary: { type: 'orcid', value: '0000-0002-1825-0097' }, linked: [{ type: 'doi', value: '10.1000/182', confidence: 1, source: 'research-academic', linkedAt: '2026-01-01T00:00:00Z' }], metadata: { name: 'Test' }, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ],
    channels: [{ channel: 'key-rotation-event', owners: ['forge'] }],
  });
  // Self-contained HTML
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('Manya Weaver'));
  assert.ok(html.includes('Interactive Connection Former'));
  // Embedded data
  assert.ok(html.includes('forge'));
  assert.ok(html.includes('id-test'));
  assert.ok(html.includes('citation-verified'));
  // Should embed the canConnect rules engine
  assert.ok(html.includes('canConnect'));
  // No external dependencies (no <script src="...">)
  assert.ok(!html.includes('<script src='));
});

test('D24g: knownToolIds - returns all 8 CLI-registerable tools', () => {
  const ids = knownToolIds();
  assert.ok(ids.includes('forge'));
  assert.ok(ids.includes('pulse'));
  assert.ok(ids.includes('primary-sector'));
  assert.ok(ids.includes('cybersecurity'));
  assert.ok(ids.includes('transport-logistics'));
  assert.ok(ids.includes('research-academic'));
  assert.ok(ids.includes('unify'));
  assert.ok(ids.includes('lycon-browser'));
});


// ===================================================================
// DIMENSION 25: Serve & Repl - HTTP Server + SSE Stream + Interactive Shell
// ===================================================================
// The runtime surfaces that make Manya accessible from any client.

// -- Helper: boot a server on a random port for the D25 tests --
let d25Server;
let d25BaseUrl;

test('D25a: startServer boots and serves /api/health', async () => {
  d25Server = await startServer({ port: 0, host: '127.0.0.1' });
  const addr = d25Server.server.address();
  d25BaseUrl = `http://127.0.0.1:${addr.port}`;
  assert.ok(d25BaseUrl);
  const res = await fetch(d25BaseUrl + '/api/health');
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
});

test('D25b: GET /api/mesh returns auto-registered tools', async () => {
  assert.ok(d25BaseUrl, 'D25a must run first');
  const res = await fetch(d25BaseUrl + '/api/mesh');
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.count >= 5);
  assert.ok(body.tools.some(t => t.toolId === 'research-academic'));
});

test('D25c: POST /api/mesh/dispatch invokes a capability call', async () => {
  assert.ok(d25BaseUrl);
  const res = await fetch(d25BaseUrl + '/api/mesh/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capability: 'citationValidation', method: 'validateDOI', args: ['10.1000/182'] }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.result.valid, true);
});

test('D25d: POST /api/identities + GET /api/identities/resolve roundtrip', async () => {
  assert.ok(d25BaseUrl);
  const createRes = await fetch(d25BaseUrl + '/api/identities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'orcid', value: '0000-0003-1415-9265', metadata: { name: 'D25 Test' } }),
  });
  const created = await createRes.json();
  assert.equal(createRes.status, 201);
  const resolveRes = await fetch(d25BaseUrl + '/api/identities/resolve?type=orcid&value=0000-0003-1415-9265');
  const resolved = await resolveRes.json();
  assert.equal(resolved.resolved, true);
  assert.equal(resolved.identity.id, created.id);
});

test('D25e: POST /api/bus/route routes via tool sync channels', async () => {
  assert.ok(d25BaseUrl);
  const res = await fetch(d25BaseUrl + '/api/bus/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolId: 'research-academic', type: 'review-submitted', payload: { ms: 'ms-001' } }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.routes.length >= 5);
});

test('D25f: SSE /api/events streams published events', async () => {
  assert.ok(d25BaseUrl);
  const res = await fetch(d25BaseUrl + '/api/events');
  assert.equal(res.status, 200);
  const reader = res.body.getReader();
  const { value: chunk1 } = await reader.read();
  assert.ok(new TextDecoder().decode(chunk1).includes('connected'));
  await fetch(d25BaseUrl + '/api/bus/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'citation-verified', type: 'd25-test', payload: { x: 1 } }),
  });
  const { value: chunk2 } = await reader.read();
  const text2 = new TextDecoder().decode(chunk2);
  assert.ok(text2.includes('citation-verified'));
  await reader.cancel();
});

test('D25g: REPL processes commands interactively', async () => {
  const { Readable, Writable } = await import('node:stream');
  let output = '';
  const input = Readable.from(['mesh register-all\n', 'mesh list\n', ':quit\n']);
  const out = new Writable({ write(chunk, enc, cb) { output += chunk.toString(); cb(); } });
  await startRepl({
    input,
    output: out,
    process: { stdin: input, stdout: out, stderr: out, env: {} },
  });
  assert.match(output, /Manya REPL v0\.6\.0/);
  assert.match(output, /"count"/);
  assert.match(output, /research-academic/);
  assert.match(output, /Goodbye/);
});

test('D25 cleanup: shutdown server', async () => {
  if (d25Server) await new Promise((r) => d25Server.server.close(r));
  assert.ok(true);
});


// ===================================================================
// DIMENSION 26: Lycon Browser - Privacy Browser Integration with Manya Unify
// ===================================================================
// The privacy-first browser wired into the ecosystem via the Manya event bus.

test('D26a: lyconManifest has correct identity and 6 capabilities', () => {
  assert.equal(lyconManifest.id, 'lycon-browser');
  assert.equal(lyconManifest.name, 'Lycon Browser');
  assert.equal(lyconManifest.foundation, 'Manya');
  assert.equal(lyconManifest.owns.length, 6);
  assert.ok(lyconManifest.owns.includes('webBrowsing'));
  assert.ok(lyconManifest.owns.includes('adBlocking'));
  assert.ok(lyconManifest.owns.includes('bookmarkManagement'));
  assert.ok(lyconManifest.owns.includes('downloadManagement'));
  assert.ok(lyconManifest.owns.includes('privateBrowsing'));
  assert.ok(lyconManifest.owns.includes('browserHistoryManagement'));
});

test('D26b: createAdapter + forward - navigation event flows to bus', () => {
  _resetMesh();
  _resetFederation();
  registerTool({ manifest: lyconManifest, api: {} });
  const bus = createBus({ replay: true });
  const adapter = createLyconAdapter({ bus });
  let received = null;
  subscribe(bus, 'lycon:navigation', (evt) => { received = evt; });
  adapter.forward('lycon:navigation', createNavigationEvent({ tabId: 't1', url: 'https://example.com' }));
  assert.ok(received);
  assert.equal(received.payload.url, 'https://example.com');
  assert.equal(received.sourceToolId, 'lycon-browser');
  assert.equal(received.payload.sessionId, adapter.sessionId);
});

test('D26c: createAdapter + forward - shield-blocked event flows to bus', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  let received = null;
  subscribe(bus, 'lycon:shield-blocked', (evt) => { received = evt; });
  adapter.forward('lycon:shield-blocked', createShieldBlockedEvent({ tabId: 't1', url: 'https://ads.example.com/track.js' }));
  assert.ok(received);
  assert.equal(received.payload.url, 'https://ads.example.com/track.js');
  assert.equal(received.payload.filter, 'easylist');
});

test('D26d: linkIdentity - browser profile links to federated identity', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  let identityEvent = null;
  subscribe(bus, 'lycon:identity-linked', (evt) => { identityEvent = evt; });
  const result = adapter.linkIdentity('profile-default', 'id-josiah');
  assert.equal(result.linked, true);
  assert.equal(adapter.resolveIdentity('profile-default'), 'id-josiah');
  assert.ok(identityEvent);
  assert.equal(identityEvent.payload.identityId, 'id-josiah');
});

test('D26e: forward rejects unknown channel', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  assert.throws(() => adapter.forward('lycon:bogus', {}), /Unknown Lycon sync channel/);
});

test('D26f: LYCON_SYNC_CHANNELS matches lyconManifest.syncChannels', () => {
  for (const ch of LYCON_SYNC_CHANNELS) {
    assert.ok(lyconManifest.syncChannels.includes(ch), `manifest should declare ${ch}`);
  }
  assert.equal(LYCON_SYNC_CHANNELS.length, lyconManifest.syncChannels.length);
});

test('D26g: full browsing session - navigation + shield + bookmark + download + identity-link', () => {
  _resetMesh();
  _resetFederation();
  registerTool({ manifest: lyconManifest, api: {} });
  const bus = createBus({ replay: true });
  const adapter = createLyconAdapter({ bus });
  const received = [];
  for (const ch of LYCON_SYNC_CHANNELS) {
    subscribe(bus, ch, (evt) => received.push(evt));
  }
  // Simulate a browsing session
  adapter.forward('lycon:navigation', createNavigationEvent({ tabId: 't1', url: 'https://example.com' }));
  adapter.forward('lycon:shield-blocked', createShieldBlockedEvent({ tabId: 't1', url: 'https://ads.example.com/track.js' }));
  adapter.forward('lycon:bookmark-added', createBookmarkEvent({ url: 'https://example.com', title: 'Example' }));
  adapter.forward('lycon:download', createDownloadEvent({ url: 'https://example.com/file.pdf', filename: 'file.pdf', total: 1024, state: 'completed' }));
  adapter.linkIdentity('profile-default', 'id-josiah');
  // All 5 events should have been received
  assert.equal(received.length, 5);
  // All events carry the adapter's sessionId
  for (const evt of received) {
    assert.equal(evt.payload.sessionId, adapter.sessionId);
    assert.equal(evt.sourceToolId, 'lycon-browser');
  }
  // The identity link should be resolvable
  assert.equal(adapter.resolveIdentity('profile-default'), 'id-josiah');
});


// ===================================================================
// DIMENSION 27: Lycon Deep Integration - Shield Intel, Identity Panel, Private Sessions
// ===================================================================
// The three deep-integration features that wire Lycon deeper into Manya.

test('D27a: shield intelligence auto-creates IOC for malicious .tk domain', () => {
  _resetMesh();
  _resetFederation();
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  const intel = createShieldIntelligence({
    adapter,
    cybersecurityApi: { createIOC: (i) => ({ ...i, id: 'ioc-1', hash: 'h1' }), classifyThreat: (t) => ({ ...t, id: 'threat-1', severity: 'medium' }) },
  });
  const result = intel.checkBlockedUrl({ url: 'https://phishing-login.tk/steal', tabId: 't1', filter: 'easylist' });
  assert.equal(result.matched, true);
  assert.ok(result.ioc);
  assert.equal(result.ioc.type, 'domain');
  assert.equal(result.ioc.value, 'phishing-login.tk');
  assert.equal(result.ioc.source, 'lycon-shields');
});

test('D27b: shield intelligence returns matched=false for benign URLs', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  const intel = createShieldIntelligence({
    adapter,
    cybersecurityApi: { createIOC: (i) => ({ ...i, id: 'ioc-1' }), classifyThreat: (t) => ({ ...t }) },
  });
  const result = intel.checkBlockedUrl({ url: 'https://ads.example.com/track.js', tabId: 't1' });
  assert.equal(result.matched, false);
  assert.equal(result.ioc, null);
});

test('D27c: identity panel - link/unlink/switch profile', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  const panel = createIdentityPanel({ adapter });
  // Initially unlinked
  assert.equal(panel.getPanelState().linked, false);
  // Link
  panel.linkCurrent('id-josiah');
  assert.equal(panel.getPanelState().linked, true);
  assert.equal(panel.getPanelState().identityId, 'id-josiah');
  // Switch profile
  panel.switchProfile('work-profile');
  assert.equal(panel.getCurrentProfile(), 'work-profile');
  assert.equal(panel.getPanelState().linked, false); // work-profile is unlinked
  // Unlink (already unlinked for work-profile, should return false)
  assert.equal(panel.unlinkCurrent(), false);
});

test('D27d: private session factory - create + end session', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  const factory = createPrivateSessionFactory({ adapter });
  assert.equal(factory.activeCount(), 0);
  // Create session
  const session = factory.createSession();
  assert.ok(session.sessionId.startsWith('private-'));
  assert.ok(session.profileId.startsWith('private-'));
  assert.ok(session.identityId);
  assert.equal(factory.activeCount(), 1);
  // Profile should be linked
  assert.equal(adapter.resolveIdentity(session.profileId), session.identityId);
  // End session
  const result = factory.endSession(session.sessionId);
  assert.equal(result.ended, true);
  assert.equal(factory.activeCount(), 0);
  // Profile should be unlinked
  assert.equal(adapter.resolveIdentity(session.profileId), null);
});

test('D27e: private session with unify creates real federated identity', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  const mockUnify = {
    createIdentity({ type, value, metadata }) {
      return {
        id: `id-${value}`,
        primary: { type, value, addedAt: new Date().toISOString() },
        linked: [],
        metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  };
  const factory = createPrivateSessionFactory({ adapter, unify: mockUnify });
  const session = factory.createSession();
  // identityId should be derived from sessionId via mock createIdentity
  assert.ok(session.identityId.startsWith('id-private-'));
});

test('D27f: shield intelligence processShieldBlock forwards + checks', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  const intel = createShieldIntelligence({
    adapter,
    cybersecurityApi: { createIOC: (i) => ({ ...i, id: 'ioc-1' }), classifyThreat: (t) => ({ ...t, severity: 'medium' }) },
  });
  let forwarded = null;
  subscribe(bus, 'lycon:shield-blocked', (e) => { forwarded = e; });
  const result = intel.processShieldBlock(
    createShieldBlockedEvent({ tabId: 't1', url: 'https://phishing.tk/x', filter: 'easylist' })
  );
  assert.ok(result.forwarded);
  assert.equal(result.intelligence.matched, true);
  assert.ok(forwarded);
  assert.equal(forwarded.payload.url, 'https://phishing.tk/x');
});

test('D27g: end-to-end — private session + identity panel + shield intelligence', () => {
  _resetMesh();
  _resetFederation();
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  const panel = createIdentityPanel({ adapter });
  const privateFactory = createPrivateSessionFactory({ adapter });
  const shieldIntel = createShieldIntelligence({
    adapter,
    cybersecurityApi: { createIOC: (i) => ({ ...i, id: 'ioc-1' }), classifyThreat: (t) => ({ ...t, severity: 'medium' }) },
  });
  // 1. Start a private session
  const session = privateFactory.createSession();
  assert.ok(session.identityId);
  // 2. Switch panel to the private profile and link
  panel.switchProfile(session.profileId);
  panel.linkCurrent(session.identityId);
  assert.equal(panel.getPanelState().linked, true);
  // 3. Shield block on a malicious URL
  const result = shieldIntel.processShieldBlock(
    createShieldBlockedEvent({ tabId: 't1', url: 'https://phishing.tk/steal', filter: 'easylist' })
  );
  assert.equal(result.intelligence.matched, true);
  // 4. End the private session
  privateFactory.endSession(session.sessionId);
  assert.equal(privateFactory.activeCount(), 0);
  // 5. Panel should now show unlinked
  assert.equal(panel.getPanelState().linked, false);
});


// ===================================================================
// DIMENSION 28: Weaver Rules - Connection Rules Engine
// ===================================================================
// The intelligence that knows what can connect to what.

test('D28a: canConnect - identity ↔ primary type returns edgeType=primary', () => {
  const identity = { id: 'identity:id-1', kind: 'identity', label: 'Josiah', identityId: 'id-1', primaryType: 'orcid', linkedTypes: ['doi'] };
  const type = { id: 'type:orcid', kind: 'type', label: 'orcid', typeId: 'orcid' };
  const result = canConnect(identity, type, {});
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'primary');
  assert.equal(result.strength, 1.0);
});

test('D28b: canConnect - tool ↔ tool with shared sync channel', () => {
  const toolA = { id: 'tool:a', kind: 'tool', label: 'A', toolId: 'a', syncChannels: ['shared'], handsOff: [], owns: [] };
  const toolB = { id: 'tool:b', kind: 'tool', label: 'B', toolId: 'b', syncChannels: ['shared'], handsOff: [], owns: [] };
  const result = canConnect(toolA, toolB, {});
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'sync-channel');
});

test('D28c: canConnect - tool ↔ type via validating capability', () => {
  const tool = { id: 'tool:research-academic', kind: 'tool', label: 'Research', toolId: 'research-academic' };
  const type = { id: 'type:orcid', kind: 'type', label: 'orcid', typeId: 'orcid' };
  const result = canConnect(tool, type, {});
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'validates');
});

test('D28d: canConnect - type ↔ type is never possible', () => {
  const typeA = { id: 'type:orcid', kind: 'type', typeId: 'orcid' };
  const typeB = { id: 'type:doi', kind: 'type', typeId: 'doi' };
  const result = canConnect(typeA, typeB, {});
  assert.equal(result.possible, false);
});

test('D28e: canConnect - identity ↔ identity sharing a type', () => {
  const idA = { id: 'identity:a', kind: 'identity', label: 'A', identityId: 'a', primaryType: 'orcid', linkedTypes: ['doi'] };
  const idB = { id: 'identity:b', kind: 'identity', label: 'B', identityId: 'b', primaryType: 'ror', linkedTypes: ['doi'] };
  const result = canConnect(idA, idB, {});
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'shared-type');
});

test('D28f: findPotentialConnections returns all possible pairs', () => {
  const nodes = [
    { id: 'tool:forge', kind: 'tool', label: 'Forge', toolId: 'forge', owns: ['keyDerivation'], handsOff: [], syncChannels: ['key-rotation-event'] },
    { id: 'tool:research-academic', kind: 'tool', label: 'Research', toolId: 'research-academic', owns: ['citationValidation'], handsOff: ['keyDerivation'], syncChannels: ['citation-verified'] },
    { id: 'type:orcid', kind: 'type', typeId: 'orcid' },
  ];
  const ctx = buildWeaverContext(
    [{ toolId: 'forge', owns: ['keyDerivation'] }, { toolId: 'research-academic', owns: ['citationValidation'] }],
    []
  );
  const potentials = findPotentialConnections(nodes, { ...ctx, existingEdges: [] });
  assert.ok(potentials.length > 0);
  for (const p of potentials) {
    assert.equal(p.rule.possible, true);
  }
});

test('D28g: getTypeToToolMap returns orcid → research-academic', () => {
  const map = getTypeToToolMap();
  assert.equal(map.orcid, 'research-academic');
  assert.equal(map.imo, 'transport-logistics');
});


// ===================================================================
// DIMENSION 29: UPMP - Activity Tracking & Intelligence Engagement
// ===================================================================
// Universal Progress Monitoring wired into the Manya event bus.

test('D29a: upmpManifest has correct identity and 6 capabilities', () => {
  assert.equal(upmpManifest.id, 'upmp');
  assert.equal(upmpManifest.name, 'UPMP');
  assert.equal(upmpManifest.foundation, 'Manya');
  assert.equal(upmpManifest.owns.length, 6);
  assert.ok(upmpManifest.owns.includes('activityTracking'));
  assert.ok(upmpManifest.owns.includes('intelligenceEngagement'));
  assert.ok(upmpManifest.syncChannels.includes('upmp:session-started'));
});

test('D29b: createAdapter + startSession forwards to bus', () => {
  const bus = createBus();
  const adapter = createUpmpAdapter({ bus });
  let received = null;
  subscribe(bus, 'upmp:session-started', (e) => { received = e; });
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  assert.ok(received);
  assert.equal(received.payload.activityType, 'writing');
  assert.equal(received.sourceToolId, 'upmp');
});

test('D29c: recordStuckPoint + resolveStuckPoint fires breakthrough', () => {
  const bus = createBus();
  const adapter = createUpmpAdapter({ bus });
  let breakthrough = null;
  subscribe(bus, 'upmp:breakthrough', (e) => { breakthrough = e; });
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  const stuck = adapter.recordStuckPoint('can\'t find hook');
  adapter.resolveStuckPoint(stuck.id, { resolutionType: 'breakthrough' });
  assert.ok(breakthrough);
  assert.equal(breakthrough.payload.intelligence, 'linguistic');
});

test('D29d: recordDiscovery forwards to bus', () => {
  const bus = createBus();
  const adapter = createUpmpAdapter({ bus });
  let received = null;
  subscribe(bus, 'upmp:discovery', (e) => { received = e; });
  adapter.startSession({ activityType: 'writing' });
  adapter.recordDiscovery({ type: 'post', url: 'https://example.com', note: 'test' });
  assert.ok(received);
  assert.equal(received.payload.type, 'post');
});

test('D29e: intelligence engagement increments on session start', () => {
  const bus = createBus();
  const adapter = createUpmpAdapter({ bus });
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  adapter.endSession();
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  adapter.endSession();
  const intel = adapter.getIntelligences().find(i => i.key === 'linguistic');
  assert.equal(intel.sessions, 2);
});

test('D29f: linkIntelligenceToIdentity federates intelligences', () => {
  const bus = createBus();
  const adapter = createUpmpAdapter({ bus });
  adapter.linkIntelligenceToIdentity('linguistic', 'id-josiah');
  assert.equal(adapter.resolveIntelligenceIdentity('linguistic'), 'id-josiah');
  const links = adapter.listIntelligenceLinks();
  assert.equal(links.length, 1);
});

test('D29g: full session E2E — stuck + discovery + breakthrough + end', () => {
  const bus = createBus({ replay: true });
  const adapter = createUpmpAdapter({ bus });
  const received = [];
  for (const ch of UPMP_SYNC_CHANNELS) {
    subscribe(bus, ch, (e) => received.push(e));
  }
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  const stuck = adapter.recordStuckPoint('stuck');
  adapter.recordDiscovery({ type: 'post', note: 'found', relatedStuckId: stuck.id });
  adapter.resolveStuckPoint(stuck.id, { resolutionType: 'breakthrough' });
  adapter.endSession('done');
  assert.ok(received.length >= 7);
  const topics = received.map(e => e.topic);
  assert.ok(topics.includes('upmp:session-started'));
  assert.ok(topics.includes('upmp:breakthrough'));
  assert.ok(topics.includes('upmp:session-ended'));
});
