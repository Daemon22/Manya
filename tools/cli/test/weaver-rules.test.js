/**
 * Manya Weaver — Rules engine tests.
 * Verifies canConnect() for all node-type pairs and edge cases.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canConnect,
  findPotentialConnections,
  getTypeToToolMap,
  getTypeToCapabilityMap,
  buildContext,
} from '../src/weaver-rules.js';

// -- Test fixtures --

const TOOLS = [
  { id: 'tool:forge', label: 'Forge', kind: 'tool', toolId: 'forge',
    owns: ['keyDerivation', 'passphraseStrength', 'keyRotation', 'multiAlgorithmHash'],
    handsOff: ['apiKeyVault', 'workflowDagBuilder'],
    syncChannels: ['key-rotation-event', 'strength-audit', 'hash-verification'] },
  { id: 'tool:research-academic', label: 'Research & Academic', kind: 'tool', toolId: 'research-academic',
    owns: ['citationValidation', 'reproducibilityManifests', 'peerReviewProvenance'],
    handsOff: ['keyDerivation', 'encryptedStorage'],
    syncChannels: ['citation-verified', 'manifest-verified'] },
  { id: 'tool:unify', label: 'Manya Unify', kind: 'tool', toolId: 'unify',
    owns: ['toolFederation', 'identityLinking', 'capabilityDispatch', 'vocabularyBridging'],
    handsOff: ['keyDerivation', 'citationValidation'],
    syncChannels: ['identity-linked', 'event-routed', 'capability-dispatched'] },
  { id: 'tool:lycon-browser', label: 'Lycon Browser', kind: 'tool', toolId: 'lycon-browser',
    owns: ['webBrowsing', 'adBlocking', 'bookmarkManagement'],
    handsOff: ['keyDerivation', 'identityLinking'],
    syncChannels: ['lycon:navigation', 'lycon:shield-blocked'] },
  { id: 'tool:transport-logistics', label: 'Transport & Logistics', kind: 'tool', toolId: 'transport-logistics',
    owns: ['transportIdentifierValidation', 'shipmentTracking', 'customsCompliance'],
    handsOff: ['keyDerivation'],
    syncChannels: ['shipment-event-recorded', 'geofence-triggered'] },
];

const IDENTITIES = [
  { id: 'identity:id-1', label: 'Josiah Carberry', kind: 'identity', identityId: 'id-1',
    primaryType: 'orcid', linkedTypes: ['doi', 'email'] },
  { id: 'identity:id-2', label: 'MIT', kind: 'identity', identityId: 'id-2',
    primaryType: 'ror', linkedTypes: ['doi'] },
  { id: 'identity:id-3', label: 'MV Ever Given', kind: 'identity', identityId: 'id-3',
    primaryType: 'imo', linkedTypes: ['container'] },
];

const TYPES = [
  { id: 'type:orcid', label: 'orcid', kind: 'type', typeId: 'orcid' },
  { id: 'type:doi', label: 'doi', kind: 'type', typeId: 'doi' },
  { id: 'type:imo', label: 'imo', kind: 'type', typeId: 'imo' },
  { id: 'type:email', label: 'email', kind: 'type', typeId: 'email' },
];

const CONTEXT = buildContext(TOOLS, IDENTITIES);

// =====================================================================
// TYPE ↔ TYPE — never possible
// =====================================================================

test('Weaver/Rules: type ↔ type is never possible', () => {
  const result = canConnect(TYPES[0], TYPES[1], CONTEXT);
  assert.equal(result.possible, false);
  assert.match(result.reason, /do not connect to each other/i);
});

// =====================================================================
// IDENTITY ↔ TYPE — always possible
// =====================================================================

test('Weaver/Rules: identity ↔ primary type returns edgeType=primary', () => {
  const result = canConnect(IDENTITIES[0], TYPES[0], CONTEXT); // Josiah ↔ orcid
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'primary');
  assert.equal(result.strength, 1.0);
});

test('Weaver/Rules: identity ↔ linked type returns edgeType=linked', () => {
  const result = canConnect(IDENTITIES[0], TYPES[1], CONTEXT); // Josiah ↔ doi
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'linked');
  assert.ok(result.strength < 1.0);
});

test('Weaver/Rules: identity ↔ unlinked type returns edgeType=potential-linked', () => {
  const result = canConnect(IDENTITIES[0], TYPES[2], CONTEXT); // Josiah ↔ imo (not linked)
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'potential-linked');
  assert.equal(result.strength, 0.5);
});

test('Weaver/Rules: identity ↔ type works in both directions', () => {
  const r1 = canConnect(IDENTITIES[0], TYPES[0], CONTEXT);
  const r2 = canConnect(TYPES[0], IDENTITIES[0], CONTEXT);
  assert.equal(r1.possible, r2.possible);
  assert.equal(r1.edgeType, r2.edgeType);
});

// =====================================================================
// TOOL ↔ TOOL — shared sync channel, consumer-provider, or unify bridge
// =====================================================================

test('Weaver/Rules: tools sharing a sync channel can connect', () => {
  // Both forge and research-academic don't share channels, but let's test the logic
  // with a custom pair that does
  const toolA = { ...TOOLS[0], syncChannels: ['shared-channel', 'unique-a'] };
  const toolB = { ...TOOLS[1], syncChannels: ['shared-channel', 'unique-b'] };
  const result = canConnect(toolA, toolB, CONTEXT);
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'sync-channel');
  assert.match(result.reason, /share 1 sync channel/);
});

test('Weaver/Rules: tools with consumer-provider relationship can connect', () => {
  // research-academic handsOff keyDerivation, which forge owns
  const result = canConnect(TOOLS[0], TOOLS[1], CONTEXT); // forge ↔ research-academic
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'consumer-provider');
  assert.match(result.reason, /consumes/);
});

test('Weaver/Rules: unify can bridge any tool', () => {
  const result = canConnect(TOOLS[2], TOOLS[4], CONTEXT); // unify ↔ transport-logistics
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'capability-dispatch');
});

test('Weaver/Rules: tools with no relationship cannot connect', () => {
  // lycon-browser and transport-logistics share no channels, no consumer-provider, neither is unify
  const result = canConnect(TOOLS[3], TOOLS[4], CONTEXT);
  assert.equal(result.possible, false);
  assert.match(result.reason, /share no sync channels/);
});

// =====================================================================
// TOOL ↔ TYPE — tool owns validating capability
// =====================================================================

test('Weaver/Rules: research-academic ↔ orcid can connect (citationValidation)', () => {
  const result = canConnect(TOOLS[1], TYPES[0], CONTEXT);
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'validates');
  assert.match(result.reason, /citationValidation/);
});

test('Weaver/Rules: transport-logistics ↔ imo can connect', () => {
  const result = canConnect(TOOLS[4], TYPES[2], CONTEXT);
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'validates');
});

test('Weaver/Rules: forge ↔ orcid cannot connect (forge does not validate ORCID)', () => {
  const result = canConnect(TOOLS[0], TYPES[0], CONTEXT);
  assert.equal(result.possible, false);
  assert.match(result.reason, /does not own a capability that validates orcid/);
});

test('Weaver/Rules: unify ↔ any type can connect via vocabulary bridge', () => {
  const result = canConnect(TOOLS[2], TYPES[0], CONTEXT); // unify ↔ orcid
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'vocabulary-bridge');
});

// =====================================================================
// IDENTITY ↔ TOOL — unify or lycon can connect, others need existing link
// =====================================================================

test('Weaver/Rules: unify ↔ identity can connect (identityLinking)', () => {
  const result = canConnect(TOOLS[2], IDENTITIES[0], CONTEXT);
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'federation');
  assert.equal(result.strength, 0.9);
});

test('Weaver/Rules: lycon-browser ↔ identity can connect (browser profiles)', () => {
  const result = canConnect(TOOLS[3], IDENTITIES[0], CONTEXT);
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'browser-identity');
});

test('Weaver/Rules: forge ↔ identity cannot connect (no identityLinking)', () => {
  const result = canConnect(TOOLS[0], IDENTITIES[0], CONTEXT);
  assert.equal(result.possible, false);
  assert.match(result.reason, /does not own identityLinking/);
});

test('Weaver/Rules: tool ↔ identity with existing link can connect', () => {
  const ctx = {
    ...CONTEXT,
    identityLinks: { 'research-academic': ['id-1'] },
  };
  const result = canConnect(TOOLS[1], IDENTITIES[0], ctx);
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'established');
  assert.equal(result.strength, 1.0);
});

// =====================================================================
// IDENTITY ↔ IDENTITY — shared types or mergeable
// =====================================================================

test('Weaver/Rules: identities sharing a type can connect', () => {
  // Josiah (orcid, doi, email) and MIT (ror, doi) share doi
  const result = canConnect(IDENTITIES[0], IDENTITIES[1], CONTEXT);
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'shared-type');
  assert.match(result.reason, /share 1 identifier type/);
});

test('Weaver/Rules: identities with no shared type are mergeable', () => {
  // Josiah (orcid, doi, email) and MV Ever Given (imo, container) share nothing
  const result = canConnect(IDENTITIES[0], IDENTITIES[2], CONTEXT);
  assert.equal(result.possible, true);
  assert.equal(result.edgeType, 'mergeable');
  assert.equal(result.strength, 0.3);
});

// =====================================================================
// EDGE CASES
// =====================================================================

test('Weaver/Rules: cannot connect a node to itself', () => {
  const result = canConnect(TOOLS[0], TOOLS[0], CONTEXT);
  assert.equal(result.possible, false);
  assert.match(result.reason, /Cannot connect a node to itself/);
});

test('Weaver/Rules: missing nodes return possible=false', () => {
  assert.equal(canConnect(null, TOOLS[0], CONTEXT).possible, false);
  assert.equal(canConnect(TOOLS[0], null, CONTEXT).possible, false);
});

test('Weaver/Rules: unknown kind combination returns possible=false', () => {
  const weird = { id: 'weird:1', kind: 'unknown', label: 'Weird' };
  const result = canConnect(weird, TOOLS[0], CONTEXT);
  assert.equal(result.possible, false);
  assert.match(result.reason, /Unknown node kind combination/);
});

// =====================================================================
// findPotentialConnections
// =====================================================================

test('Weaver/Rules: findPotentialConnections returns all possible pairs', () => {
  const nodes = [...TOOLS, ...IDENTITIES, ...TYPES];
  const potentials = findPotentialConnections(nodes, { ...CONTEXT, existingEdges: [] });
  // There should be many possible connections
  assert.ok(potentials.length > 10);
  // Each should have possible=true
  for (const p of potentials) {
    assert.equal(p.rule.possible, true);
  }
});

test('Weaver/Rules: findPotentialConnections excludes existing edges', () => {
  const nodes = [...TOOLS, ...IDENTITIES, ...TYPES];
  const existingEdges = [{ from: 'tool:forge', to: 'tool:research-academic' }];
  const potentials = findPotentialConnections(nodes, { ...CONTEXT, existingEdges });
  // The forge ↔ research-academic pair should not appear
  const hasForgeResearch = potentials.some(p =>
    (p.from.id === 'tool:forge' && p.to.id === 'tool:research-academic') ||
    (p.from.id === 'tool:research-academic' && p.to.id === 'tool:forge')
  );
  assert.equal(hasForgeResearch, false);
});

// =====================================================================
// Helper maps
// =====================================================================

test('Weaver/Rules: getTypeToToolMap returns orcid → research-academic', () => {
  const map = getTypeToToolMap();
  assert.equal(map.orcid, 'research-academic');
  assert.equal(map.imo, 'transport-logistics');
});

test('Weaver/Rules: getTypeToCapabilityMap returns orcid → citationValidation', () => {
  const map = getTypeToCapabilityMap();
  assert.equal(map.orcid, 'citationValidation');
  assert.equal(map.imo, 'transportIdentifierValidation');
});

// =====================================================================
// buildContext
// =====================================================================

test('Weaver/Rules: buildContext extracts capabilitiesByTool', () => {
  const ctx = buildContext(TOOLS, IDENTITIES);
  assert.ok(ctx.capabilitiesByTool['forge'].includes('keyDerivation'));
  assert.ok(ctx.capabilitiesByTool['research-academic'].includes('citationValidation'));
});

test('Weaver/Rules: buildContext extracts identityLinks from linked source', () => {
  const identitiesWithLinks = [
    {
      id: 'id-1', primary: { type: 'orcid', value: 'x' },
      linked: [{ type: 'doi', value: '10.1000/182', source: 'research-academic' }],
    },
  ];
  const ctx = buildContext([], identitiesWithLinks);
  assert.ok(ctx.identityLinks['research-academic'].includes('id-1'));
});
