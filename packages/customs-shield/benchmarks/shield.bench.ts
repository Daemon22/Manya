/**
 * @manya/customs-shield — benchmark.
 *
 * Measures screening throughput on synthetic shipments of varying complexity.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { CustomsShield } from '../src/index.js';
import type { Shipment } from '../src/index.js';

function buildShipment(itemCount: number): Shipment {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    description: `Item ${i}`,
    hsCode: `61${String(i % 10).padStart(2, '0')}00`,
    quantity: 100,
    unit: 'pcs',
    unitValue: 10,
    countryOfOrigin: 'US',
    weightKg: 50,
  }));
  return {
    id: `bench-${itemCount}`,
    shipper: { name: 'Acme', country: 'US' },
    consignee: { name: 'Beta', country: 'US' },
    originCountry: 'US',
    destinationCountry: 'US',
    mode: 'air',
    incoterm: 'FCA',
    items,
    declaredValue: 1000 * itemCount,
    currency: 'USD',
    createdAt: '2024-01-01',
  };
}

function bench(name: string, fn: () => void, iterations: number): void {
  for (let i = 0; i < 10; i++) fn();
  const start = Date.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = Date.now() - start;
  console.log(`${name.padEnd(20)} | ${(elapsed / iterations).toFixed(3).padStart(8)} ms/op | ${(iterations * 1000 / elapsed).toFixed(1).padStart(8)} ops/sec`);
}

const shield = new CustomsShield({ logLevel: 'silent' });
console.log('Scenario             |    avg   |      ops/sec');
console.log('---------------------|----------|--------------');
bench('1-item shipment', () => shield.screen(buildShipment(1)), 5000);
bench('10-item shipment', () => shield.screen(buildShipment(10)), 2000);
bench('100-item shipment', () => shield.screen(buildShipment(100)), 500);
