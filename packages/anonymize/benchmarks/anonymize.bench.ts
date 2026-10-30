/**
 * @manya-os/anonymize — benchmark.
 *
 * Measures throughput of the anonymization pipeline on synthetic inputs
 * of varying sizes and PII densities.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { Anonymizer } from '../src/index.js';

function buildInput(piCount: number, filler: string): string {
  const piis = [
    'alice@example.com', '+1-555-123-4567', '192.168.1.1', '4111 1111 1111 1111',
    '8801235111088', 'Mr John Smith', 'diabetes', 'amoxicillin',
    '00:1A:2B:3C:4D:5E', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  ];
  const parts: string[] = [];
  for (let i = 0; i < piCount; i++) parts.push(piis[i % piis.length]);
  parts.push(filler);
  return parts.join(' — ');
}

function bench(name: string, fn: () => void, iterations: number): { avgMs: number; opsPerSec: number } {
  // Warmup
  for (let i = 0; i < 10; i++) fn();
  const start = Date.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = Date.now() - start;
  const avgMs = elapsed / iterations;
  return { avgMs, opsPerSec: 1000 / avgMs };
}

function main(): void {
  const anon = new Anonymizer({ logLevel: 'silent' });

  const scenarios = [
    { name: 'small-10pii', piCount: 10, filler: 'short filler', iters: 5000 },
    { name: 'medium-100pii', piCount: 100, filler: 'medium filler '.repeat(50), iters: 1000 },
    { name: 'large-1000pii', piCount: 1000, filler: 'large filler '.repeat(500), iters: 100 },
  ];

  console.log('Scenario           | avg (ms) | ops/sec');
  console.log('-------------------|----------|--------');
  for (const s of scenarios) {
    const input = buildInput(s.piCount, s.filler);
    const r = bench(s.name, () => anon.anonymize(input), s.iters);
    console.log(`${s.name.padEnd(18)} | ${r.avgMs.toFixed(3).padStart(8)} | ${r.opsPerSec.toFixed(1).padStart(7)}`);
  }
}

main();
