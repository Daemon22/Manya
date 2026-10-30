/**
 * @manya-os/cortex — benchmark.
 *
 * Measures planning, tool invocation, and end-to-end reasoning throughput.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { Cortex } from '../src/index.js';

function bench(name: string, fn: () => void | Promise<void>, iterations: number): void {
  // Warmup
  for (let i = 0; i < 5; i++) fn();
  const start = Date.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = Date.now() - start;
  console.log(`${name.padEnd(30)} | ${(elapsed / iterations).toFixed(3).padStart(8)} ms/op | ${(iterations * 1000 / elapsed).toFixed(1).padStart(8)} ops/sec`);
}

async function main(): Promise<void> {
  const cortex = new Cortex({ logLevel: 'silent' });
  cortex.registerTool({
    name: 'noop', description: '', async: false,
    handler: () => ({ success: true, output: 'ok' }),
  });

  console.log('Operation                      |    avg   |      ops/sec');
  console.log('-------------------------------|----------|--------------');
  bench('route (classify)', () => cortex.route('remember the user name'), 10_000);
  bench('setGoal + plan', () => { cortex.setGoal('do simple task'); }, 5_000);
  bench('decompose', () => { cortex.planner.plan({ id: 'g', description: 'fetch data and parse it', priority: 0.5, status: 'active', createdAt: Date.now() }); }, 5_000);

  // Async bench (reason end-to-end).
  const asyncIterations = 500;
  const asyncStart = Date.now();
  for (let i = 0; i < asyncIterations; i++) {
    await cortex.reason('do simple task');
  }
  const asyncElapsed = Date.now() - asyncStart;
  console.log(`${'reason (end-to-end)'.padEnd(30)} | ${(asyncElapsed / asyncIterations).toFixed(3).padStart(8)} ms/op | ${(asyncIterations * 1000 / asyncElapsed).toFixed(1).padStart(8)} ops/sec`);
}

main().catch(console.error);
