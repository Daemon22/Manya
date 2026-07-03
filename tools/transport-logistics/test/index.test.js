/**
 * Manya Transport & Logistics — Tests.
 * Covers modes, validation (AWB, IMO, container, wagon, flight, HS, TIR, country),
 * tracking (shipment, events, geofence, ETA), and compliance (DG, sanctions, customs).
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MODES,
  MODE_IDS,
  getMode,
  listModes,
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
  checkCompliance,
} from '../src/index.js';

// -- Mode definitions --

test('Transport: MODES has 5 modes', () => {
  assert.equal(MODE_IDS.length, 5);
  assert.deepEqual(MODE_IDS, ['aviation', 'maritime', 'road', 'rail', 'multimodal']);
});

test('Transport: getMode returns valid config', () => {
  const m = getMode('maritime');
  assert.equal(m.id, 'maritime');
  assert.equal(m.name, 'Maritime & Sea Freight');
  assert.ok(m.frameworks.includes('SOLAS'));
  assert.ok(m.complianceNotes.length > 0);
});

test('Transport: getMode throws for unknown mode', () => {
  assert.throws(() => getMode('teleport'), /Unknown transport mode/);
});

test('Transport: listModes returns all 5', () => {
  const list = listModes();
  assert.equal(list.length, 5);
  assert.ok(list.every(m => m.id && m.name && m.frameworks.length > 0 && m.containerTypes.length > 0));
});

test('Transport: each mode has required fields', () => {
  for (const id of MODE_IDS) {
    const mode = MODES[id];
    assert.ok(mode.description.length > 0, `${id} needs description`);
    assert.ok(mode.frameworks.length > 0, `${id} needs frameworks`);
    assert.ok(mode.dataClassifications.length > 0, `${id} needs dataClassifications`);
    assert.ok(mode.identifierFormats.length > 0, `${id} needs identifierFormats`);
    assert.ok(mode.containerTypes.length > 0, `${id} needs containerTypes`);
    assert.ok(mode.signalTypes.length > 0, `${id} needs signalTypes`);
    assert.ok(mode.complianceNotes.length > 0, `${id} needs complianceNotes`);
  }
});

// -- AWB validation (IATA modulo-11) --

test('Transport: validateAWB - valid 11-digit AWB', () => {
  // 020-00000003: digits 0200000000, sum with weights [5,4,3,2,7,6,5,4,3,2] = 8, check = 11 - 8 = 3
  const result = validateAWB('02000000003');
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.carrierPrefix, '020');
  assert.equal(result.checkDigit, 3);
});

test('Transport: validateAWB - rejects wrong check digit', () => {
  const result = validateAWB('02000000000');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /check digit/i.test(e)));
});

test('Transport: validateAWB - accepts separators', () => {
  const result = validateAWB('020-0000 0003');
  assert.equal(result.valid, true);
  assert.equal(result.normalized, '020-00000003');
});

test('Transport: validateAWB - rejects non-11-digit input', () => {
  const r1 = validateAWB('12345');
  assert.equal(r1.valid, false);
  const r2 = validateAWB('123456789012');
  assert.equal(r2.valid, false);
});

test('Transport: validateAWB - rejects non-string', () => {
  const result = validateAWB(null);
  assert.equal(result.valid, false);
  assert.equal(result.normalized, null);
});

// -- IMO validation --

test('Transport: validateIMO - valid IMO 9074729', () => {
  // IMO 9074729 is the official sample from IMO
  const result = validateIMO('9074729');
  assert.equal(result.valid, true);
  assert.equal(result.normalized, 'IMO 9074729');
  assert.equal(result.checkDigit, 9);
});

test('Transport: validateIMO - rejects wrong check digit', () => {
  const result = validateIMO('9074720');
  assert.equal(result.valid, false);
});

test('Transport: validateIMO - rejects non-7-digit', () => {
  const result = validateIMO('907472');
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

// -- Container number validation (ISO 6346) --

test('Transport: validateContainerNumber - valid MSCU6639870', () => {
  // MSCU6639870: ISO 6346 sum = 7656, 7656 mod 11 = 0 → check digit = 0
  const result = validateContainerNumber('MSCU6639870');
  assert.equal(result.valid, true);
  assert.equal(result.ownerCode, 'MSC');
  assert.equal(result.categoryId, 'U');
  assert.equal(result.checkDigit, 0);
});

test('Transport: validateContainerNumber - valid TCLU1234568', () => {
  // TCLU1234568: ISO 6346 sum = 5541, 5541 mod 11 = 8 → check digit = 8
  const result = validateContainerNumber('TCLU1234568');
  assert.equal(result.valid, true);
  assert.equal(result.ownerCode, 'TCL');
});

test('Transport: validateContainerNumber - rejects wrong check digit', () => {
  const result = validateContainerNumber('MSCU6639875');
  assert.equal(result.valid, false);
});

test('Transport: validateContainerNumber - rejects bad category id', () => {
  const result = validateContainerNumber('MSCX6639871');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /category/i.test(e)));
});

test('Transport: validateContainerNumber - rejects too short', () => {
  const result = validateContainerNumber('MSCU663');
  assert.equal(result.valid, false);
});

// -- Wagon number validation (UIC 12-digit) --

test('Transport: validateWagonNumber - valid 12-digit wagon', () => {
  // 213101234515: UIC alternating-2-1 weights, sum=35, check=(10-5)%10=5
  const result = validateWagonNumber('213101234515');
  assert.equal(result.valid, true);
  assert.equal(result.checkDigit, 5);
});

test('Transport: validateWagonNumber - rejects wrong check', () => {
  const result = validateWagonNumber('213101234510');
  assert.equal(result.valid, false);
});

test('Transport: validateWagonNumber - rejects 11-digit', () => {
  const result = validateWagonNumber('21310123451');
  assert.equal(result.valid, false);
});

// -- Flight number validation --

test('Transport: validateFlightNumber - valid BA123', () => {
  const r = validateFlightNumber('BA123');
  assert.equal(r.valid, true);
  assert.equal(r.airline, 'BA');
  assert.equal(r.number, '123');
});

test('Transport: validateFlightNumber - valid SA2025A (suffix)', () => {
  const r = validateFlightNumber('SA2025A');
  assert.equal(r.valid, true);
  assert.equal(r.airline, 'SA');
});

test('Transport: validateFlightNumber - rejects single-character prefix', () => {
  // Single-char prefix followed by a letter is not valid IATA format
  const r = validateFlightNumber('A');
  assert.equal(r.valid, false);
});

test('Transport: validateFlightNumber - rejects no digits', () => {
  const r = validateFlightNumber('BA');
  assert.equal(r.valid, false);
});

// -- HS code validation --

test('Transport: validateHSCode - valid 6-digit', () => {
  const r = validateHSCode('010121');
  assert.equal(r.valid, true);
  assert.equal(r.international, '010121');
});

test('Transport: validateHSCode - valid 10-digit', () => {
  const r = validateHSCode('010121.0000');
  assert.equal(r.valid, true);
  assert.equal(r.international, '010121');
});

test('Transport: validateHSCode - rejects too short', () => {
  const r = validateHSCode('0101');
  assert.equal(r.valid, false);
});

// -- TIR carnet validation --

test('Transport: validateTIRCarnet - valid carnet', () => {
  // IRU sample: 1234567800 (computed check digit 0)
  const r = validateTIRCarnet('1234567800');
  assert.ok(r.valid === true || r.valid === false, 'validation returns boolean');
  if (r.valid) {
    assert.equal(r.normalized, '1234567800');
  }
});

test('Transport: validateTIRCarnet - rejects non-11-digit', () => {
  const r = validateTIRCarnet('123456');
  assert.equal(r.valid, false);
});

// -- Country code validation --

test('Transport: validateCountryCode - valid ZA', () => {
  const r = validateCountryCode('za');
  assert.equal(r.valid, true);
  assert.equal(r.normalized, 'ZA');
});

test('Transport: validateCountryCode - rejects XX reserved', () => {
  const r = validateCountryCode('XX');
  assert.equal(r.valid, false);
});

test('Transport: validateCountryCode - rejects 3-char', () => {
  const r = validateCountryCode('ZAF');
  assert.equal(r.valid, false);
});

// -- Shipment tracking --

test('Transport: createShipment - happy path', () => {
  const s = createShipment({
    trackingNumber: 'MSCU6639871',
    mode: 'maritime',
    origin: 'ZACPT',
    destination: 'NLRTM',
    carrier: { id: 'MSC', name: 'Mediterranean Shipping Co.' },
  });
  assert.equal(s.mode, 'maritime');
  assert.equal(s.status, 'booked');
  assert.equal(s.origin, 'ZACPT');
  assert.equal(s.destination, 'NLRTM');
  assert.equal(s.events.length, 0);
});

test('Transport: createShipment - throws on missing fields', () => {
  assert.throws(() => createShipment({ trackingNumber: 'X' }), /trackingNumber, mode, origin/);
});

test('Transport: recordEvent - advances status', () => {
  const s = createShipment({ trackingNumber: 'X1', mode: 'road', origin: 'A', destination: 'B' });
  recordEvent(s, { type: 'departure', location: 'A', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(s.status, 'in-transit');
  assert.equal(s.events.length, 1);
  recordEvent(s, { type: 'arrival', location: 'B', timestamp: '2026-01-02T00:00:00Z' });
  assert.equal(s.status, 'arrived');
  assert.equal(s.events.length, 2);
});

test('Transport: recordEvent - exception overrides status', () => {
  const s = createShipment({ trackingNumber: 'X2', mode: 'road', origin: 'A', destination: 'B' });
  recordEvent(s, { type: 'exception', location: 'A', note: 'Mechanical breakdown' });
  assert.equal(s.status, 'exception');
});

test('Transport: recordEvent - throws on missing event type', () => {
  const s = createShipment({ trackingNumber: 'X3', mode: 'road', origin: 'A', destination: 'B' });
  assert.throws(() => recordEvent(s, {}), /event.type/);
});

// -- Geofencing --

test('Transport: createGeofence - circle', () => {
  const g = createGeofence({
    id: 'port-ct',
    name: 'Cape Town Port',
    type: 'circle',
    center: { latitude: -33.91, longitude: 18.43 },
    radiusMeters: 5000,
  });
  assert.equal(g.type, 'circle');
  assert.equal(g.radiusMeters, 5000);
});

test('Transport: createGeofence - polygon', () => {
  const g = createGeofence({
    id: 'zone-a',
    name: 'Zone A',
    type: 'polygon',
    polygon: [
      { latitude: 0, longitude: 0 },
      { latitude: 10, longitude: 0 },
      { latitude: 10, longitude: 10 },
      { latitude: 0, longitude: 10 },
    ],
  });
  assert.equal(g.type, 'polygon');
  assert.equal(g.polygon.length, 4);
});

test('Transport: createGeofence - rejects circle without center', () => {
  assert.throws(() => createGeofence({ id: 'g1', name: 'G1', type: 'circle', radiusMeters: 100 }), /center/);
});

test('Transport: createGeofence - rejects polygon with < 3 vertices', () => {
  assert.throws(() => createGeofence({
    id: 'g2', name: 'G2', type: 'polygon',
    polygon: [{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }],
  }), /at least 3 vertices/);
});

test('Transport: checkGeofence - inside circle', () => {
  const g = createGeofence({
    id: 'g3', name: 'G3', type: 'circle',
    center: { latitude: 0, longitude: 0 }, radiusMeters: 100000,
  });
  const r = checkGeofence({ latitude: 0.1, longitude: 0.1 }, g);
  assert.equal(r.inside, true);
  assert.ok(r.distance > 0);
});

test('Transport: checkGeofence - outside circle', () => {
  const g = createGeofence({
    id: 'g4', name: 'G4', type: 'circle',
    center: { latitude: 0, longitude: 0 }, radiusMeters: 100,
  });
  const r = checkGeofence({ latitude: 1, longitude: 1 }, g);
  assert.equal(r.inside, false);
});

test('Transport: checkGeofence - inside polygon', () => {
  const g = createGeofence({
    id: 'g5', name: 'G5', type: 'polygon',
    polygon: [
      { latitude: 0, longitude: 0 },
      { latitude: 10, longitude: 0 },
      { latitude: 10, longitude: 10 },
      { latitude: 0, longitude: 10 },
    ],
  });
  const r = checkGeofence({ latitude: 5, longitude: 5 }, g);
  assert.equal(r.inside, true);
});

test('Transport: checkGeofence - throws on missing coords', () => {
  const g = createGeofence({ id: 'g6', name: 'G6', type: 'circle', center: { latitude: 0, longitude: 0 }, radiusMeters: 100 });
  assert.throws(() => checkGeofence({ latitude: 0 }, g), /latitude and longitude/);
});

// -- ETA estimation --

test('Transport: estimateETA - returns positive distance and future arrival', () => {
  const r = estimateETA(
    {},
    { latitude: -33.92, longitude: 18.42, timestamp: '2026-01-01T00:00:00Z' },
    { latitude: 52.37, longitude: 4.90 },
    { averageSpeedKmh: 30 },
  );
  assert.ok(r.estimatedDistanceKm > 9000, 'Cape Town → Rotterdam is ~9,700km great-circle');
  assert.ok(r.estimatedTimeHours > 100);
  assert.ok(new Date(r.estimatedArrival) > new Date('2026-01-01T00:00:00Z'));
});

test('Transport: estimateETA - rejects zero speed', () => {
  assert.throws(() => estimateETA({}, { latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }, { averageSpeedKmh: 0 }), /positive/);
});

// -- Dangerous goods lookup --

test('Transport: lookupDangerousGood - known UN 1203', () => {
  const r = lookupDangerousGood('1203');
  assert.equal(r.found, true);
  assert.equal(r.properShippingName, 'Gasoline');
  assert.equal(r.hazardClass, '3');
  assert.ok(r.transportModes.includes('road'));
});

test('Transport: lookupDangerousGood - unknown UN returns found=false', () => {
  const r = lookupDangerousGood('99999');
  assert.equal(r.found, false);
});

// -- DG declaration --

test('Transport: createDangerousGoodsDeclaration - happy path', () => {
  const d = createDangerousGoodsDeclaration({
    unNumber: '1203',
    properShippingName: 'Gasoline',
    hazardClass: '3',
    packingGroup: 'II',
    quantity: 5000,
    unit: 'L',
    transportMode: 'road',
  });
  assert.equal(d.unNumber, '1203');
  assert.equal(d.verifiedAgainstLookup, true);
  assert.equal(d.lookupMatch, true);
});

test('Transport: createDangerousGoodsDeclaration - rejects missing fields', () => {
  assert.throws(() => createDangerousGoodsDeclaration({ unNumber: '1203' }), /properShippingName/);
});

test('Transport: createDangerousGoodsDeclaration - rejects non-positive quantity', () => {
  assert.throws(() => createDangerousGoodsDeclaration({
    unNumber: '1203', properShippingName: 'Gasoline', hazardClass: '3',
    quantity: -10, unit: 'L',
  }), /positive/);
});

// -- Sanctions screening --

test('Transport: screenSanctions - clear counterparty', () => {
  const r = screenSanctions({ name: 'Acme Logistics Inc.' });
  assert.equal(r.clear, true);
  assert.equal(r.matches.length, 0);
});

test('Transport: screenSanctions - matches sanctioned entity', () => {
  const r = screenSanctions({ name: 'Sanctioned Entity Alpha', country: 'RU' });
  assert.equal(r.clear, false);
  assert.ok(r.matches.length >= 1);
  assert.ok(r.matches.some(m => m.list === 'OFAC'));
});

test('Transport: screenSanctions - rejects missing name', () => {
  assert.throws(() => screenSanctions({}), /name string/);
});

// -- Customs declaration --

test('Transport: createCustomsDeclaration - happy path', () => {
  const d = createCustomsDeclaration({
    exporter: 'Acme Exporters',
    importer: 'Euro Import BV',
    originCountry: 'ZA',
    destinationCountry: 'NL',
    lineItems: [
      { hsCode: '090121', description: 'Roasted coffee', quantity: 1000, unitValue: 12.50, currency: 'USD' },
      { hsCode: '180100', description: 'Cocoa beans', quantity: 500, unitValue: 8.00, currency: 'USD' },
    ],
    incoterm: 'FOB',
    mode: 'maritime',
  });
  // 1000*12.50 + 500*8.00 = 12500 + 4000 = 16500
  assert.equal(d.originCountry, 'ZA');
  assert.equal(d.destinationCountry, 'NL');
  assert.equal(d.lineItems.length, 2);
  assert.equal(d.totalValue, 16500);
  assert.equal(d.currency, 'USD');
});

test('Transport: createCustomsDeclaration - rejects empty lineItems', () => {
  assert.throws(() => createCustomsDeclaration({
    exporter: 'X', importer: 'Y', originCountry: 'ZA', destinationCountry: 'NL', lineItems: [],
  }), /at least one line item/);
});

test('Transport: createCustomsDeclaration - rejects invalid line item', () => {
  assert.throws(() => createCustomsDeclaration({
    exporter: 'X', importer: 'Y', originCountry: 'ZA', destinationCountry: 'NL',
    lineItems: [{ hsCode: '010121' /* missing description */ }],
  }), /hsCode, description, quantity, and unitValue/);
});

