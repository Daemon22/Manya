/**
 * Manya 7x7 Performance Test Suite — v12
 *
 * 23 dimensions x 7 test scenarios = 162 comprehensive tests
 * Covering all core functions across the entire Manya ecosystem
 *
 * Dimensions:
 *   1-16. (existing tools)
 *  17. Unify - Federation, Event Bus, Mesh & Vocabularies
 *  18. CLI - Argument Parsing, Command Dispatch & Weave Generation
 *  19. Serve & Repl - HTTP Server + SSE Stream + Interactive Shell
 *  20. Lycon Browser - Privacy Browser Integration
 *  21. Lycon Deep Integration - Shield Intel, Identity Panel, Private Sessions
 *  22. Weaver Rules - Connection Rules Engine (canConnect, findPotentialConnections)
 *  23. UPMP - Activity Tracking, Stuck Points, Discoveries, Intelligence Engagement
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';

const require = createRequire(import.meta.url);

// -- Toolkit imports --
import {
  MANYA_FOUNDATION,
  capabilityOwners,
  createToolManifest,
  assertDistinctCapabilities,
  usingaManifest,
  helixFlowManifest,
  forgeManifest,
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
// DIMENSION 1: Toolkit - Manifests & Boundaries
// ===================================================================

test('D1a: MANYA_FOUNDATION - has name and principle', () => {
  assert.equal(MANYA_FOUNDATION.name, 'Manya');
  assert.ok(MANYA_FOUNDATION.principle.length > 0);
});

test('D1b: createToolManifest - requires id, name, purpose', () => {
  assert.throws(() => createToolManifest({ id: 'x' }));
  assert.throws(() => createToolManifest({ id: 'x', name: 'X' }));
  const m = createToolManifest({ id: 'x', name: 'X', purpose: 'test' });
  assert.equal(m.id, 'x');
  assert.equal(m.foundation, 'Manya');
});

test('D1c: createToolManifest - result is frozen', () => {
  const m = createToolManifest({ id: 'x', name: 'X', purpose: 'test' });
  assert.throws(() => { m.id = 'changed'; });
});

test('D1d: assertDistinctCapabilities - all manifests are distinct', () => {
  const result = assertDistinctCapabilities([usingaManifest, helixFlowManifest, forgeManifest, stampManifest, vaultManifest, lensManifest, shieldManifest, signalManifest, pulseManifest, primarySectorManifest, cybersecurityManifest]);
  assert.equal(result.distinct, true);
  assert.deepEqual(result.overlaps, []);
});

test('D1e: assertDistinctCapabilities - detects overlap', () => {
  const result = assertDistinctCapabilities([
    usingaManifest,
    { ...helixFlowManifest, owns: [...helixFlowManifest.owns, 'apiKeyVault'] },
  ]);
  assert.equal(result.distinct, false);
  assert.equal(result.overlaps[0].capability, 'apiKeyVault');
});

test('D1f: capabilityOwners - maps all capabilities to tool IDs', () => {
  assert.equal(capabilityOwners.apiKeyVault, 'usinga-api-nexus');
  assert.equal(capabilityOwners.workflowDagBuilder, 'helixflow');
  assert.equal(capabilityOwners.keyDerivation, 'forge');
  assert.equal(capabilityOwners.passphraseStrength, 'forge');
  assert.equal(capabilityOwners.multiAlgorithmHash, 'forge');
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

test('D1g: manifests - own and handOff are consistent across all tools', () => {
  const allManifests = [usingaManifest, helixFlowManifest, forgeManifest, stampManifest, vaultManifest, lensManifest, shieldManifest, signalManifest, pulseManifest, primarySectorManifest, cybersecurityManifest];
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
// DIMENSION 2: HelixFlow SDK - Workflow Construction & Validation
// ===================================================================

test('D2a: createWorkflowDefinition - creates valid workflow', () => {
  const wf = createWorkflowDefinition({
    name: 'Test Flow',
    nodes: [{ id: 'start', type: 'trigger', label: 'Start' }],
    edges: [],
  });
  assert.equal(wf.name, 'Test Flow');
  assert.equal(wf.status, 'draft');
  assert.equal(wf.failurePolicy, 'stop_workflow');
});

test('D2b: createUsingaConnectionRef - prefixes correctly', () => {
  assert.equal(createUsingaConnectionRef('crm'), 'usinga:crm');
  assert.equal(createUsingaConnectionRef('usinga:crm'), 'usinga:crm');
});

test('D2c: createUsingaConnectionRef - rejects empty input', () => {
  assert.throws(() => createUsingaConnectionRef(''));
  assert.throws(() => createUsingaConnectionRef());
});

test('D2d: createApiRequestNode - requires uSINGA connection ref', () => {
  assert.throws(() => createApiRequestNode({ id: 'api', label: 'API', connectionRef: 'raw-key' }));
  const node = createApiRequestNode({ id: 'api', label: 'API', connectionRef: 'usinga:crm' });
  assert.equal(node.type, 'api');
  assert.equal(node.config.connectionRef, 'usinga:crm');
});

test('D2e: validateWorkflowShape - valid workflow passes', () => {
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

test('D2f: validateWorkflowShape - detects missing name and nodes', () => {
  const result = validateWorkflowShape({ nodes: [], edges: [] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /name/i.test(e)));
  assert.ok(result.errors.some(e => /node/i.test(e)));
});

test('D2g: validateWorkflowShape - detects unknown edge source/target', () => {
  const result = validateWorkflowShape({
    name: 'Bad edges',
    nodes: [{ id: 'a', type: 'trigger', label: 'A' }],
    edges: [{ source: 'a', target: 'nonexistent' }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /nonexistent/i.test(e)));
});


// ===================================================================
// DIMENSION 3: Hawk - Device Detection & Fingerprinting
// ===================================================================

const mockEnv = (ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36') => ({
  navigator: { userAgent: ua, language: 'en-US', languages: ['en-US'], onLine: true, cookieEnabled: true, maxTouchPoints: 0, hardwareConcurrency: 8, deviceMemory: 8 },
  matchMedia: () => ({ matches: false }),
});

test('D3a: parseUserAgent - detects Chrome on Windows', () => {
  const info = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
  assert.equal(info.browser, 'Chrome');
  assert.equal(info.os, 'Windows');
  assert.equal(info.type, 'desktop');
  assert.equal(info.isBot, false);
});

test('D3b: parseUserAgent - detects mobile device', () => {
  const info = parseUserAgent('Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36');
  assert.equal(info.type, 'mobile');
  assert.equal(info.os, 'Android');
  assert.ok(['Samsung', 'Apple', 'unknown'].includes(info.brand), `Expected Samsung/Apple/unknown, got ${info.brand}`);
});

test('D3c: parseUserAgent - detects bot', () => {
  const info = parseUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)');
  assert.equal(info.isBot, true);
  assert.equal(info.type, 'bot');
});

test('D3d: detectDevice - returns structured info with mock env', () => {
  const env = mockEnv();
  const info = detectDevice(env);
  assert.equal(info.browser, 'Chrome');
  assert.equal(info.os, 'Windows');
  assert.equal(info.language, 'en-US');
  assert.equal(info.onLine, true);
});

test('D3e: detectCapabilities - returns capability flags in Node', () => {
  const caps = detectCapabilities();
  assert.equal(typeof caps.screen.supported, 'boolean');
  assert.equal(typeof caps.touch.supported, 'boolean');
  assert.equal(typeof caps.webgl.supported, 'boolean');
  assert.equal(typeof caps.sw.supported, 'boolean');
});

test('D3f: generateFingerprint - produces consistent hash', () => {
  const fp1 = generateFingerprint();
  const fp2 = generateFingerprint();
  assert.equal(fp1.hash, fp2.hash);
  assert.ok(fp1.hash.length > 0);
  assert.ok(fp1.timestamp > 0);
});

test('D3g: hawk.snapshot - combines all detection methods', () => {
  const snap = hawk.snapshot(mockEnv());
  assert.ok(snap.device, 'snapshot should have device');
  assert.ok(snap.capabilities, 'snapshot should have capabilities');
  assert.ok(snap.fingerprint, 'snapshot should have fingerprint');
  assert.ok(snap.timestamp > 0, 'snapshot should have timestamp');
  assert.equal(snap.device.browser, 'Chrome');
});


// ===================================================================
// DIMENSION 4: Forge - Key Derivation & Passphrase Strength
// ===================================================================

test('D4a: scorePassphrase - scores weak passphrase correctly', () => {
  const result = scorePassphrase('password');
  assert.ok(result.score < 40, `Expected weak score, got ${result.score}`);
  assert.ok(['weak', 'fair'].includes(result.level), `Expected weak/fair level, got ${result.level}`);
  assert.ok(result.checks.noCommonPattern === false, 'Should detect common pattern');
  assert.ok(result.suggestions.length > 0, 'Should have suggestions for weak password');
});

test('D4b: scorePassphrase - scores strong passphrase correctly', () => {
  const result = scorePassphrase('K#9m$pL2xQ!vR7nZ');
  assert.ok(result.score >= 60, `Expected strong score, got ${result.score}`);
  assert.ok(['strong', 'excellent', 'good'].includes(result.level), `Expected good+ level, got ${result.level}`);
  assert.ok(result.entropy > 50, `Expected high entropy, got ${result.entropy}`);
  assert.ok(result.checks.length, 'Should pass length check');
  assert.ok(result.checks.uppercase, 'Should pass uppercase check');
  assert.ok(result.checks.numbers, 'Should pass numbers check');
  assert.ok(result.checks.symbols, 'Should pass symbols check');
});

test('D4c: deriveKeyPair - produces valid 32-byte key with salt', () => {
  const result = deriveKeyPair(PASS);
  assert.equal(result.key.length, 32);
  assert.equal(result.salt.length, 16);
  assert.equal(result.iterations, 600000);
  assert.ok(result.derivedAt);
});

test('D4d: deriveKeyPair - different salts produce different keys', () => {
  const r1 = deriveKeyPair(PASS);
  const r2 = deriveKeyPair(PASS);
  assert.notDeepEqual(r1.key, r2.key);
  assert.notDeepEqual(r1.salt, r2.salt);
});

test('D4e: deriveKeyPairAsync - async matches sync with same salt', async () => {
  const salt = Buffer.alloc(16, 0xcd);
  const sync = deriveKeyPair(PASS, salt);
  const async = await deriveKeyPairAsync(PASS, salt);
  assert.deepEqual(sync.key, async.key);
});

test('D4f: rotateKey - produces both old and new keys', () => {
  const salt = Buffer.alloc(16, 0xab);
  const result = rotateKey('old-passphrase-123', 'new-passphrase-456', salt);
  assert.equal(result.oldKey.length, 32);
  assert.equal(result.newKey.length, 32);
  assert.notDeepEqual(result.oldKey, result.newKey);
});

test('D4g: hash - supports multiple algorithms', () => {
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
// DIMENSION 5: Stamp - Timestamping & Audit Trails
// ===================================================================

test('D5a: stamp - creates proof with correct structure', () => {
  const data = Buffer.from('important document content');
  const proof = stampProof(data);
  assert.ok(proof.hash.length > 0);
  assert.equal(proof.algorithm, 'sha256');
  assert.ok(proof.timestamp);
  assert.ok(proof.nonce.length > 0);
  assert.equal(proof.issuer, 'manya');
  assert.equal(proof.version, 1);
});

test('D5b: stamp + verify - roundtrip verification', () => {
  const data = Buffer.from('verifiable document');
  const proof = stampProof(data);
  const result = verifyStamp(proof, data);
  assert.equal(result.valid, true);
  assert.equal(result.hash, proof.hash);
});

test('D5c: stamp + verify - tampered data detected', () => {
  const data = Buffer.from('original data');
  const proof = stampProof(data);
  const tampered = Buffer.from('modified data');
  const result = verifyStamp(proof, tampered);
  assert.equal(result.valid, false);
});

test('D5d: buildChain - creates provenance chain', () => {
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

test('D5e: buildChain + verifyChain - valid chain passes', () => {
  const entries = Array.from({ length: 5 }, (_, i) => ({
    data: Buffer.from(`entry-${i}`),
    label: `Step ${i}`,
  }));
  const chain = buildChain(entries);
  const result = verifyChain(chain);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('D5f: buildTrail + verifyTrail - audit trail integrity', () => {
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

test('D5g: stamp - custom issuer and algorithm', () => {
  const data = Buffer.from('custom stamp test');
  const proof = stampProof(data, { issuer: 'legal-dept', algorithm: 'sha256' });
  assert.equal(proof.issuer, 'legal-dept');
  assert.equal(proof.algorithm, 'sha256');
});


// ===================================================================
// DIMENSION 6: Vault - Encrypted Key-Value Store
// ===================================================================

test('D6a: vault create + put + get - basic operations', () => {
  const v = vaultCreate('test-vault');
  vaultPut(v, 'api-key', 'sk-1234567890');
  assert.equal(vaultGet(v, 'api-key'), 'sk-1234567890');
  assert.equal(vaultSize(v), 1);
});

test('D6b: vault put + get - object values', () => {
  const v = vaultCreate('config-vault');
  vaultPut(v, 'database', { host: 'db.example.com', port: 5432, ssl: true });
  const val = vaultGet(v, 'database');
  assert.equal(val.host, 'db.example.com');
  assert.equal(val.port, 5432);
  assert.equal(val.ssl, true);
});

test('D6c: vault seal + open - encrypted roundtrip', () => {
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

test('D6d: vault seal + open - wrong passphrase fails', () => {
  const v = vaultCreate('fail-vault');
  vaultPut(v, 'key', 'value');
  const sealed = vaultSeal(v, PASS);
  assert.throws(() => vaultOpen(sealed, 'wrong-passphrase-x'), /Failed to decrypt/);
});

test('D6e: vault del + has + keys - CRUD operations', () => {
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

test('D6f: vault search - tag-based search', () => {
  const v = vaultCreate('tagged-vault');
  vaultPut(v, 'aws-key', 'AKIA...', { tags: ['cloud', 'aws'] });
  vaultPut(v, 'gcp-key', 'gcp...', { tags: ['cloud', 'gcp'] });
  vaultPut(v, 'local-config', 'dev', { tags: ['local'] });
  const results = vaultSearch(v, ['cloud']);
  assert.equal(results.length, 2);
});

test('D6g: vault - large scale: 100 entries seal/open roundtrip', () => {
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
// DIMENSION 7: Lens - Data Inspection & Redaction
// ===================================================================

test('D7a: detect - identifies JSON data', () => {
  const result = lensDetect(Buffer.from('{"name":"test","value":42}'));
  assert.equal(result.format, 'json');
  assert.equal(result.binary, false);
});

test('D7b: detect - identifies CSV data', () => {
  const csv = 'name,age,city\nAlice,30,NYC\nBob,25,LA\nCarol,35,SF';
  const result = lensDetect(Buffer.from(csv));
  assert.equal(result.format, 'csv');
});

test('D7c: redact - removes PII patterns', () => {
  const text = 'Contact john@example.com or call 555-123-4567. SSN: 123-45-6789';
  const result = redact(text, { rules: ['pii'] });
  assert.ok(result.count >= 2, `Expected at least 2 redactions, got ${result.count}`);
  assert.ok(!result.redacted.includes('john@example.com'));
  assert.ok(!result.redacted.includes('123-45-6789'));
});

test('D7d: scan - detects sensitive data without modifying', () => {
  const text = 'Email: admin@corp.com and user@test.org';
  const result = scan(text, ['pii']);
  assert.ok(result.total >= 2);
  assert.ok(result.findings.some(f => f.type === 'EMAIL'));
});

test('D7e: classify - identifies restricted content', () => {
  const text = 'This document contains HIPAA protected health information and patient records.';
  const result = classify(text);
  assert.equal(result.level, 'restricted');
  assert.ok(result.score >= 85);
  assert.ok(result.recommendations.length > 0);
});

test('D7f: classify - identifies public content', () => {
  const text = 'This is a public press release about our marketing strategy for the new product launch.';
  const result = classify(text);
  assert.ok(['public', 'internal'].includes(result.level), `Expected public/internal, got ${result.level}`);
});

test('D7g: profile - statistical analysis', () => {
  const data = Buffer.from('Hello, World! This is a test string with some entropy.');
  const result = profile(data);
  assert.ok(result.size > 0);
  assert.ok(result.entropy > 0);
  assert.equal(result.format, 'text');
  assert.ok(result.printableRatio > 0.9);
});


// ===================================================================
// DIMENSION 8: Shield - Access Control & RBAC
// ===================================================================

test('D8a: createPolicy + defineRole + grant - setup policy', () => {
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

test('D8b: registerSubject + assignRole + checkAccess - RBAC flow', () => {
  const policy = createPolicy('finance-rbac');
  defineRole(policy, 'trader', { description: 'Can trade' });
  grant(policy, 'trader', [{ resource: 'trades', actions: ['read', 'execute'] }]);
  registerSubject(policy, 'alice', { roles: ['trader'] });
  assignRole(policy, 'alice', 'trader');
  const result = checkAccess(policy, 'alice', 'trades', 'execute');
  assert.equal(result.allowed, true);
});

test('D8c: checkAccess - denies unauthorized access', () => {
  const policy = createPolicy('strict-policy', { defaultAction: 'deny' });
  defineRole(policy, 'viewer', { description: 'Read only' });
  grant(policy, 'viewer', [{ resource: 'reports', actions: ['read'] }]);
  registerSubject(policy, 'bob', { roles: ['viewer'] });
  assignRole(policy, 'bob', 'viewer');
  const result = checkAccess(policy, 'bob', 'reports', 'delete');
  assert.equal(result.allowed, false);
});

test('D8d: checkAccess - wildcard resource patterns', () => {
  const policy = createPolicy('wildcard-policy');
  defineRole(policy, 'admin');
  grant(policy, 'admin', [{ resource: 'documents:*', actions: ['read', 'write', 'delete'] }]);
  registerSubject(policy, 'admin-user', { roles: ['admin'] });
  assignRole(policy, 'admin-user', 'admin');
  const result = checkAccess(policy, 'admin-user', 'documents:contracts:2024', 'read');
  assert.equal(result.allowed, true);
});

test('D8e: addRule + checkAccess - ABAC time-based rule', () => {
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

test('D8f: getEffectivePermissions - lists all permissions', () => {
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

test('D8g: buildAuditTrail + verifyAuditTrail - tamper-proof access log', () => {
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
// DIMENSION 9: Signal - Secure Message Envelopes
// ===================================================================

test('D9a: compose + signalSeal + signalOpen - encrypted message roundtrip', () => {
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

test('D9b: compose + signalSeal + signalOpen - wrong passphrase fails', () => {
  const envelope = compose('Secret trade signal');
  const sealed = signalSeal(envelope, PASS);
  assert.throws(() => signalOpen(sealed, 'wrong-passphrase-!'), /Failed to decrypt/);
});

test('D9c: compose + signalSign + verifySignature - RSA signature roundtrip', () => {
  const { privateKey, publicKey } = generateSigningKeys();
  const envelope = compose('Authenticated command', { sender: 'controller' });
  const signed = signalSign(envelope, privateKey);
  assert.ok(signed.signature);
  assert.equal(signed.signature.algorithm, 'RSA-SHA256');

  const result = verifySignature(signed, publicKey);
  assert.equal(result.valid, true);
});

test('D9d: verifySignature - tampered content detected', () => {
  const { privateKey, publicKey } = generateSigningKeys();
  const envelope = compose('Original message', { sender: 'alice' });
  const signed = signalSign(envelope, privateKey);
  // Tamper with the payload
  signed.payload = 'Tampered message';
  const result = verifySignature(signed, publicKey);
  assert.equal(result.valid, false);
});

test('D9e: compose + signalHmac + verifyHmac - HMAC integrity roundtrip', () => {
  const envelope = compose('IoT sensor reading: 72.5F', { sender: 'sensor-01', type: 'telemetry' });
  const authenticated = signalHmac(envelope, 'shared-secret-key');
  assert.ok(authenticated.hmac);
  assert.equal(authenticated.hmac.algorithm, 'HMAC-SHA256');

  const result = verifyHmac(authenticated, 'shared-secret-key');
  assert.equal(result.valid, true);
});

test('D9f: verifyHmac - wrong secret detected', () => {
  const envelope = compose('Data packet', { sender: 'device-42' });
  const authenticated = signalHmac(envelope, 'correct-secret');
  const result = verifyHmac(authenticated, 'wrong-secret');
  assert.equal(result.valid, false);
});

test('D9g: compose - priority levels and metadata', () => {
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
// DIMENSION 10: Pulse — Industry Presets
// ===================================================================

test('D10a: getIndustry - returns valid config for each industry', () => {
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

test('D10b: listIndustries - returns all 10 industries', () => {
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

test('D10c: createRedactionConfig - healthcare uses phi preset with mrn/npi', () => {
  const config = createRedactionConfig('healthcare');
  assert.equal(config.preset, 'phi');
  assert.ok(config.rules.includes('mrn'), 'Healthcare redaction should include mrn');
  assert.ok(config.rules.includes('npi'), 'Healthcare redaction should include npi');
  assert.ok(config.rules.length > 0, 'Healthcare redaction should have rules');
  assert.equal(config.replacement, '[REDACTED]');
});

test('D10d: createRedactionConfig - finance uses financial preset with creditCard/swiftCode', () => {
  const config = createRedactionConfig('finance');
  assert.equal(config.preset, 'financial');
  assert.ok(config.rules.includes('creditCard'), 'Finance redaction should include creditCard');
  assert.ok(config.rules.includes('swiftCode'), 'Finance redaction should include swiftCode');
  assert.ok(config.rules.length > 0, 'Finance redaction should have rules');
});

test('D10e: createIndustryPolicy - returns role templates without shield module', () => {
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

test('D10f: createAuditTemplate - finance has transaction events', () => {
  const template = createAuditTemplate('finance');
  assert.ok(template.template, 'Audit template should have a template name');
  assert.ok(template.events.length > 0, 'Finance audit should have events');
  assert.ok(template.events.includes('transaction.execute'), 'Finance audit should include transaction.execute');
  assert.ok(template.description.length > 0, 'Audit template should have a description');
});

test('D10g: createPreset - complete preset for each industry validates', () => {
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
// DIMENSION 11: Lens — Extended Industry Redaction
// ===================================================================

test('D11a: redact - legal preset redacts case numbers', () => {
  const text = 'Refer to Case No. 2024-CV-00142 and Docket #3-CR-2023';
  const result = redact(text, { rules: ['legal'] });
  assert.ok(result.count >= 1, `Expected at least 1 redaction, got ${result.count}`);
  assert.ok(!result.redacted.includes('Case No. 2024-CV-00142'), 'Case number should be redacted');
});

test('D11b: redact - education preset redacts student IDs', () => {
  const text = 'Student ID: 912345678 and SID 1234567 are on file';
  const result = redact(text, { rules: ['education'] });
  assert.ok(result.count >= 1, `Expected at least 1 redaction, got ${result.count}`);
  assert.ok(result.found.some(f => f.type === 'STUDENT_ID'), 'Should find STUDENT_ID patterns');
});

test('D11c: redact - telecom preset redacts IMEI-like patterns', () => {
  // Test that the IMEI pattern itself works
  const text = 'Device IMEI: 490154203237518 registered on network';
  const imeiResult = redact(text, { rules: ['imei'] });
  assert.ok(imeiResult.count >= 1, `Expected at least 1 IMEI redaction, got ${imeiResult.count}`);
  assert.ok(imeiResult.found.some(f => f.type === 'IMEI'), 'Should find IMEI patterns');
  // Telecom preset redacts the same text (may classify as PHONE due to overlap)
  const telecomResult = redact(text, { rules: ['telecom'] });
  assert.ok(telecomResult.count >= 1, `Telecom preset should redact, got ${telecomResult.count}`);
});

test('D11d: redact - iot preset redacts MAC addresses', () => {
  const text = 'Sensor reading from device AA:BB:CC:DD:EE:FF at noon';
  const result = redact(text, { rules: ['iot'] });
  assert.ok(result.count >= 1, `Expected at least 1 redaction, got ${result.count}`);
  assert.ok(result.found.some(f => f.type === 'MAC_ADDRESS'), 'Should find MAC_ADDRESS patterns');
  assert.ok(!result.redacted.includes('AA:BB:CC:DD:EE:FF'), 'MAC address should be redacted');
});

test('D11e: scan - financial preset finds IBAN patterns', () => {
  const text = 'Transfer to IBAN DE89370400440532013000 confirmed';
  const result = scan(text, ['financial']);
  assert.ok(result.total >= 1, `Expected at least 1 finding, got ${result.total}`);
  assert.ok(result.findings.some(f => f.type === 'IBAN'), 'Should find IBAN patterns');
});

test('D11f: PRESETS - has legal, education, telecom, iot keys', () => {
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

test('D11g: redact - healthcare phi preset finds DEA numbers', () => {
  const text = 'Prescription by provider DEANumber: BG1234567 on file';
  const result = redact(text, { rules: ['phi'] });
  assert.ok(result.count >= 1, `Expected at least 1 redaction, got ${result.count}`);
  assert.ok(result.found.some(f => f.type === 'DEA_NUMBER'), 'PHI preset should find DEA_NUMBER patterns');
});


// ===================================================================
// DIMENSION 12: Toolkit — Expanded Manifests
// ===================================================================

test('D12a: capabilityOwners - maps pulse capabilities', () => {
  assert.equal(capabilityOwners.industryPresets, 'pulse');
  assert.equal(capabilityOwners.complianceTemplates, 'pulse');
  assert.equal(capabilityOwners.industryPolicyTemplates, 'pulse');
  assert.equal(capabilityOwners.industrySignalTypes, 'pulse');
});

test('D12b: pulseManifest - has correct id and purpose', () => {
  assert.equal(pulseManifest.id, 'pulse');
  assert.equal(pulseManifest.name, 'Pulse');
  assert.ok(pulseManifest.purpose.length > 0, 'Pulse manifest should have a purpose');
  assert.equal(pulseManifest.foundation, 'Manya');
});

test('D12c: assertDistinctCapabilities - all 17 manifests are distinct (including pulse, primary-sector, cybersecurity, transport-logistics, research-academic, unify, lycon-browser, upmp)', () => {
  const allManifests = [
    usingaManifest, helixFlowManifest, forgeManifest,
    stampManifest, vaultManifest, lensManifest, shieldManifest, signalManifest,
    pulseManifest, primarySectorManifest, cybersecurityManifest,
    transportLogisticsManifest, researchAcademicManifest, unifyManifest, lyconManifest, upmpManifest,
  ];
  const result = assertDistinctCapabilities(allManifests);
  assert.equal(result.distinct, true, `Manifests overlap: ${JSON.stringify(result.overlaps)}`);
  assert.deepEqual(result.overlaps, []);
});

test('D12d: capabilityOwners - has at least 64 capabilities', () => {
  const capCount = Object.keys(capabilityOwners).length;
  assert.ok(capCount >= 64, `Expected at least 64 capabilities, got ${capCount}`);
});

test('D12e: pulseManifest - owns industryPresets and complianceTemplates', () => {
  assert.ok(pulseManifest.owns.includes('industryPresets'), 'Pulse should own industryPresets');
  assert.ok(pulseManifest.owns.includes('complianceTemplates'), 'Pulse should own complianceTemplates');
  assert.ok(pulseManifest.owns.includes('industryPolicyTemplates'), 'Pulse should own industryPolicyTemplates');
  assert.ok(pulseManifest.owns.includes('industrySignalTypes'), 'Pulse should own industrySignalTypes');
});

test('D12f: pulseManifest - handsOff does not overlap with owns', () => {
  const ownsSet = new Set(pulseManifest.owns);
  for (const cap of pulseManifest.handsOff) {
    assert.ok(!ownsSet.has(cap), `Pulse handsOff ${cap} overlaps with owns`);
  }
});

test('D12g: manifests - all manifests have consistent foundation name', () => {
  const allManifests = [
    usingaManifest, helixFlowManifest, forgeManifest,
    stampManifest, vaultManifest, lensManifest, shieldManifest, signalManifest,
    pulseManifest, primarySectorManifest, cybersecurityManifest,
    transportLogisticsManifest, researchAcademicManifest, unifyManifest, lyconManifest, upmpManifest,
  ];
  for (const m of allManifests) {
    assert.equal(m.foundation, 'Manya', `${m.name} has wrong foundation: ${m.foundation}`);
  }
});


// ===================================================================
// DIMENSION 13: Primary Sector - Validation & Compliance
// ===================================================================

test('D13a: validateCoordinates - valid GPS coordinates roundtrip', () => {
  const result = validateCoordinates({ latitude: -33.9249, longitude: 18.4241 });
  assert.equal(result.valid, true);
  assert.ok(result.normalized);
  assert.equal(result.normalized.latitude, -33.9249);
  assert.equal(result.normalized.longitude, 18.4241);
});

test('D13b: validateCommodity - agriculture wheat is valid', () => {
  const result = validateCommodity('agriculture', 'wheat', SECTORS);
  assert.equal(result.valid, true);
  assert.equal(result.commodity, 'wheat');
});

test('D13c: validateSensorReading - temperature reading validates', () => {
  const result = validateSensorReading({ type: 'temperature', value: 25.5, unit: 'celsius' });
  assert.equal(result.valid, true);
  assert.ok(result.reading.timestamp);
});

test('D13d: checkCompliance - agriculture pesticide requires applicator', () => {
  const result = checkCompliance('agriculture', { type: 'pesticide-application', timestamp: '2024-01-15T10:00:00Z' });
  assert.equal(result.compliant, false);
  assert.ok(result.issues.some(i => /applicator/i.test(i)));
});

test('D13e: createSectorPreset - mining has complete preset', () => {
  const preset = createSectorPreset('mining');
  assert.equal(preset.sector.id, 'mining');
  assert.ok(preset.commodities.includes('gold'));
  assert.ok(preset.redaction.rules.length > 0);
  assert.ok(preset.compliance.length > 0);
});

test('D13f: validateProductionReport - valid report with location', () => {
  const result = validateProductionReport({
    sectorId: 'fishing',
    commodity: 'tuna',
    quantity: 500,
    unit: 'tonne',
    location: { latitude: -34.0, longitude: 18.5 },
  });
  assert.equal(result.valid, true);
});

test('D13g: listSectors - all 4 primary sectors present', () => {
  const sectors = listSectors();
  assert.equal(sectors.length, 4);
  assert.ok(sectors.every(s => s.commodities.length > 0));
});


// ===================================================================
// DIMENSION 14: Cybersecurity - Threat Intel & Vulnerability
// ===================================================================

test('D14a: classifyThreat - critical threat classification', () => {
  const result = classifyThreat({ name: 'Log4Shell', cvssScore: 10.0 });
  assert.equal(result.severity, 'critical');
  assert.equal(result.riskLevel, 'extreme');
});

test('D14b: createIOC - IP indicator with hash', () => {
  const result = createIOC({ type: 'ip', value: '10.0.0.1', source: 'firewall' });
  assert.equal(result.type, 'ip');
  assert.ok(result.hash.length === 64);
  assert.equal(result.source, 'firewall');
});

test('D14c: calculateCVSS - critical CVSS score', () => {
  const result = calculateCVSS({
    attackVector: 'N', attackComplexity: 'L', privilegesRequired: 'N',
    userInteraction: 'N', scope: 'U', confidentiality: 'H', integrity: 'H', availability: 'H',
  });
  assert.ok(result.score >= 9.0, `Expected critical score, got ${result.score}`);
  assert.equal(result.severity, 'critical');
  assert.ok(result.vector.startsWith('CVSS:3.1/'));
});

test('D14d: createEvidence - integrity hash and chain of custody', () => {
  const evidence = createEvidence({ name: 'Access Log', type: 'log', data: 'log data here' });
  assert.ok(evidence.hash.length === 64);
  assert.equal(evidence.chainOfCustody.length, 1);
  assert.equal(evidence.state, 'collected');
});

test('D14e: verifyEvidenceIntegrity - tamper detection', () => {
  const evidence = createEvidence({ name: 'Test', data: 'original data' });
  const valid = verifyEvidenceIntegrity(evidence, 'original data');
  assert.equal(valid.valid, true);
  const tampered = verifyEvidenceIntegrity(evidence, 'tampered data');
  assert.equal(tampered.valid, false);
});

test('D14f: createIncident + escalateIncident - full incident lifecycle', () => {
  const incident = createIncident({ title: 'Breach Detected', severity: 'medium', category: 'data-breach' });
  assert.equal(incident.status, 'new');
  escalateIncident(incident, 'Scope widened to production', 'soc-lead');
  assert.equal(incident.severity, 'high');
});

test('D14g: assessRisk - mixed vulnerability risk assessment', () => {
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
// DIMENSION 15: Transport & Logistics - Identifier Validation & Tracking
// ===================================================================

test('D15a: validateAWB - valid IATA modulo-11 sample 02000000003', () => {
  const result = validateAWB('02000000003');
  assert.equal(result.valid, true);
  assert.equal(result.carrierPrefix, '020');
  assert.equal(result.checkDigit, 3);
});

test('D15b: validateIMO - valid IMO 9074729', () => {
  const result = validateIMO('9074729');
  assert.equal(result.valid, true);
  assert.equal(result.checkDigit, 9);
});

test('D15c: validateContainerNumber - ISO 6346 sample MSCU6639870', () => {
  const result = validateContainerNumber('MSCU6639870');
  assert.equal(result.valid, true);
  assert.equal(result.ownerCode, 'MSC');
  assert.equal(result.categoryId, 'U');
});

test('D15d: createShipment + recordEvent - maritime container tracking lifecycle', () => {
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

test('D15e: createGeofence + checkGeofence - port geofencing', () => {
  const g = createGeofence({
    id: 'port-ct', name: 'Cape Town Port', type: 'circle',
    center: { latitude: -33.91, longitude: 18.43 }, radiusMeters: 10000,
  });
  const inside = checkGeofence({ latitude: -33.91, longitude: 18.43 }, g);
  assert.equal(inside.inside, true);
  const outside = checkGeofence({ latitude: -33.0, longitude: 18.43 }, g);
  assert.equal(outside.inside, false);
});

test('D15f: lookupDangerousGood + createDangerousGoodsDeclaration - DG classification', () => {
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

test('D15g: screenSanctions - clear counterparty vs flagged entity', () => {
  const clear = screenSanctions({ name: 'Acme Logistics Inc.' });
  assert.equal(clear.clear, true);
  const flagged = screenSanctions({ name: 'Sanctioned Entity Alpha' });
  assert.equal(flagged.clear, false);
  assert.ok(flagged.matches.length >= 1);
});


// ===================================================================
// DIMENSION 16: Research & Academic - Citations, Reproducibility & Peer Review
// ===================================================================

test('D16a: validateDOI + validateORCID - citation identifiers', () => {
  const doi = validateDOI('10.1000/182');
  assert.equal(doi.valid, true);
  assert.equal(doi.registrant, '1000');
  const orcid = validateORCID('0000-0002-1825-0097');
  assert.equal(orcid.valid, true);
  assert.equal(orcid.checkDigit, '7');
});

test('D16b: validateArxivID + validateISBN13 - mixed-format identifiers', () => {
  const arxiv = validateArxivID('2304.12345');
  assert.equal(arxiv.valid, true);
  assert.equal(arxiv.scheme, 'modern');
  assert.equal(arxiv.year, 2023);
  const isbn = validateISBN13('9780306406157');
  assert.equal(isbn.valid, true);
  assert.equal(isbn.checkDigit, 7);
});

test('D16c: createManifest + verifyManifest - reproducibility manifest roundtrip', () => {
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

test('D16d: assessFAIR - fully FAIR artifact achieves score 1', () => {
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

test('D16e: createSubmission + assignReviewer + recordReview - peer-review lifecycle', () => {
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

test('D16f: verifyReviewIntegrity - detects out-of-order events', () => {
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

test('D16g: createDMP + checkCompliance - life-sciences DMP and clinical-trial compliance', () => {
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
// DIMENSION 17: Unify - Federation, Event Bus, Mesh & Vocabularies
// ===================================================================
// The connective tissue that makes "Everything Connected. Everyone Unified." true at runtime.

test('D17a: registerTool + route + dispatch - capability-based dispatch to owning tool', () => {
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

test('D17b: createIdentity + linkIdentity + resolveIdentity - cross-tool identity federation', () => {
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

test('D17c: createBus + subscribe + publish + routeEvent - event bus with sync-channel routing', () => {
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

test('D17d: translate - HS code → industry → research_domain chain', () => {
  // HS 3004 = pharmaceutical products → healthcare → life_sciences
  const r1 = translate('hs_code', 'industry', '300490');
  assert.equal(r1.translated, true);
  assert.equal(r1.value, 'healthcare');
  const r2 = translate('industry', 'research_domain', r1.value);
  assert.equal(r2.translated, true);
  assert.equal(r2.value, 'life_sciences');
});

test('D17e: translate - UN/LOCODE → country + capability → tool_id', () => {
  const r1 = translate('unlocode', 'country', 'NLRTM');
  assert.equal(r1.value, 'NL');
  const r2 = translate('capability', 'tool_id', 'shipmentTracking');
  assert.equal(r2.value, 'transport-logistics');
});

test('D17f: mergeIdentities - consolidates two identities and their linked identifiers', () => {
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

test('D17g: getSyncChannels - collects union of all declared channels across registered tools', () => {
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
// DIMENSION 18: CLI - Argument Parsing, Command Dispatch & Weave Generation
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

test('D18a: parseArgs - parses command + subcommand + value flags', () => {
  const r = parseArgs(['mesh', 'register', 'forge', '--state', '/tmp/x.json']);
  assert.equal(r.command, 'mesh');
  assert.equal(r.subcommand, 'register');
  assert.deepEqual(r.args, ['forge']);
  assert.equal(r.flags.state, '/tmp/x.json');
});

test('D18b: mesh register-all via dispatcher - registers all 7 tools', async () => {
  const stateFile = `/tmp/manya-7x7-d24b-${Date.now()}.json`;
  const r = await runCli(['mesh', 'register-all'], stateFile);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.output);
  assert.ok(out.registered.length >= 5);
  assert.ok(out.registered.includes('forge'));
  assert.ok(out.registered.includes('research-academic'));
  assert.ok(out.registered.includes('unify'));
});

test('D18c: identity create + link + resolve via CLI dispatcher', async () => {
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

test('D18d: mesh dispatch via CLI - invokes validateDOI on research-academic', async () => {
  const stateFile = `/tmp/manya-7x7-d24d-${Date.now()}.json`;
  await runCli(['mesh', 'register', 'research-academic'], stateFile);
  const r = await runCli(['mesh', 'dispatch', 'citationValidation', 'validateDOI', '10.1000/182'], stateFile);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.output);
  assert.equal(out.capability, 'citationValidation');
  assert.equal(out.result.valid, true);
});

test('D18e: translate via CLI - HS code → industry', async () => {
  const stateFile = `/tmp/manya-7x7-d24e-${Date.now()}.json`;
  const r = await runCli(['translate', 'hs_code', 'industry', '300490'], stateFile);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.output);
  assert.equal(out.value, 'healthcare');
  assert.equal(out.translated, true);
});

test('D18f: generateWeaveHtml - produces self-contained HTML with embedded data', () => {
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

test('D18g: knownToolIds - returns all 8 CLI-registerable tools', () => {
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
// DIMENSION 19: Serve & Repl - HTTP Server + SSE Stream + Interactive Shell
// ===================================================================
// The runtime surfaces that make Manya accessible from any client.

// -- Helper: boot a server on a random port for the D25 tests --
let d25Server;
let d25BaseUrl;

test('D19a: startServer boots and serves /api/health', async () => {
  d25Server = await startServer({ port: 0, host: '127.0.0.1' });
  const addr = d25Server.server.address();
  d25BaseUrl = `http://127.0.0.1:${addr.port}`;
  assert.ok(d25BaseUrl);
  const res = await fetch(d25BaseUrl + '/api/health');
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
});

test('D19b: GET /api/mesh returns auto-registered tools', async () => {
  assert.ok(d25BaseUrl, 'D19a must run first');
  const res = await fetch(d25BaseUrl + '/api/mesh');
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.count >= 5);
  assert.ok(body.tools.some(t => t.toolId === 'research-academic'));
});

test('D19c: POST /api/mesh/dispatch invokes a capability call', async () => {
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

test('D19d: POST /api/identities + GET /api/identities/resolve roundtrip', async () => {
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

test('D19e: POST /api/bus/route routes via tool sync channels', async () => {
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

test('D19f: SSE /api/events streams published events', async () => {
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

test('D19g: REPL processes commands interactively', async () => {
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
// DIMENSION 20: Lycon Browser - Privacy Browser Integration with Manya Unify
// ===================================================================
// The privacy-first browser wired into the ecosystem via the Manya event bus.

test('D20a: lyconManifest has correct identity and 6 capabilities', () => {
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

test('D20b: createAdapter + forward - navigation event flows to bus', () => {
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

test('D20c: createAdapter + forward - shield-blocked event flows to bus', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  let received = null;
  subscribe(bus, 'lycon:shield-blocked', (evt) => { received = evt; });
  adapter.forward('lycon:shield-blocked', createShieldBlockedEvent({ tabId: 't1', url: 'https://ads.example.com/track.js' }));
  assert.ok(received);
  assert.equal(received.payload.url, 'https://ads.example.com/track.js');
  assert.equal(received.payload.filter, 'easylist');
});

test('D20d: linkIdentity - browser profile links to federated identity', () => {
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

test('D20e: forward rejects unknown channel', () => {
  const bus = createBus();
  const adapter = createLyconAdapter({ bus });
  assert.throws(() => adapter.forward('lycon:bogus', {}), /Unknown Lycon sync channel/);
});

test('D20f: LYCON_SYNC_CHANNELS matches lyconManifest.syncChannels', () => {
  for (const ch of LYCON_SYNC_CHANNELS) {
    assert.ok(lyconManifest.syncChannels.includes(ch), `manifest should declare ${ch}`);
  }
  assert.equal(LYCON_SYNC_CHANNELS.length, lyconManifest.syncChannels.length);
});

test('D20g: full browsing session - navigation + shield + bookmark + download + identity-link', () => {
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
// DIMENSION 21: Lycon Deep Integration - Shield Intel, Identity Panel, Private Sessions
// ===================================================================
// The three deep-integration features that wire Lycon deeper into Manya.

test('D21a: shield intelligence auto-creates IOC for malicious .tk domain', () => {
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

test('D21b: shield intelligence returns matched=false for benign URLs', () => {
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

test('D21c: identity panel - link/unlink/switch profile', () => {
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

test('D21d: private session factory - create + end session', () => {
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

test('D21e: private session with unify creates real federated identity', () => {
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

test('D21f: shield intelligence processShieldBlock forwards + checks', () => {
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

test('D21g: end-to-end — private session + identity panel + shield intelligence', () => {
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
// DIMENSION 22: Weaver Rules - Connection Rules Engine
// ===================================================================
// The intelligence that knows what can connect to what.

test('D22a: canConnect - identity ↔ primary type returns edgeType=primary', () => {
  const identity = { id: 'identity:id-1', kind: 'identity', label: 'Josiah', identityId: 'id-1', primaryType: 'orcid', linkedTypes: ['doi'] };
  const type = { id: 'type:orcid', kind: 'type', label: 'orcid', typeId: 'orcid' };
  const result = canConnect(identity, type, {});
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'primary');
  assert.equal(result.strength, 1.0);
});

test('D22b: canConnect - tool ↔ tool with shared sync channel', () => {
  const toolA = { id: 'tool:a', kind: 'tool', label: 'A', toolId: 'a', syncChannels: ['shared'], handsOff: [], owns: [] };
  const toolB = { id: 'tool:b', kind: 'tool', label: 'B', toolId: 'b', syncChannels: ['shared'], handsOff: [], owns: [] };
  const result = canConnect(toolA, toolB, {});
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'sync-channel');
});

test('D22c: canConnect - tool ↔ type via validating capability', () => {
  const tool = { id: 'tool:research-academic', kind: 'tool', label: 'Research', toolId: 'research-academic' };
  const type = { id: 'type:orcid', kind: 'type', label: 'orcid', typeId: 'orcid' };
  const result = canConnect(tool, type, {});
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'validates');
});

test('D22d: canConnect - type ↔ type is never possible', () => {
  const typeA = { id: 'type:orcid', kind: 'type', typeId: 'orcid' };
  const typeB = { id: 'type:doi', kind: 'type', typeId: 'doi' };
  const result = canConnect(typeA, typeB, {});
  assert.equal(result.possible, false);
});

test('D22e: canConnect - identity ↔ identity sharing a type', () => {
  const idA = { id: 'identity:a', kind: 'identity', label: 'A', identityId: 'a', primaryType: 'orcid', linkedTypes: ['doi'] };
  const idB = { id: 'identity:b', kind: 'identity', label: 'B', identityId: 'b', primaryType: 'ror', linkedTypes: ['doi'] };
  const result = canConnect(idA, idB, {});
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'shared-type');
});

test('D22f: findPotentialConnections returns all possible pairs', () => {
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

test('D22g: getTypeToToolMap returns orcid → research-academic', () => {
  const map = getTypeToToolMap();
  assert.equal(map.orcid, 'research-academic');
  assert.equal(map.imo, 'transport-logistics');
});


// ===================================================================
// DIMENSION 23: UPMP - Activity Tracking & Intelligence Engagement
// ===================================================================
// Universal Progress Monitoring wired into the Manya event bus.

test('D23a: upmpManifest has correct identity and 6 capabilities', () => {
  assert.equal(upmpManifest.id, 'upmp');
  assert.equal(upmpManifest.name, 'UPMP');
  assert.equal(upmpManifest.foundation, 'Manya');
  assert.equal(upmpManifest.owns.length, 6);
  assert.ok(upmpManifest.owns.includes('activityTracking'));
  assert.ok(upmpManifest.owns.includes('intelligenceEngagement'));
  assert.ok(upmpManifest.syncChannels.includes('upmp:session-started'));
});

test('D23b: createAdapter + startSession forwards to bus', () => {
  const bus = createBus();
  const adapter = createUpmpAdapter({ bus });
  let received = null;
  subscribe(bus, 'upmp:session-started', (e) => { received = e; });
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  assert.ok(received);
  assert.equal(received.payload.activityType, 'writing');
  assert.equal(received.sourceToolId, 'upmp');
});

test('D23c: recordStuckPoint + resolveStuckPoint fires breakthrough', () => {
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

test('D23d: recordDiscovery forwards to bus', () => {
  const bus = createBus();
  const adapter = createUpmpAdapter({ bus });
  let received = null;
  subscribe(bus, 'upmp:discovery', (e) => { received = e; });
  adapter.startSession({ activityType: 'writing' });
  adapter.recordDiscovery({ type: 'post', url: 'https://example.com', note: 'test' });
  assert.ok(received);
  assert.equal(received.payload.type, 'post');
});

test('D23e: intelligence engagement increments on session start', () => {
  const bus = createBus();
  const adapter = createUpmpAdapter({ bus });
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  adapter.endSession();
  adapter.startSession({ activityType: 'writing', intelligence: 'linguistic' });
  adapter.endSession();
  const intel = adapter.getIntelligences().find(i => i.key === 'linguistic');
  assert.equal(intel.sessions, 2);
});

test('D23f: linkIntelligenceToIdentity federates intelligences', () => {
  const bus = createBus();
  const adapter = createUpmpAdapter({ bus });
  adapter.linkIntelligenceToIdentity('linguistic', 'id-josiah');
  assert.equal(adapter.resolveIntelligenceIdentity('linguistic'), 'id-josiah');
  const links = adapter.listIntelligenceLinks();
  assert.equal(links.length, 1);
});

test('D23g: full session E2E — stuck + discovery + breakthrough + end', () => {
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
