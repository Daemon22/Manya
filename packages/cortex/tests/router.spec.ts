/**
 * @manya-os/cortex — request router tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { Router, RoutingError } from '../src';

describe('Router', () => {
  test('classify recall intent', () => {
    const r = new Router();
    expect(r.classify('what is the capital of France?')).toBe('recall');
  });

  test('classify execution intent', () => {
    const r = new Router();
    expect(r.classify('execute the deployment')).toBe('execution');
  });

  test('classify communication intent', () => {
    const r = new Router();
    expect(r.classify('send a message to Alice')).toBe('communication');
  });

  test('classify analysis intent', () => {
    const r = new Router();
    expect(r.classify('analyze the data')).toBe('analysis');
  });

  test('classify monitoring intent', () => {
    const r = new Router();
    expect(r.classify('monitor the server')).toBe('monitoring');
  });

  test('classify planning intent', () => {
    const r = new Router();
    expect(r.classify('orchestrate the workflow')).toBe('planning');
  });

  test('classify unknown', () => {
    const r = new Router();
    expect(r.classify('xyz qrs')).toBe('unknown');
  });

  test('classify empty string returns unknown', () => {
    const r = new Router();
    expect(r.classify('')).toBe('unknown');
  });

  test('classify is case-insensitive', () => {
    const r = new Router();
    expect(r.classify('REMEMBER my name')).toBe('recall');
    expect(r.classify('What Is the answer')).toBe('recall');
  });

  test('route returns RoutedRequest', () => {
    const r = new Router();
    const rr = r.route('remember my name');
    expect(rr.component).toBe('memory');
    expect(rr.confidence).toBeGreaterThan(0);
  });

  test('route includes id and timestamp', () => {
    const r = new Router();
    const rr = r.route('remember my name');
    expect(rr.id).toBeDefined();
    expect(rr.routedAt).toBeGreaterThan(0);
  });

  test('route includes reason', () => {
    const r = new Router();
    const rr = r.route('remember my name');
    expect(rr.reason).toContain('recall');
  });

  test('route unknown intent has low confidence', () => {
    const r = new Router();
    const rr = r.route('xyz qrs');
    expect(rr.confidence).toBeLessThan(0.5);
  });

  test('route throws on empty input', () => {
    const r = new Router();
    expect(() => r.route('')).toThrow(RoutingError);
  });

  test('setComponent overrides mapping', () => {
    const r = new Router();
    r.setComponent('recall', 'custom-memory');
    expect(r.route('remember my name').component).toBe('custom-memory');
  });

  test('setComponent does not affect other intents', () => {
    const r = new Router();
    r.setComponent('recall', 'custom-memory');
    expect(r.route('execute something').component).not.toBe('custom-memory');
  });
});
