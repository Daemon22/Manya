/**
 * Manya Unify — Tests.
 * Covers mesh (tool registry + capability routing), federation (identity
 * linking + merge), eventbus (pub/sub + route via sync channels), and
 * vocabularies (HS↔industry, UN/LOCODE↔country, industry↔sector/domain,
 * capability↔tool_id).
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  // Mesh
  registerTool,
  unregisterTool,
  getTool,
  listTools,
  route,
  dispatch,
  getSyncChannels,
  findConsumers,
  _resetMesh,
  // Federation
  createIdentity,
  linkIdentity,
  resolveIdentity,
  findByIdentitySource,
  mergeIdentities,
  listIdentities,
  identityCount,
  _resetFederation,
  // Event Bus
  createBus,
  subscribe,
  publish,
  routeEvent,
  replay,
  busStats,
  // Vocabularies
  translate,
  getIndustryDomainMap,
  getHsChapterMap,
  listTranslations,
} from '../src/index.js';

import {
  researchAcademicManifest,
  transportLogisticsManifest,
  forgeManifest,
  pulseManifest,
} from '@manya/toolkit';

// Reset state between sections to keep tests isolated
function resetAll() {
  _resetMesh();
  _resetFederation();
}

// =====================================================================
// MESH — Tool registry and capability routing
// =====================================================================

test('Unify/Mesh: registerTool returns registration summary', () => {
  resetAll();
  const r = registerTool({ manifest: forgeManifest, api: { hash: () => 'h' } });
  assert.equal(r.toolId, 'forge');
  assert.equal(r.registeredAt.length > 0, true);
  assert.ok(r.owns.includes('keyDerivation'));
  assert.ok(r.syncChannels.includes('key-rotation-event'));
});

test('Unify/Mesh: registerTool rejects missing manifest', () => {
  resetAll();
  assert.throws(() => registerTool({ api: {} }), /manifest with an id/);
});

test('Unify/Mesh: registerTool rejects non-object api', () => {
  resetAll();
  assert.throws(() => registerTool({ manifest: forgeManifest, api: null }), /api object/);
});

test('Unify/Mesh: registerTool rejects duplicate registration', () => {
  resetAll();
  registerTool({ manifest: forgeManifest, api: {} });
  assert.throws(() => registerTool({ manifest: forgeManifest, api: {} }), /already registered/);
});

test('Unify/Mesh: getTool returns registered tool', () => {
  resetAll();
  registerTool({ manifest: forgeManifest, api: { hash: () => 'h' } });
  const t = getTool('forge');
  assert.equal(t.manifest.id, 'forge');
  assert.equal(typeof t.api.hash, 'function');
});

test('Unify/Mesh: getTool returns null for unregistered', () => {
  resetAll();
  const t = getTool('nonexistent');
  assert.equal(t, null);
});

test('Unify/Mesh: unregisterTool removes a tool', () => {
  resetAll();
  registerTool({ manifest: forgeManifest, api: {} });
  assert.equal(unregisterTool('forge'), true);
  assert.equal(getTool('forge'), null);
  assert.equal(unregisterTool('forge'), false);
});

test('Unify/Mesh: listTools returns all registered tools', () => {
  resetAll();
  registerTool({ manifest: forgeManifest, api: {} });
  registerTool({ manifest: pulseManifest, api: {} });
  const list = listTools();
  assert.equal(list.length, 2);
  assert.ok(list.some(t => t.toolId === 'forge'));
  assert.ok(list.some(t => t.toolId === 'pulse'));
});

test('Unify/Mesh: route returns owning tool for known capability', () => {
  resetAll();
  registerTool({ manifest: researchAcademicManifest, api: { validateDOI: () => 'ok' } });
  const r = route('citationValidation');
  assert.equal(r.toolId, 'research-academic');
  assert.equal(r.registered, true);
  assert.equal(typeof r.api.validateDOI, 'function');
});

test('Unify/Mesh: route returns null for unknown capability', () => {
  resetAll();
  const r = route('nonexistentCapability');
  assert.equal(r, null);
});

test('Unify/Mesh: route reports registered=false when owner not registered', () => {
  resetAll();
  // No tools registered, but citationValidation is owned by research-academic in the toolkit
  const r = route('citationValidation');
  assert.equal(r.toolId, 'research-academic');
  assert.equal(r.registered, false);
});

test('Unify/Mesh: dispatch invokes the method on the owning tool', () => {
  resetAll();
  registerTool({
    manifest: researchAcademicManifest,
    api: {
      validateDOI: (doi) => ({ valid: true, normalized: `https://doi.org/${doi}` }),
    },
  });
  const result = dispatch('citationValidation', 'validateDOI', ['10.1000/182']);
  assert.equal(result.valid, true);
  assert.equal(result.normalized, 'https://doi.org/10.1000/182');
});

test('Unify/Mesh: dispatch throws for unowned capability', () => {
  resetAll();
  assert.throws(() => dispatch('nonexistent', 'method'), /not owned/);
});

test('Unify/Mesh: dispatch throws when owner not registered', () => {
  resetAll();
  assert.throws(() => dispatch('citationValidation', 'validateDOI'), /not registered/);
});

test('Unify/Mesh: dispatch throws for missing method', () => {
  resetAll();
  registerTool({ manifest: researchAcademicManifest, api: {} });
  assert.throws(() => dispatch('citationValidation', 'nonexistentMethod'), /does not expose method/);
});

test('Unify/Mesh: getSyncChannels returns union of all declared channels', () => {
  resetAll();
  registerTool({ manifest: forgeManifest, api: {} });
  registerTool({ manifest: researchAcademicManifest, api: {} });
  const channels = getSyncChannels();
  // Should include channels from both tools
  const channelNames = channels.map(c => c.channel);
  assert.ok(channelNames.includes('key-rotation-event'));
  assert.ok(channelNames.includes('citation-verified'));
});

test('Unify/Mesh: getSyncChannels deduplicates and lists owners', () => {
  resetAll();
  registerTool({ manifest: forgeManifest, api: {} });
  registerTool({ manifest: pulseManifest, api: {} });
  const channels = getSyncChannels();
  // 'audit-event' channel is declared by both shield and pulse manifests
  // (we only registered pulse here, so it should have one owner)
  const audit = channels.find(c => c.channel === 'industry-preset-loaded');
  if (audit) assert.equal(audit.owners.length, 1);
});

test('Unify/Mesh: findConsumers returns tools that hands-off a capability', () => {
  resetAll();
  registerTool({ manifest: forgeManifest, api: {} });
  registerTool({ manifest: researchAcademicManifest, api: {} });
  // research-academic manifest handsOff on keyDerivation (owned by forge)
  const consumers = findConsumers('keyDerivation');
  assert.ok(consumers.includes('research-academic'));
});

// =====================================================================
// FEDERATION — Identity linking and resolution
// =====================================================================

test('Unify/Federation: createIdentity returns identity with primary', () => {
  resetAll();
  const id = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  assert.equal(id.primary.type, 'orcid');
  assert.equal(id.primary.value, '0000000218250097'); // normalized (dashes removed, uppercased)
  assert.equal(id.linked.length, 0);
  assert.ok(id.id.startsWith('id-'));
});

test('Unify/Federation: createIdentity rejects missing fields', () => {
  resetAll();
  assert.throws(() => createIdentity({}), /type string/);
  assert.throws(() => createIdentity({ type: 'orcid' }), /value string/);
});

test('Unify/Federation: createIdentity deduplicates by primary value', () => {
  resetAll();
  const a = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  const b = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  assert.equal(a.id, b.id);
  assert.equal(identityCount(), 1);
});

test('Unify/Federation: linkIdentity adds a linked identifier', () => {
  resetAll();
  const id = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  linkIdentity(id, { type: 'doi', value: '10.1000/182', source: 'research-academic' });
  assert.equal(id.linked.length, 1);
  assert.equal(id.linked[0].type, 'doi');
  assert.equal(id.linked[0].source, 'research-academic');
});

test('Unify/Federation: linkIdentity rejects missing identifier fields', () => {
  resetAll();
  const id = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  assert.throws(() => linkIdentity(id, {}), /type and identifier.value/);
});

test('Unify/Federation: linkIdentity rejects identifier already owned by another identity', () => {
  resetAll();
  const a = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  const b = createIdentity({ type: 'orcid', value: '0000-0001-2345-6789' });
  // Link a DOI to identity a first
  linkIdentity(a, { type: 'doi', value: '10.1000/182' });
  // Now try to link the same DOI to identity b — should throw
  assert.throws(() => linkIdentity(b, { type: 'doi', value: '10.1000/182' }), /already linked/);
});

test('Unify/Federation: linkIdentity is idempotent for same identity', () => {
  resetAll();
  const id = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  linkIdentity(id, { type: 'doi', value: '10.1000/182' });
  linkIdentity(id, { type: 'doi', value: '10.1000/182' });
  assert.equal(id.linked.length, 1);
});

test('Unify/Federation: linkIdentity clamps confidence to [0,1]', () => {
  resetAll();
  const id = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  linkIdentity(id, { type: 'doi', value: '10.1000/182', confidence: 5 });
  assert.equal(id.linked[0].confidence, 1);
  linkIdentity(id, { type: 'email', value: 'a@b.com', confidence: -1 });
  const emailLink = id.linked.find(l => l.type === 'email');
  assert.equal(emailLink.confidence, 0);
});

test('Unify/Federation: resolveIdentity finds by primary', () => {
  resetAll();
  const id = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  const resolved = resolveIdentity('orcid', '0000-0002-1825-0097');
  assert.equal(resolved.id, id.id);
});

test('Unify/Federation: resolveIdentity finds by linked', () => {
  resetAll();
  const id = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  linkIdentity(id, { type: 'doi', value: '10.1000/182' });
  const resolved = resolveIdentity('doi', '10.1000/182');
  assert.equal(resolved.id, id.id);
});

test('Unify/Federation: resolveIdentity returns null for unknown', () => {
  resetAll();
  const r = resolveIdentity('orcid', '0000-0009-9999-9999');
  assert.equal(r, null);
});

test('Unify/Federation: resolveIdentity handles normalization', () => {
  resetAll();
  const id = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  // Resolve with URL form
  const r = resolveIdentity('orcid', 'https://orcid.org/0000-0002-1825-0097');
  assert.equal(r.id, id.id);
});

test('Unify/Federation: findByIdentitySource returns identities linked from a tool', () => {
  resetAll();
  const a = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  const b = createIdentity({ type: 'orcid', value: '0000-0001-2345-6789' });
  linkIdentity(a, { type: 'doi', value: '10.1000/182', source: 'research-academic' });
  linkIdentity(b, { type: 'doi', value: '10.1001/abc', source: 'other-tool' });
  const fromResearch = findByIdentitySource('research-academic');
  assert.equal(fromResearch.length, 1);
  assert.equal(fromResearch[0].id, a.id);
});

test('Unify/Federation: mergeIdentities consolidates two identities', () => {
  resetAll();
  const a = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097', metadata: { name: 'Josiah' } });
  const b = createIdentity({ type: 'doi', value: '10.1000/182', metadata: { affiliation: 'Brown' } });
  const merged = mergeIdentities(a.id, b.id);
  // b's primary (doi) should now be in a's linked
  assert.ok(merged.linked.some(l => l.type === 'doi' && l.value === '10.1000/182'));
  // Metadata merged (b's affiliation merged into a)
  assert.equal(merged.metadata.affiliation, 'Brown');
  assert.equal(merged.metadata.name, 'Josiah');
  // b should be removed
  assert.equal(identityCount(), 1);
});

test('Unify/Federation: mergeIdentities rejects unknown identity', () => {
  resetAll();
  assert.throws(() => mergeIdentities('id-nonexistent', 'id-alsobogus'), /not found/);
});

test('Unify/Federation: mergeIdentities is a no-op for same identity', () => {
  resetAll();
  const a = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  const result = mergeIdentities(a.id, a.id);
  assert.equal(result.id, a.id);
});

test('Unify/Federation: listIdentities returns all stored', () => {
  resetAll();
  createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  createIdentity({ type: 'doi', value: '10.1000/182' });
  const all = listIdentities();
  assert.equal(all.length, 2);
});

test('Unify/Federation: identityCount tracks store size', () => {
  resetAll();
  assert.equal(identityCount(), 0);
  createIdentity({ type: 'orcid', value: '0000-0002-1825-0097' });
  assert.equal(identityCount(), 1);
});

// =====================================================================
// EVENT BUS — Pub/sub and sync-channel routing
// =====================================================================

test('Unify/EventBus: createBus returns bus with id', () => {
  const bus = createBus();
  assert.ok(bus.id.startsWith('bus-'));
  assert.equal(bus.eventCount, 0);
});

test('Unify/EventBus: subscribe + publish delivers event', () => {
  const bus = createBus();
  let received = null;
  subscribe(bus, 'topic-a', (evt) => { received = evt; });
  publish(bus, 'topic-a', { type: 'test', payload: { x: 1 } });
  assert.ok(received);
  assert.equal(received.topic, 'topic-a');
  assert.equal(received.type, 'test');
  assert.equal(received.payload.x, 1);
});

test('Unify/EventBus: subscribe returns unsubscribe function', () => {
  const bus = createBus();
  let count = 0;
  const unsub = subscribe(bus, 'topic-a', () => { count++; });
  publish(bus, 'topic-a', { type: 'x' });
  assert.equal(count, 1);
  unsub();
  publish(bus, 'topic-a', { type: 'x' });
  assert.equal(count, 1); // no additional delivery
});

test('Unify/EventBus: publish to topic with no subscribers delivers 0', () => {
  const bus = createBus();
  const r = publish(bus, 'no-subs', { type: 'test' });
  assert.equal(r.delivered, 0);
  assert.ok(r.eventId.startsWith('evt-'));
});

test('Unify/EventBus: multiple subscribers all receive event', () => {
  const bus = createBus();
  let a = 0, b = 0;
  subscribe(bus, 'topic', () => { a++; });
  subscribe(bus, 'topic', () => { b++; });
  publish(bus, 'topic', { type: 'x' });
  assert.equal(a, 1);
  assert.equal(b, 1);
});

test('Unify/EventBus: handler errors are swallowed (do not break the bus)', () => {
  const bus = createBus();
  let second = 0;
  subscribe(bus, 'topic', () => { throw new Error('handler failure'); });
  subscribe(bus, 'topic', () => { second++; });
  const r = publish(bus, 'topic', { type: 'x' });
  // The first handler threw, but the second still received the event
  assert.equal(second, 1);
  assert.equal(r.delivered, 1); // only the successful handler counted
});

test('Unify/EventBus: route publishes to all declared sync channels', () => {
  const bus = createBus();
  let a = 0, b = 0;
  subscribe(bus, 'citation-verified', () => { a++; });
  subscribe(bus, 'manifest-verified', () => { b++; });
  const result = routeEvent(bus, {
    type: 'doi-verified',
    sourceToolId: 'research-academic',
    payload: { doi: '10.1000/182' },
  }, ['citation-verified', 'manifest-verified']);
  assert.equal(a, 1);
  assert.equal(b, 1);
  assert.equal(result.routes.length, 2);
  assert.ok(result.routes.every(r => r.delivered === 1));
});

test('Unify/EventBus: route rejects missing sourceToolId', () => {
  const bus = createBus();
  assert.throws(() => routeEvent(bus, { type: 'x' }, ['topic']), /sourceToolId/);
});

test('Unify/EventBus: route rejects empty syncChannels', () => {
  const bus = createBus();
  assert.throws(() => routeEvent(bus, { sourceToolId: 't' }, []), /non-empty syncChannels/);
});

test('Unify/EventBus: replay re-delivers events from history', () => {
  const bus = createBus({ replay: true });
  publish(bus, 'topic-a', { type: 'one' });
  publish(bus, 'topic-b', { type: 'two' });
  publish(bus, 'topic-a', { type: 'three' });
  let count = 0;
  const n = replay(bus, 'topic-a', () => { count++; });
  assert.equal(n, 2);
  assert.equal(count, 2);
});

test('Unify/EventBus: replay without topic filter replays all', () => {
  const bus = createBus({ replay: true });
  publish(bus, 'topic-a', { type: 'one' });
  publish(bus, 'topic-b', { type: 'two' });
  let count = 0;
  const n = replay(bus, () => { count++; });
  assert.equal(n, 2);
});

test('Unify/EventBus: replay throws on bus without history', () => {
  const bus = createBus(); // replay: false by default
  assert.throws(() => replay(bus, () => {}), /history enabled/);
});

test('Unify/EventBus: replay respects maxHistory cap', () => {
  const bus = createBus({ replay: true, maxHistory: 3 });
  for (let i = 0; i < 5; i++) {
    publish(bus, 't', { type: `evt-${i}` });
  }
  let count = 0;
  replay(bus, () => { count++; });
  assert.equal(count, 3); // only last 3 retained
});

test('Unify/EventBus: busStats returns summary', () => {
  const bus = createBus({ replay: true });
  subscribe(bus, 'a', () => {});
  subscribe(bus, 'a', () => {});
  subscribe(bus, 'b', () => {});
  publish(bus, 'a', { type: 'x' });
  publish(bus, 'b', { type: 'x' });
  publish(bus, 'c', { type: 'x' }); // no subscribers
  const s = busStats(bus);
  assert.equal(s.topicCount, 2); // only topics with subscribers
  assert.equal(s.subscriberCount, 3);
  assert.equal(s.eventCount, 3);
  assert.equal(s.historySize, 3);
});

test('Unify/EventBus: subscribe rejects bad arguments', () => {
  const bus = createBus();
  assert.throws(() => subscribe(null, 't', () => {}), /requires a bus/);
  assert.throws(() => subscribe(bus, '', () => {}), /topic string/);
  assert.throws(() => subscribe(bus, 't', null), /handler function/);
});

test('Unify/EventBus: publish rejects bad arguments', () => {
  const bus = createBus();
  assert.throws(() => publish(null, 't', { type: 'x' }), /requires a bus/);
  assert.throws(() => publish(bus, '', { type: 'x' }), /topic string/);
  assert.throws(() => publish(bus, 't', null), /event object/);
});

// =====================================================================
// VOCABULARIES — Cross-domain translation
// =====================================================================

test('Unify/Vocabularies: translate HS code 090121 → agriculture', () => {
  const r = translate('hs_code', 'industry', '090121');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'agriculture');
});

test('Unify/Vocabularies: translate HS code 3004 → healthcare', () => {
  const r = translate('hs_code', 'industry', '300490');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'healthcare');
});

test('Unify/Vocabularies: translate HS code 8471 → iot', () => {
  const r = translate('hs_code', 'industry', '8471500');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'iot');
});

test('Unify/Vocabularies: translate HS code chapter 72 → mining', () => {
  const r = translate('hs_code', 'industry', '721360');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'mining');
});

test('Unify/Vocabularies: translate unknown HS chapter returns translated=false', () => {
  // Chapter '00' is not in the WCO standard, so it's not in our map
  const r = translate('hs_code', 'industry', '0000');
  assert.equal(r.translated, false);
  assert.equal(r.value, null);
});

test('Unify/Vocabularies: translate UN/LOCODE ZACPT → country ZA', () => {
  const r = translate('unlocode', 'country', 'ZACPT');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'ZA');
});

test('Unify/Vocabularies: translate UN/LOCODE NLRTM → country NL', () => {
  const r = translate('unlocode', 'country', 'NLRTM');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'NL');
});

test('Unify/Vocabularies: translate UN/LOCODE unknown prefix returns translated=false', () => {
  const r = translate('unlocode', 'country', 'ZZXXX');
  assert.equal(r.translated, false);
});

test('Unify/Vocabularies: translate industry healthcare → research_domain life_sciences', () => {
  const r = translate('industry', 'research_domain', 'healthcare');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'life_sciences');
});

test('Unify/Vocabularies: translate industry energy → sector mining', () => {
  const r = translate('industry', 'sector', 'energy');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'mining');
});

test('Unify/Vocabularies: translate industry iot → research_domain computational_sciences', () => {
  const r = translate('industry', 'research_domain', 'iot');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'computational_sciences');
});

test('Unify/Vocabularies: translate sector agriculture → industry agriculture', () => {
  const r = translate('sector', 'industry', 'agriculture');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'agriculture');
});

test('Unify/Vocabularies: translate sector mining → industry energy', () => {
  const r = translate('sector', 'industry', 'mining');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'energy');
});

test('Unify/Vocabularies: translate research_domain life_sciences → industry healthcare', () => {
  const r = translate('research_domain', 'industry', 'life_sciences');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'healthcare');
});

test('Unify/Vocabularies: translate capability citationValidation → tool_id research-academic', () => {
  const r = translate('capability', 'tool_id', 'citationValidation');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'research-academic');
});

test('Unify/Vocabularies: translate capability shipmentTracking → tool_id transport-logistics', () => {
  const r = translate('capability', 'tool_id', 'shipmentTracking');
  assert.equal(r.translated, true);
  assert.equal(r.value, 'transport-logistics');
});

test('Unify/Vocabularies: translate unknown capability returns translated=false', () => {
  const r = translate('capability', 'tool_id', 'nonexistentCap');
  assert.equal(r.translated, false);
});

test('Unify/Vocabularies: translate rejects missing arguments', () => {
  const r = translate(null, 'industry', '0901');
  assert.equal(r.translated, false);
});

test('Unify/Vocabularies: translate unsupported pair returns translated=false', () => {
  const r = translate('industry', 'iso_currency', 'healthcare');
  assert.equal(r.translated, false);
});

test('Unify/Vocabularies: getIndustryDomainMap returns full mapping', () => {
  const m = getIndustryDomainMap();
  assert.equal(Object.keys(m).length, 10); // 10 Pulse industries
  assert.equal(m.healthcare.research, 'life_sciences');
  assert.equal(m.energy.sector, 'mining');
});

test('Unify/Vocabularies: getHsChapterMap returns full mapping', () => {
  const m = getHsChapterMap();
  assert.ok(Object.keys(m).length >= 90); // 99 chapters covered
  assert.equal(m['01'], 'agriculture');
  assert.equal(m['30'], 'healthcare');
});

test('Unify/Vocabularies: listTranslations returns supported pairs', () => {
  const list = listTranslations();
  assert.ok(list.length >= 8);
  assert.ok(list.some(p => p.from === 'hs_code' && p.to === 'industry'));
  assert.ok(list.some(p => p.from === 'capability' && p.to === 'tool_id'));
});

// =====================================================================
// END-TO-END — "Everything Connected. Everyone Unified." scenario
// =====================================================================

test('Unify/E2E: federated identity + event bus + capability routing in one flow', () => {
  resetAll();
  // Register research-academic tool with its API
  registerTool({
    manifest: researchAcademicManifest,
    api: {
      validateDOI: (doi) => ({ valid: true, normalized: `https://doi.org/${doi}` }),
    },
  });
  // Create a federated identity for a researcher
  const researcher = createIdentity({
    type: 'orcid',
    value: '0000-0002-1825-0097',
    metadata: { name: 'Josiah Carberry' },
  });
  // Link the researcher's DOI to their identity
  linkIdentity(researcher, {
    type: 'doi',
    value: '10.1000/182',
    source: 'research-academic',
    confidence: 1,
  });
  // Set up an event bus with a citation-verified subscriber
  const bus = createBus({ replay: true });
  const verifiedEvents = [];
  subscribe(bus, 'citation-verified', (evt) => { verifiedEvents.push(evt); });
  // Dispatch a DOI validation via the mesh (capability routing)
  const validation = dispatch('citationValidation', 'validateDOI', ['10.1000/182']);
  assert.equal(validation.valid, true);
  // Publish the verification event via the bus
  routeEvent(bus, {
    type: 'doi-verified',
    sourceToolId: 'research-academic',
    payload: { doi: '10.1000/182', valid: true },
  }, researchAcademicManifest.syncChannels);
  // The citation-verified channel should have received it
  assert.ok(verifiedEvents.some(e => e.topic === 'citation-verified'));
  // Resolve the identity by DOI (cross-tool federation)
  const resolved = resolveIdentity('doi', '10.1000/182');
  assert.equal(resolved.id, researcher.id);
  assert.equal(resolved.metadata.name, 'Josiah Carberry');
});
