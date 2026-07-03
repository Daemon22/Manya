/**
 * Manya Primary Sector — Sector tools tests.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SECTORS,
  SECTOR_IDS,
  getSector,
  listSectors,
  validateCoordinates,
  validateCommodity,
  validateSensorReading,
  validateProductionReport,
  validateUnit,
  createRedactionConfig,
  createSectorPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
  checkCompliance,
} from '../src/index.js';

// -- Sector definitions --

test('Primary Sector: SECTORS has 4 sectors', () => {
  assert.equal(SECTOR_IDS.length, 4);
  assert.deepEqual(SECTOR_IDS, ['agriculture', 'mining', 'forestry', 'fishing']);
});

test('Primary Sector: getSector returns valid config', () => {
  const ag = getSector('agriculture');
  assert.equal(ag.id, 'agriculture');
  assert.equal(ag.name, 'Agriculture');
  assert.ok(ag.frameworks.includes('GLOBALG.A.P'));
  assert.ok(ag.commodities.includes('wheat'));
  assert.ok(ag.complianceNotes.length > 0);
});

test('Primary Sector: getSector throws for unknown sector', () => {
  assert.throws(() => getSector('nonexistent'), /Unknown sector/);
});

test('Primary Sector: listSectors returns all 4', () => {
  const list = listSectors();
  assert.equal(list.length, 4);
  assert.ok(list.every(s => s.id && s.name && s.frameworks.length > 0 && s.commodities.length > 0));
});

test('Primary Sector: each sector has required fields', () => {
  for (const id of SECTOR_IDS) {
    const sector = SECTORS[id];
    assert.ok(sector.description.length > 0, `${id} needs description`);
    assert.ok(sector.frameworks.length > 0, `${id} needs frameworks`);
    assert.ok(sector.dataClassifications.length > 0, `${id} needs dataClassifications`);
    assert.ok(sector.commodities.length > 0, `${id} needs commodities`);
    assert.ok(sector.units.length > 0, `${id} needs units`);
    assert.ok(sector.signalTypes.length > 0, `${id} needs signalTypes`);
    assert.ok(sector.complianceNotes.length > 0, `${id} needs complianceNotes`);
  }
});

// -- Coordinate validation --

test('Primary Sector: validateCoordinates - valid coordinates', () => {
  const result = validateCoordinates({ latitude: -33.9249, longitude: 18.4241 });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.ok(result.normalized);
  assert.equal(result.normalized.latitude, -33.9249);
});

test('Primary Sector: validateCoordinates - invalid latitude', () => {
  const result = validateCoordinates({ latitude: 95, longitude: 0 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /latitude/i.test(e)));
});

test('Primary Sector: validateCoordinates - invalid longitude', () => {
  const result = validateCoordinates({ latitude: 0, longitude: 200 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /longitude/i.test(e)));
});

test('Primary Sector: validateCoordinates - null input', () => {
  const result = validateCoordinates(null);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('Primary Sector: validateCoordinates - precision normalization', () => {
  const result = validateCoordinates({ latitude: -33.9248689, longitude: 18.4241488 }, { precision: 4 });
  assert.equal(result.valid, true);
  assert.equal(result.normalized.latitude, -33.9249);
  assert.equal(result.normalized.longitude, 18.4241);
});

// -- Commodity validation --

test('Primary Sector: validateCommodity - valid commodity', () => {
  const result = validateCommodity('agriculture', 'wheat', SECTORS);
  assert.equal(result.valid, true);
  assert.equal(result.commodity, 'wheat');
});

test('Primary Sector: validateCommodity - case insensitive', () => {
  const result = validateCommodity('mining', 'Gold', SECTORS);
  assert.equal(result.valid, true);
  assert.equal(result.commodity, 'gold');
});

test('Primary Sector: validateCommodity - invalid commodity', () => {
  const result = validateCommodity('fishing', 'unobtainium', SECTORS);
  assert.equal(result.valid, false);
});

test('Primary Sector: validateCommodity - unknown sector', () => {
  const result = validateCommodity('unknown', 'wheat', SECTORS);
  assert.equal(result.valid, false);
});

test('Primary Sector: validateCommodity - fuzzy suggestions', () => {
  const result = validateCommodity('forestry', 'oak', SECTORS);
  assert.equal(result.valid, true); // 'oak' is a valid forestry commodity
});

// -- Sensor reading validation --

test('Primary Sector: validateSensorReading - valid reading', () => {
  const result = validateSensorReading({ type: 'temperature', value: 25.5, unit: 'celsius' });
  assert.equal(result.valid, true);
  assert.ok(result.reading.timestamp);
});

test('Primary Sector: validateSensorReading - invalid type', () => {
  const result = validateSensorReading({ type: 'unknown', value: 1, unit: 'x' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /type/i.test(e)));
});

test('Primary Sector: validateSensorReading - pH out of range', () => {
  const result = validateSensorReading({ type: 'ph', value: 15, unit: 'pH' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /pH/i.test(e)));
});

test('Primary Sector: validateSensorReading - temperature warning', () => {
  const result = validateSensorReading({ type: 'temperature', value: -110, unit: 'celsius' });
  assert.equal(result.valid, true); // valid but with warning
  assert.ok(result.warnings.length > 0);
});

test('Primary Sector: validateSensorReading - auto-timestamp', () => {
  const result = validateSensorReading({ type: 'moisture', value: 45, unit: 'percent' });
  assert.equal(result.valid, true);
  assert.ok(result.reading.timestamp);
});

// -- Production report validation --

test('Primary Sector: validateProductionReport - valid report', () => {
  const result = validateProductionReport({
    sectorId: 'agriculture',
    commodity: 'wheat',
    quantity: 5000,
    unit: 'tonne',
  });
  assert.equal(result.valid, true);
  assert.ok(result.report.timestamp);
});

test('Primary Sector: validateProductionReport - missing fields', () => {
  const result = validateProductionReport({ sectorId: 'mining' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 2);
});

test('Primary Sector: validateProductionReport - negative quantity', () => {
  const result = validateProductionReport({
    sectorId: 'fishing',
    commodity: 'tuna',
    quantity: -10,
    unit: 'tonne',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /quantity/i.test(e)));
});

test('Primary Sector: validateProductionReport - with location', () => {
  const result = validateProductionReport({
    sectorId: 'forestry',
    commodity: 'pine',
    quantity: 100,
    unit: 'cubic-meter',
    location: { latitude: -25.7, longitude: 28.2 },
  });
  assert.equal(result.valid, true);
});

test('Primary Sector: validateProductionReport - invalid location in report', () => {
  const result = validateProductionReport({
    sectorId: 'mining',
    commodity: 'gold',
    quantity: 50,
    unit: 'ounce-troy',
    location: { latitude: 200, longitude: 0 },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /location/i.test(e)));
});

// -- Unit validation --

test('Primary Sector: validateUnit - valid unit', () => {
  const result = validateUnit('agriculture', 'hectare', SECTORS);
  assert.equal(result.valid, true);
});

test('Primary Sector: validateUnit - invalid unit', () => {
  const result = validateUnit('mining', 'lightyear', SECTORS);
  assert.equal(result.valid, false);
});

test('Primary Sector: validateUnit - case insensitive', () => {
  const result = validateUnit('fishing', 'Tonne', SECTORS);
  assert.equal(result.valid, true);
});

// -- Redaction config --

test('Primary Sector: createRedactionConfig - agriculture preset', () => {
  const config = createRedactionConfig('agriculture');
  assert.ok(config.rules.includes('gpsCoordinate'));
  assert.ok(config.rules.includes('farmLicense'));
  assert.equal(config.preset, 'agriculture');
});

test('Primary Sector: createRedactionConfig - mining with extra rules', () => {
  const config = createRedactionConfig('mining', { extraRules: ['customRule'] });
  assert.ok(config.rules.includes('mineLicense'));
  assert.ok(config.rules.includes('customRule'));
});

// -- Policy templates --

test('Primary Sector: createSectorPolicy - agriculture has farm-manager role', () => {
  const policy = createSectorPolicy('agriculture');
  assert.ok(policy.roles.length > 0);
  assert.ok(policy.roles.some(r => r.name === 'farm-manager'));
});

test('Primary Sector: createSectorPolicy - mining with shield module', () => {
  const mockShield = {
    createPolicy: (name, opts) => ({ name, ...opts, roles: new Map(), rules: [], subjects: new Map() }),
    defineRole: (policy, name, opts) => { policy.roles.set(name, { name, ...opts, permissions: [] }); },
    grant: (policy, roleName, perms) => { const role = policy.roles.get(roleName); if (role) role.permissions.push(...perms); },
  };
  const policy = createSectorPolicy('mining', mockShield);
  assert.ok(policy.roles.has('mine-manager'));
});

// -- Audit templates --

test('Primary Sector: createAuditTemplate - forestry has felling events', () => {
  const template = createAuditTemplate('forestry');
  assert.ok(template.events.includes('felling.permit.issue'));
  assert.ok(template.description.length > 0);
});

test('Primary Sector: createAuditTemplate - fishing has catch events', () => {
  const template = createAuditTemplate('fishing');
  assert.ok(template.events.includes('catch.declare'));
});

// -- Signal configs --

test('Primary Sector: createSignalConfig - agriculture crop-report', () => {
  const config = createSignalConfig('agriculture', 'crop-report');
  assert.equal(config.type, 'crop-report');
  assert.equal(config.headers['x-sector'], 'agriculture');
});

test('Primary Sector: createSignalConfig - rejects invalid signal type', () => {
  assert.throws(() => createSignalConfig('mining', 'crop-report'), /not available/);
});

test('Primary Sector: createSignalConfig - blast-notification is critical', () => {
  const config = createSignalConfig('mining', 'blast-notification');
  assert.equal(config.priority, 'critical');
});

// -- Vault configs --

test('Primary Sector: createVaultConfig - returns namespace and tags', () => {
  const config = createVaultConfig('fishing');
  assert.equal(config.namespace, 'fishing');
  assert.ok(config.tags.length > 0);
  assert.ok(config.description.length > 0);
});

// -- Compliance checking --

test('Primary Sector: checkCompliance - compliant record', () => {
  const result = checkCompliance('agriculture', { timestamp: '2024-01-15T10:00:00Z' });
  assert.equal(result.compliant, true);
  assert.equal(result.issues.length, 0);
});

test('Primary Sector: checkCompliance - missing timestamp', () => {
  const result = checkCompliance('mining', {});
  assert.equal(result.compliant, false);
  assert.ok(result.issues.some(i => /timestamp/i.test(i)));
});

test('Primary Sector: checkCompliance - pesticide without applicator', () => {
  const result = checkCompliance('agriculture', { type: 'pesticide-application', timestamp: '2024-01-15T10:00:00Z' });
  assert.equal(result.compliant, false);
  assert.ok(result.issues.some(i => /applicator/i.test(i)));
});

test('Primary Sector: checkCompliance - blast plan without authorization', () => {
  const result = checkCompliance('mining', { type: 'blast-plan', timestamp: '2024-01-15T10:00:00Z' });
  assert.equal(result.compliant, false);
  assert.ok(result.issues.some(i => /authorization/i.test(i)));
});

test('Primary Sector: checkCompliance - felling permit without number', () => {
  const result = checkCompliance('forestry', { type: 'felling-permit', timestamp: '2024-01-15T10:00:00Z' });
  assert.equal(result.compliant, false);
  assert.ok(result.issues.some(i => /permit number/i.test(i)));
});

test('Primary Sector: checkCompliance - catch declaration without species', () => {
  const result = checkCompliance('fishing', { type: 'catch-declaration', timestamp: '2024-01-15T10:00:00Z' });
  assert.equal(result.compliant, false);
  assert.ok(result.issues.some(i => /species/i.test(i)));
});

// -- Full preset --

test('Primary Sector: createPreset - complete preset for mining', () => {
  const preset = createPreset('mining');
  assert.equal(preset.sector.id, 'mining');
  assert.ok(preset.redaction.rules.length > 0);
  assert.ok(preset.policy.roles.length > 0);
  assert.ok(preset.audit.events.length > 0);
  assert.ok(preset.signal.availableTypes.includes('blast-notification'));
  assert.equal(preset.vault.namespace, 'mining');
  assert.ok(preset.commodities.includes('gold'));
  assert.ok(preset.units.includes('tonne'));
  assert.ok(preset.compliance.length > 0);
});

test('Primary Sector: each sector has valid preset', () => {
  for (const id of SECTOR_IDS) {
    const preset = createPreset(id);
    assert.equal(preset.sector.id, id, `${id} preset should have matching id`);
    assert.ok(preset.redaction.rules.length > 0, `${id} should have redaction rules`);
    assert.ok(preset.compliance.length > 0, `${id} should have compliance notes`);
    assert.ok(preset.commodities.length > 0, `${id} should have commodities`);
  }
});
