/**
 * @manya-os/cortex — task decomposition tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { decompose, estimateComplexity } from '../src';

describe('decompose', () => {
  test('splits on conjunctions', () => {
    const tasks = decompose('fetch data and parse it');
    expect(tasks.length).toBe(2);
    expect(tasks[0].description).toContain('fetch');
    expect(tasks[1].description).toContain('parse');
  });

  test('sets dependencies between sub-tasks', () => {
    const tasks = decompose('do A and then do B');
    expect(tasks[1].dependsOn).toContain(tasks[0].id);
  });

  test('infers required tools', () => {
    const tasks = decompose('fetch http://api.example.com');
    expect(tasks[0].requiredTools).toContain('http');
  });

  test('returns single task if no decomposition possible', () => {
    const tasks = decompose('simple goal');
    expect(tasks).toHaveLength(1);
  });

  test('throws on empty input', () => {
    expect(() => decompose('')).toThrow();
  });

  test('infers db tool from database keywords', () => {
    const tasks = decompose('query the database');
    expect(tasks[0].requiredTools).toContain('db');
  });

  test('infers memory tool from memory keywords', () => {
    const tasks = decompose('remember my name');
    expect(tasks[0].requiredTools).toContain('memory');
  });

  test('infers crypto tool from crypto keywords', () => {
    const tasks = decompose('sign the document');
    expect(tasks[0].requiredTools).toContain('crypto');
  });

  test('infers messaging tool from messaging keywords', () => {
    const tasks = decompose('send a message');
    expect(tasks[0].requiredTools).toContain('messaging');
  });

  test('infers fs tool from file keywords', () => {
    const tasks = decompose('read the file');
    expect(tasks[0].requiredTools).toContain('fs');
  });

  test('handles semicolon conjunction', () => {
    const tasks = decompose('step one; step two');
    expect(tasks.length).toBe(2);
  });

  test('handles comma-then conjunction', () => {
    const tasks = decompose('first, then second');
    expect(tasks.length).toBe(2);
  });

  test('sets goalId from opts', () => {
    const tasks = decompose('fetch data', { goalId: 'g1' });
    expect(tasks[0].goalId).toBe('g1');
  });

  test('each task has a unique id', () => {
    const tasks = decompose('fetch data and parse it and store it');
    const ids = tasks.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('all tasks have status pending', () => {
    const tasks = decompose('fetch data and parse it');
    for (const t of tasks) {
      expect(t.status).toBe('pending');
    }
  });
});

describe('estimateComplexity', () => {
  test('returns 1 for simple description', () => {
    expect(estimateComplexity('simple goal')).toBe(1);
  });

  test('increases with conjunctions', () => {
    expect(estimateComplexity('do A')).toBeLessThan(estimateComplexity('do A and then do B followed by C'));
  });

  test('increases with conditionals', () => {
    expect(estimateComplexity('do something')).toBeLessThan(estimateComplexity('do something if possible'));
  });

  test('increases with iteration keywords', () => {
    expect(estimateComplexity('do something')).toBeLessThan(estimateComplexity('do something for each item'));
  });

  test('caps at 5', () => {
    const complex = 'a and b, then c; d after that e followed by f if g when h for each i all j';
    expect(estimateComplexity(complex)).toBeLessThanOrEqual(5);
  });
});