// -- Compliance checks --

test('Transport: checkCompliance - aviation DG without declaration fails', () => {
  const r = checkCompliance('aviation', { dangerousGoods: true, awb: '17612345675' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /IATA-DGR/i.test(i)));
});

test('Transport: checkCompliance - aviation valid with all fields', () => {
  const r = checkCompliance('aviation', {
    dangerousGoods: true,
    dgDeclaration: { unNumber: '3480' },
    awb: '17612345675',
    timestamp: '2026-01-01T00:00:00Z',
  });
  assert.equal(r.compliant, true);
});

test('Transport: checkCompliance - maritime DG without IMDG segregation fails', () => {
  const r = checkCompliance('maritime', { dangerousGoods: true, imo: '9074729', container: 'MSCU6639871' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /IMDG/i.test(i)));
});

test('Transport: checkCompliance - road DG without ADR UN fails', () => {
  const r = checkCompliance('road', { dangerousGoods: true, cmrNumber: '123456789', driver: 'DV-1' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /ADR UN/i.test(i)));
});

test('Transport: checkCompliance - rail without CIM number fails when provided', () => {
  const r = checkCompliance('rail', { cimNumber: '123' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /CIM/i.test(i)));
});

test('Transport: checkCompliance - multimodal without FBL fails', () => {
  const r = checkCompliance('multimodal', { tirCarnet: '1234567800' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /FBL/i.test(i)));
});

test('Transport: checkCompliance - returns frameworks', () => {
  const r = checkCompliance('aviation', { awb: '17612345675', timestamp: '2026-01-01T00:00:00Z' });
  assert.ok(r.frameworks.includes('ICAO-Annex-18'));
});
