/**
 * @manya-os/memory — benchmark.
 *
 * Measures store/search/recall throughput at varying scales.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { MemorySystem } from '../src/index.js';

function bench(name: string, fn: () => void, iterations: number): void {
  for (let i = 0; i < 5; i++) fn();
  const start = Date.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = Date.now() - start;
  console.log(`${name.padEnd(28)} | ${(elapsed / iterations).toFixed(3).padStart(8)} ms/op | ${(iterations * 1000 / elapsed).toFixed(1).padStart(8)} ops/sec`);
}

const m = new MemorySystem({ logLevel: 'silent' });

console.log('Operation                    |    avg   |      ops/sec');
console.log('-----------------------------|----------|--------------');
bench('remember (episodic)', () => m.remember('agent', 'event ' + Math.random()), 10_000);
bench('store (long-term)', () => m.store('payload ' + Math.random()), 10_000);
bench('learn (semantic)', () => m.learn('e' + Math.random(), 'a', 'v'), 10_000);
bench('search (10k records)', () => m.search('event'), 1_000);
bench('recall (10k records)', () => m.recall('event', 10), 1_000);
bench('snapshot', () => m.snapshot(), 100);

m.dispose();
