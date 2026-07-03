/**
 * Manya Pulse — Industry presets engine tests.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INDUSTRIES,
  INDUSTRY_IDS,
  getIndustry,
  listIndustries,
  createRedactionConfig,
  createIndustryPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
} from '../src/index.js';

test('Pulse: INDUSTRIES has 10 industries', () => {
  assert.equal(INDUSTRY_IDS.length, 10);
  const expected = ['healthcare', 'finance', 'legal', 'iot', 'government', 'education', 'retail', 'energy', 'telecom', 'gaming'];
  assert.deepEqual(INDUSTRY_IDS, expected);
});

test('Pulse: getIndustry returns valid config', () => {
  const hc = getIndustry('healthcare');
  assert.equal(hc.id, 'healthcare');
  assert.equal(hc.name, 'Healthcare');
  assert.ok(hc.frameworks.includes('HIPAA'));
  assert.ok(hc.signalTypes.includes('hl7-message'));
  assert.ok(hc.complianceNotes.length > 0);
});

test('Pulse: getIndustry throws for unknown industry', () => {
  assert.throws(() => getIndustry('nonexistent'), /Unknown industry/);
});

test('Pulse: listIndustries returns all 10', () => {
  const list = listIndustries();
  assert.equal(list.length, 10);
  assert.ok(list.every(i => i.id && i.name && i.frameworks.length > 0));
});

test('Pulse: createRedactionConfig - healthcare uses phi preset', () => {
  const config = createRedactionConfig('healthcare');
  assert.ok(config.rules.includes('mrn'));
  assert.ok(config.rules.includes('npi'));
  assert.equal(config.preset, 'phi');
});

test('Pulse: createRedactionConfig - finance uses financial preset', () => {
  const config = createRedactionConfig('finance');
  assert.ok(config.rules.includes('creditCard'));
  assert.ok(config.rules.includes('swiftCode'));
  assert.equal(config.preset, 'financial');
});

test('Pulse: createRedactionConfig - government uses all preset', () => {
  const config = createRedactionConfig('government');
  assert.ok(config.rules.length >= 14);
  assert.equal(config.preset, 'all');
});

test('Pulse: createRedactionConfig - extra rules are added', () => {
  const config = createRedactionConfig('healthcare', { extraRules: ['creditCard'] });
  assert.ok(config.rules.includes('creditCard'));
  assert.ok(config.rules.includes('mrn'));
});

test('Pulse: createIndustryPolicy - healthcare has physician role', () => {
  const policy = createIndustryPolicy('healthcare');
  assert.ok(policy.roles.length > 0);
  assert.ok(policy.roles.some(r => r.name === 'physician'));
});

test('Pulse: createIndustryPolicy - with shield module creates live policy', () => {
  // Mock shield module
  const mockShield = {
    createPolicy: (name, opts) => ({ name, ...opts, roles: new Map(), rules: [], subjects: new Map() }),
    defineRole: (policy, name, opts) => { policy.roles.set(name, { name, ...opts, permissions: [] }); },
    grant: (policy, roleName, perms) => { const role = policy.roles.get(roleName); if (role) role.permissions.push(...perms); },
  };
  const policy = createIndustryPolicy('healthcare', mockShield);
  assert.ok(policy.roles.has('physician'));
});

test('Pulse: createAuditTemplate - finance has transaction events', () => {
  const template = createAuditTemplate('finance');
  assert.ok(template.events.includes('transaction.execute'));
  assert.ok(template.events.includes('payment.authorize'));
});

test('Pulse: createSignalConfig - healthcare hl7-message', () => {
  const config = createSignalConfig('healthcare', 'hl7-message');
  assert.equal(config.type, 'hl7-message');
  assert.equal(config.priority, 'high');
  assert.equal(config.headers['x-format'], 'hl7-v2');
});

test('Pulse: createSignalConfig - rejects invalid signal type', () => {
  assert.throws(() => createSignalConfig('healthcare', 'swift-message'), /not available/);
});

test('Pulse: createVaultConfig - returns namespace and tags', () => {
  const config = createVaultConfig('finance');
  assert.equal(config.namespace, 'finance');
  assert.ok(config.tags.includes('pci-dss'));
  assert.ok(config.description.length > 0);
});

test('Pulse: createPreset - complete preset for education', () => {
  const preset = createPreset('education');
  assert.equal(preset.industry.id, 'education');
  assert.ok(preset.redaction.rules.length > 0);
  assert.ok(preset.policy.roles.length > 0);
  assert.ok(preset.audit.events.length > 0);
  assert.ok(preset.signal.availableTypes.includes('grade-notification'));
  assert.equal(preset.vault.namespace, 'education');
  assert.ok(preset.compliance.length > 0);
});

test('Pulse: each industry has valid preset', () => {
  for (const id of INDUSTRY_IDS) {
    const preset = createPreset(id);
    assert.equal(preset.industry.id, id, `${id} preset should have matching id`);
    assert.ok(preset.redaction.rules.length > 0, `${id} should have redaction rules`);
    assert.ok(preset.compliance.length > 0, `${id} should have compliance notes`);
  }
});
