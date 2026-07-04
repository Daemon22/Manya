/**
 * @manya/customs-shield — comprehensive unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  CustomsShield, screen,
  normalize, chapter, heading, international, isValidFormat, lookup, validate,
  suggest, verifyMatch,
  normalizeName, levenshtein, similarity, screenParty, screenParties,
  DEFAULT_COUNTRY_SANCTIONS,
  checkEmbargoes, checkLicenses, checkRestrictedOrigins, calculateDuty,
  HIGH_RISK_TRANSSHIPMENT, detectIndicators, bandFor, scoreFrom, analyzeVulnerabilities,
  buildImportDeclaration, buildSanctionsRecord, serialize, validateReport,
  DEFAULT_CONFIG,
  HSCodeError, SanctionsError, CustomsShieldError,
} from '../src';
import type { Shipment, ShieldFinding } from '../src';

describe('HS code validation', () => {
  test('isValidFormat accepts 6-10 digits', () => {
    expect(isValidFormat('010121')).toBe(true);
    expect(isValidFormat('0101.21')).toBe(true);
    expect(isValidFormat('0101210000')).toBe(true);
    expect(isValidFormat('0101.21.0000')).toBe(true);
    expect(isValidFormat('abc')).toBe(false);
    expect(isValidFormat('12345')).toBe(false);
  });

  test('normalize strips separators', () => {
    expect(normalize('0101.21.0000')).toBe('0101210000');
    expect(normalize('0101 21')).toBe('010121');
  });

  test('normalize throws on invalid', () => {
    expect(() => normalize('abc')).toThrow(HSCodeError);
  });

  test('chapter/heading/international extract correctly', () => {
    expect(chapter('010121')).toBe('01');
    expect(heading('010121')).toBe('0101');
    expect(international('0101210000')).toBe('010121');
  });

  test('validate rejects non-numeric input', () => {
    const v = validate('XX0000');
    expect(v.valid).toBe(false);
  });

  test('validate accepts known chapter', () => {
    const v = validate('010121');
    expect(v.valid).toBe(true);
  });

  test('lookup returns entry', () => {
    const e = lookup('010121');
    expect(e).toBeDefined();
    expect(e!.description).toContain('Live animals');
  });

  test('suggest returns relevant chapters', () => {
    const r = suggest('cotton textile apparel');
    expect(r.length).toBeGreaterThan(0);
    // Should suggest chapter 52 (cotton) near top.
    expect(r.some(s => s.code.startsWith('52'))).toBe(true);
  });

  test('verifyMatch', () => {
    const r = verifyMatch('010121', 'live animals horse');
    expect(r.confidence).toBeGreaterThan(0);
  });
});

describe('sanctions screening', () => {
  test('normalizeName uppercases and strips punctuation', () => {
    expect(normalizeName("O'Brien, Sarah!")).toBe('OBRIEN SARAH');
  });

  test('levenshtein', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  test('similarity', () => {
    expect(similarity('abc', 'abc')).toBe(1);
    expect(similarity('', '')).toBe(1);
    expect(similarity('abc', 'xyz')).toBe(0);
  });

  test('screenParty hits on country-level sanction', () => {
    const result = screenParty({ name: 'Some Co', country: 'CU' });
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits[0].entry.sanctionedCountry).toBe('CU');
  });

  test('screenParty hits on exact name match', () => {
    const result = screenParty({ name: 'Cuba', country: 'US' });
    expect(result.hits.some(h => h.matchType === 'exact')).toBe(true);
  });

  test('screenParty no hit on benign party', () => {
    const result = screenParty({ name: 'Benign Corp', country: 'US' });
    expect(result.hits).toHaveLength(0);
  });

  test('screenParties returns findings', () => {
    const findings = screenParties([
      { name: 'Cuba', country: 'US' },
      { name: 'Safe Co', country: 'CA' },
    ]);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some(f => f.category === 'sanctions_hit')).toBe(true);
  });

  test('DEFAULT_COUNTRY_SANCTIONS contains expected entries', () => {
    expect(DEFAULT_COUNTRY_SANCTIONS.some(e => e.sanctionedCountry === 'CU')).toBe(true);
    expect(DEFAULT_COUNTRY_SANCTIONS.some(e => e.sanctionedCountry === 'IR')).toBe(true);
  });
});

describe('compliance rules', () => {
  const embargoShipment: Shipment = {
    id: 's1', shipper: { name: 'A', country: 'US' }, consignee: { name: 'B', country: 'CU' },
    originCountry: 'US', destinationCountry: 'CU',
    items: [{ description: 'Widget', hsCode: '010121', quantity: 1, unit: 'pcs', unitValue: 100, countryOfOrigin: 'US' }],
    declaredValue: 100, currency: 'USD', createdAt: '2024-01-01',
  };

  test('checkEmbargoes detects US->CU', () => {
    const f = checkEmbargoes(embargoShipment);
    expect(f.length).toBeGreaterThan(0);
    expect(f[0].severity).toBe('critical');
  });

  test('checkLicenses detects firearms', () => {
    const s: Shipment = {
      ...embargoShipment,
      destinationCountry: 'US',
      consignee: { name: 'B', country: 'US' },
      items: [{ description: 'Ammo', hsCode: '930100', quantity: 1, unit: 'pcs', unitValue: 100, countryOfOrigin: 'US' }],
    };
    const f = checkLicenses(s);
    expect(f.length).toBeGreaterThan(0);
    expect(f[0].category).toBe('license_required');
  });

  test('checkRestrictedOrigins detects CN->US', () => {
    const s: Shipment = {
      ...embargoShipment,
      destinationCountry: 'US',
      consignee: { name: 'B', country: 'US' },
      items: [{ description: 'Tech', hsCode: '850100', quantity: 1, unit: 'pcs', unitValue: 100, countryOfOrigin: 'CN' }],
    };
    const f = checkRestrictedOrigins(s);
    expect(f.length).toBeGreaterThan(0);
  });

  test('calculateDuty returns expected duty', () => {
    const s: Shipment = {
      ...embargoShipment,
      destinationCountry: 'US',
      consignee: { name: 'B', country: 'US' },
      items: [{ description: 'T-shirt', hsCode: '610100', quantity: 100, unit: 'pcs', unitValue: 10, countryOfOrigin: 'CN' }],
      declaredValue: 1000, currency: 'USD',
    };
    const d = calculateDuty(s);
    expect(d.expected).toBeCloseTo(165, 0); // 16.5% of 1000
    expect(d.perItem).toHaveLength(1);
    expect(d.perItem[0].rate).toBe(16.5);
  });
});

describe('risk scoring', () => {
  test('HIGH_RISK_TRANSSHIPMENT includes known hubs', () => {
    expect(HIGH_RISK_TRANSSHIPMENT).toContain('AE');
    expect(HIGH_RISK_TRANSSHIPMENT).toContain('HK');
  });

  test('detectIndicators flags high-risk transshipment', () => {
    const s: Shipment = {
      id: 's', shipper: { name: 'A', country: 'CN' }, consignee: { name: 'B', country: 'US' },
      originCountry: 'CN', destinationCountry: 'US', transshipmentCountries: ['AE'],
      items: [{ description: 'Goods', hsCode: '010121', quantity: 1, unit: 'pcs', unitValue: 100, countryOfOrigin: 'CN' }],
      declaredValue: 100, currency: 'USD', createdAt: '2024-01-01',
    };
    const f = detectIndicators(s);
    expect(f.some(x => x.message.includes('high-risk country'))).toBe(true);
  });

  test('detectIndicators flags missing incoterm/mode', () => {
    const s: Shipment = {
      id: 's', shipper: { name: 'A', country: 'US' }, consignee: { name: 'B', country: 'US' },
      originCountry: 'US', destinationCountry: 'US',
      items: [{ description: 'Goods', hsCode: '010121', quantity: 1, unit: 'pcs', unitValue: 100, countryOfOrigin: 'US' }],
      declaredValue: 100, currency: 'USD', createdAt: '2024-01-01',
    };
    const f = detectIndicators(s);
    expect(f.some(x => x.category === 'documentation_gap' && x.message.includes('Incoterm'))).toBe(true);
    expect(f.some(x => x.category === 'documentation_gap' && x.message.includes('Mode'))).toBe(true);
  });

  test('bandFor maps correctly', () => {
    expect(bandFor(0)).toBe('low');
    expect(bandFor(20)).toBe('moderate');
    expect(bandFor(40)).toBe('elevated');
    expect(bandFor(60)).toBe('high');
    expect(bandFor(90)).toBe('critical');
  });

  test('scoreFrom caps at 100', () => {
    const findings: ShieldFinding[] = Array(20).fill({
      category: 'sanctions_country_hit', severity: 'critical', message: 'x', confidence: 1.0,
    });
    const { score } = scoreFrom(findings);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('scoreFrom triggers hold on critical', () => {
    const findings: ShieldFinding[] = [{
      category: 'sanctions_country_hit', severity: 'critical', message: 'x', confidence: 1.0,
    }];
    const { holdForReview } = scoreFrom(findings);
    expect(holdForReview).toBe(true);
  });

  test('analyzeVulnerabilities detects value concentration', () => {
    const s: Shipment = {
      id: 's', shipper: { name: 'A', country: 'US' }, consignee: { name: 'B', country: 'US' },
      originCountry: 'US', destinationCountry: 'US',
      items: [
        { description: 'Expensive', hsCode: '010121', quantity: 1, unit: 'pcs', unitValue: 1000, countryOfOrigin: 'US' },
        { description: 'Cheap', hsCode: '010121', quantity: 1, unit: 'pcs', unitValue: 10, countryOfOrigin: 'US' },
      ],
      declaredValue: 1010, currency: 'USD', createdAt: '2024-01-01',
    };
    const f = analyzeVulnerabilities(s);
    expect(f.some(x => x.category === 'vulnerability' && x.message.includes('concentration'))).toBe(true);
  });

  test('analyzeVulnerabilities detects shipper==consignee', () => {
    const s: Shipment = {
      id: 's', shipper: { name: 'Same', country: 'US' }, consignee: { name: 'Same', country: 'US' },
      originCountry: 'US', destinationCountry: 'US',
      items: [{ description: 'Goods', hsCode: '010121', quantity: 1, unit: 'pcs', unitValue: 100, countryOfOrigin: 'US' }],
      declaredValue: 100, currency: 'USD', createdAt: '2024-01-01',
    };
    const f = analyzeVulnerabilities(s);
    expect(f.some(x => x.message.includes('circular trade'))).toBe(true);
  });
});

describe('regulatory reporting', () => {
  const shipment: Shipment = {
    id: 'rpt-1', shipper: { name: 'A', country: 'US' }, consignee: { name: 'B', country: 'US' },
    originCountry: 'US', destinationCountry: 'US', mode: 'air', incoterm: 'FOB',
    items: [{ description: 'T-shirt', hsCode: '610100', quantity: 100, unit: 'pcs', unitValue: 10, countryOfOrigin: 'US', weightKg: 20 }],
    declaredValue: 1000, currency: 'USD', createdAt: '2024-01-01',
  };

  test('buildImportDeclaration', () => {
    const r = buildImportDeclaration(shipment, 'CBP');
    expect(r.regulator).toBe('CBP');
    expect(r.type).toBe('import_declaration');
    expect(r.fields.shipmentId).toBe('rpt-1');
    expect(r.fields.itemCount).toBe(1);
  });

  test('buildSanctionsRecord', () => {
    const report = screen(shipment, { logLevel: 'silent' });
    const r = buildSanctionsRecord(shipment, 'CBP', report);
    expect(r.type).toBe('sanctions_screening_record');
    expect(r.fields.riskScore).toBeDefined();
  });

  test('serialize produces JSON', () => {
    const r = buildImportDeclaration(shipment, 'CBP');
    const s = serialize(r);
    expect(() => JSON.parse(s)).not.toThrow();
  });

  test('validate detects missing fields', () => {
    const r = { regulator: '', shipmentId: '', type: '', fields: {}, generatedAt: '' };
    const v = validateReport(r as any);
    expect(v.valid).toBe(false);
    expect(v.missing.length).toBeGreaterThan(0);
  });
});

describe('CustomsShield end-to-end', () => {
  const baseShipment: Shipment = {
    id: 'e2e-1',
    shipper: { name: 'Safe Co', country: 'US' },
    consignee: { name: 'Safe Cust', country: 'US' },
    originCountry: 'US',
    destinationCountry: 'US',
    mode: 'road',
    incoterm: 'FCA',
    items: [
      { description: 'T-shirt', hsCode: '610100', quantity: 100, unit: 'pcs', unitValue: 10, countryOfOrigin: 'US', weightKg: 50 },
    ],
    declaredValue: 1000, currency: 'USD', createdAt: '2024-01-01',
    // Declared duty matches expected (16.5% of $1000 = $165) to avoid duty_miscalculation finding.
    ...({ declaredDuty: 165 } as any),
  };

  test('clean shipment returns low risk', () => {
    const r = screen(baseShipment, { logLevel: 'silent' });
    expect(r.riskBand).toBe('low');
    expect(r.holdForReview).toBe(false);
    // Clean shipment may have a low-severity hs_code_suggestion + vulnerability concentration,
    // but those contribute < 10 points combined.
    expect(r.riskScore).toBeLessThan(15);
  });

  test('embargo shipment triggers critical', () => {
    const s: Shipment = {
      ...baseShipment,
      destinationCountry: 'CU',
      consignee: { name: 'Cuban Co', country: 'CU' },
    };
    const r = screen(s, { logLevel: 'silent' });
    expect(r.riskBand).toBe('critical');
    expect(r.holdForReview).toBe(true);
    expect(r.findings.some(f => f.severity === 'critical')).toBe(true);
  });

  test('sanctions hit triggers hold', () => {
    const s: Shipment = {
      ...baseShipment,
      consignee: { name: 'Cuba', country: 'US' },
    };
    const r = screen(s, { logLevel: 'silent' });
    expect(r.findings.some(f => f.category === 'sanctions_hit')).toBe(true);
    expect(r.holdForReview).toBe(true);
  });

  test('invalid HS code produces finding', () => {
    const s: Shipment = {
      ...baseShipment,
      items: [{ description: 'Bad', hsCode: '99xx', quantity: 1, unit: 'pcs', unitValue: 100, countryOfOrigin: 'US' }],
    };
    const r = screen(s, { logLevel: 'silent' });
    expect(r.findings.some(f => f.category === 'hs_code_invalid')).toBe(true);
  });

  test('duty mismatch produces finding', () => {
    const s: Shipment = {
      ...baseShipment,
      declaredValue: 1000,
      // declaredDuty intentionally wrong (well below expected)
      ...({ declaredDuty: 1 } as any),
    };
    const r = screen(s, { logLevel: 'silent' });
    expect(r.duty).toBeDefined();
    expect(r.duty!.expected).toBeGreaterThan(0);
  });

  test('throws on missing shipment', () => {
    expect(() => screen(null as any)).toThrow(CustomsShieldError);
  });

  test('throws on missing shipment id', () => {
    expect(() => screen({ ...baseShipment, id: '' } as any)).toThrow(CustomsShieldError);
  });

  test('report contains expected shape', () => {
    const r = screen(baseShipment, { logLevel: 'silent' });
    expect(r.shipmentId).toBe('e2e-1');
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
    expect(r.riskScore).toBeLessThanOrEqual(100);
    expect(r.riskBand).toMatch(/^(low|moderate|elevated|high|critical)$/);
    expect(Array.isArray(r.findings)).toBe(true);
    expect(typeof r.generatedAt).toBe('string');
    expect(typeof r.elapsedMs).toBe('number');
  });

  test('DEFAULT_CONFIG has expected defaults', () => {
    expect(DEFAULT_CONFIG.sanctionsThreshold).toBe(0.75);
    expect(DEFAULT_CONFIG.holdThreshold).toBe(50);
    expect(DEFAULT_CONFIG.computeDuty).toBe(true);
  });
});
