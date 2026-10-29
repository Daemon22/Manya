/**
 * @manya-os/cortex — shared utility tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { randomId } from '../src';

describe('randomId', () => {
  test('returns a string with default prefix', () => {
    const id = randomId();
    expect(typeof id).toBe('string');
    expect(id.startsWith('ctx_')).toBe(true);
  });

  test('uses custom prefix', () => {
    const id = randomId('task');
    expect(id.startsWith('task_')).toBe(true);
  });

  test('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => randomId()));
    expect(ids.size).toBe(100);
  });

  test('respects byte length', () => {
    const id8 = randomId('x', 8);
    const id16 = randomId('x', 16);
    const hex8 = id8.split('_')[1];
    const hex16 = id16.split('_')[1];
    expect(hex8.length).toBe(16);
    expect(hex16.length).toBe(32);
  });
});
