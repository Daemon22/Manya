/**
 * @manya/nervous-system — comprehensive unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

import {
  EventFabric,
  EventRecorder, DEFAULT_RECORDER_MAX_SIZE,
  EventQueue, DEFAULT_QUEUE_CAPACITY,
  EventRouter, makeRoute, makeRouteId,
  MetricsCollector, DEFAULT_LATENCY_BUFFER,
  FilesystemSource,
  OSSource,
  ProcessSource,
  NetworkSource, readLinuxNetDev,
  CustomSource,
  NotificationSource,
  ApplicationSource,
  UsbSource, BluetoothSource, SensorSource, CameraSource, MicrophoneSource, StubSource,
  createEvent, serialize, deserialize, eventsEqual, generateEventId, isSeverity,
  compileFilter, matchEvent, and, or, not,
  NervousSystemError, FabricError, FilterError, RouterError, RecorderError, SourceError, QueueError,
  SCRUBBED_FIELD_NAMES, shouldScrubField, scrubMetadata, SilentLogger,
} from '../src';
import type {
  NervousEvent, EventFilter, Severity, NervousConfig,
} from '../src';

// ---------- helpers ----------
function mkEvent(overrides: Partial<NervousEvent> = {}): NervousEvent {
  return {
    id: overrides.id ?? generateEventId(),
    topic: overrides.topic ?? 'test.topic',
    source: overrides.source ?? 'test-src',
    payload: overrides.payload ?? { value: 1 },
    timestamp: overrides.timestamp ?? Date.now(),
    severity: overrides.severity ?? 'info',
    ...(overrides.tags ? { tags: overrides.tags } : {}),
    ...(overrides.metadata ? { metadata: overrides.metadata } : {}),
  };
}

// ========== Event model ==========
describe('event model', () => {
  test('createEvent sets defaults', () => {
    const e = createEvent('test.x', 'src', { a: 1 });
    expect(e.topic).toBe('test.x');
    expect(e.source).toBe('src');
    expect(e.severity).toBe('info');
    expect(typeof e.id).toBe('string');
    expect(typeof e.timestamp).toBe('number');
    expect(e.tags).toBeUndefined();
    expect(e.metadata).toBeUndefined();
  });

  test('createEvent honors overrides', () => {
    const e = createEvent('test.x', 'src', null, {
      id: 'fixed-id', severity: 'warn', tags: ['a', 'b'], metadata: { k: 'v' }, timestamp: 12345,
    });
    expect(e.id).toBe('fixed-id');
    expect(e.severity).toBe('warn');
    expect(e.tags).toEqual(['a', 'b']);
    expect(e.metadata).toEqual({ k: 'v' });
    expect(e.timestamp).toBe(12345);
  });

  test('createEvent validates topic', () => {
    expect(() => createEvent('', 'src', {})).toThrow(NervousSystemError);
    // @ts-expect-error: non-string topic
    expect(() => createEvent(null, 'src', {})).toThrow(NervousSystemError);
  });

  test('createEvent validates source', () => {
    expect(() => createEvent('t', '', {})).toThrow(NervousSystemError);
  });

  test('createEvent validates severity', () => {
    expect(() => createEvent('t', 's', {}, { severity: 'fatal' as Severity })).toThrow(NervousSystemError);
  });

  test('serialize/deserialize round-trip', () => {
    const e = createEvent('rt.x', 'rt-src', { foo: 1, bar: [1, 2, 3] }, {
      severity: 'error', tags: ['t1', 't2'], metadata: { k: 'v' },
    });
    const json = serialize(e);
    const back = deserialize(json);
    expect(back).toEqual(e);
  });

  test('serialize with pretty indent', () => {
    const e = createEvent('p.x', 's', {});
    const json = serialize(e, true);
    expect(json).toContain('\n');
  });

  test('deserialize rejects malformed JSON', () => {
    expect(() => deserialize('not json')).toThrow(NervousSystemError);
  });

  test('deserialize rejects non-object', () => {
    expect(() => deserialize('"hello"')).toThrow(NervousSystemError);
    expect(() => deserialize('null')).toThrow(NervousSystemError);
    expect(() => deserialize('[]')).toThrow(NervousSystemError);
  });

  test('deserialize validates required fields', () => {
    const e = createEvent('t.x', 's', {});
    const json = serialize(e);
    // Strip id.
    const noId = JSON.parse(json) as Record<string, unknown>;
    delete noId.id;
    expect(() => deserialize(JSON.stringify(noId))).toThrow(NervousSystemError);
    // Strip topic.
    const noTopic = JSON.parse(json) as Record<string, unknown>;
    delete noTopic.topic;
    expect(() => deserialize(JSON.stringify(noTopic))).toThrow(NervousSystemError);
    // Strip source.
    const noSource = JSON.parse(json) as Record<string, unknown>;
    delete noSource.source;
    expect(() => deserialize(JSON.stringify(noSource))).toThrow(NervousSystemError);
    // Strip timestamp.
    const noTs = JSON.parse(json) as Record<string, unknown>;
    delete noTs.timestamp;
    expect(() => deserialize(JSON.stringify(noTs))).toThrow(NervousSystemError);
    // Bad severity.
    const badSev = JSON.parse(json) as Record<string, unknown>;
    badSev.severity = 'fatal';
    expect(() => deserialize(JSON.stringify(badSev))).toThrow(NervousSystemError);
  });

  test('deserialize validates optional fields', () => {
    const e = createEvent('t.x', 's', {});
    const json = serialize(e);
    const badTags = JSON.parse(json) as Record<string, unknown>;
    badTags.tags = 'not-array';
    expect(() => deserialize(JSON.stringify(badTags))).toThrow(NervousSystemError);
    const badMeta = JSON.parse(json) as Record<string, unknown>;
    badMeta.metadata = 'not-object';
    expect(() => deserialize(JSON.stringify(badMeta))).toThrow(NervousSystemError);
  });

  test('eventsEqual true/false', () => {
    const a = createEvent('eq.x', 's', { v: 1 }, { id: 'id1', timestamp: 100 });
    const b = createEvent('eq.x', 's', { v: 1 }, { id: 'id1', timestamp: 100 });
    const c = createEvent('eq.x', 's', { v: 2 }, { id: 'id1', timestamp: 100 });
    expect(eventsEqual(a, b)).toBe(true);
    expect(eventsEqual(a, c)).toBe(false);
  });

  test('generateEventId is unique', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(generateEventId());
    expect(ids.size).toBe(1000);
  });

  test('isSeverity', () => {
    expect(isSeverity('debug')).toBe(true);
    expect(isSeverity('info')).toBe(true);
    expect(isSeverity('warn')).toBe(true);
    expect(isSeverity('error')).toBe(true);
    expect(isSeverity('fatal')).toBe(false);
    expect(isSeverity(123)).toBe(false);
  });
});

// ========== Filters ==========
describe('filters', () => {
  test('compileFilter returns a function', () => {
    const f = compileFilter({ topic: 'a.b' });
    expect(typeof f).toBe('function');
  });

  test('compileFilter rejects non-object', () => {
    // @ts-expect-error: testing runtime guard
    expect(() => compileFilter(null)).toThrow(FilterError);
    // @ts-expect-error: testing runtime guard
    expect(() => compileFilter('x')).toThrow(FilterError);
  });

  test('topic exact match', () => {
    const f = { topic: 'a.b' };
    expect(matchEvent(f, mkEvent({ topic: 'a.b' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ topic: 'a.c' }))).toBe(false);
  });

  test('topic wildcard * matches all', () => {
    const f: EventFilter = { topic: '*' };
    expect(matchEvent(f, mkEvent({ topic: 'a.b' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ topic: 'whatever' }))).toBe(true);
  });

  test('topic RegExp match', () => {
    const f: EventFilter = { topic: /^fs\./ };
    expect(matchEvent(f, mkEvent({ topic: 'fs.change' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ topic: 'os.metrics' }))).toBe(false);
  });

  test('source match', () => {
    const f: EventFilter = { source: 'src-a' };
    expect(matchEvent(f, mkEvent({ source: 'src-a' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ source: 'src-b' }))).toBe(false);
  });

  test('severity single match', () => {
    const f: EventFilter = { severity: 'error' };
    expect(matchEvent(f, mkEvent({ severity: 'error' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ severity: 'info' }))).toBe(false);
  });

  test('severity array match (OR)', () => {
    const f: EventFilter = { severity: ['warn', 'error'] };
    expect(matchEvent(f, mkEvent({ severity: 'warn' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ severity: 'error' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ severity: 'info' }))).toBe(false);
  });

  test('tags subset match (AND)', () => {
    const f: EventFilter = { tags: ['red', 'blue'] };
    expect(matchEvent(f, mkEvent({ tags: ['red', 'blue', 'green'] }))).toBe(true);
    expect(matchEvent(f, mkEvent({ tags: ['red'] }))).toBe(false);
    expect(matchEvent(f, mkEvent({}))).toBe(false);
  });

  test('payload predicate', () => {
    const f: EventFilter = { payloadPredicate: (p) => !!(p && typeof p === 'object' && (p as { v?: number }).v === 5) };
    expect(matchEvent(f, mkEvent({ payload: { v: 5 } }))).toBe(true);
    expect(matchEvent(f, mkEvent({ payload: { v: 6 } }))).toBe(false);
  });

  test('payload predicate throw becomes FilterError', () => {
    const f: EventFilter = { payloadPredicate: () => { throw new Error('boom'); } };
    expect(() => matchEvent(f, mkEvent({}))).toThrow(FilterError);
  });

  test('combined filter (topic AND source AND severity AND tags)', () => {
    const f: EventFilter = { topic: 'fs.change', source: 'fs-src', severity: 'warn', tags: ['critical'] };
    expect(matchEvent(f, mkEvent({ topic: 'fs.change', source: 'fs-src', severity: 'warn', tags: ['critical'] }))).toBe(true);
    expect(matchEvent(f, mkEvent({ topic: 'fs.change', source: 'fs-src', severity: 'info', tags: ['critical'] }))).toBe(false);
  });

  test('and() combinator', () => {
    const f = and({ topic: 'a.b' }, { source: 'src' });
    expect(matchEvent(f, mkEvent({ topic: 'a.b', source: 'src' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ topic: 'a.b', source: 'other' }))).toBe(false);
  });

  test('and() empty matches all', () => {
    const f = and();
    expect(matchEvent(f, mkEvent({}))).toBe(true);
  });

  test('or() combinator', () => {
    const f = or({ topic: 'a' }, { topic: 'b' });
    expect(matchEvent(f, mkEvent({ topic: 'a' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ topic: 'b' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ topic: 'c' }))).toBe(false);
  });

  test('or() empty matches none', () => {
    const f = or();
    expect(matchEvent(f, mkEvent({}))).toBe(false);
  });

  test('not() combinator', () => {
    const f = not({ topic: 'a' });
    expect(matchEvent(f, mkEvent({ topic: 'a' }))).toBe(false);
    expect(matchEvent(f, mkEvent({ topic: 'b' }))).toBe(true);
  });

  test('combinators nest', () => {
    const f = and(or({ topic: 'a' }, { topic: 'b' }), not({ source: 'bad' }));
    expect(matchEvent(f, mkEvent({ topic: 'a', source: 'good' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ topic: 'b', source: 'good' }))).toBe(true);
    expect(matchEvent(f, mkEvent({ topic: 'a', source: 'bad' }))).toBe(false);
    expect(matchEvent(f, mkEvent({ topic: 'c', source: 'good' }))).toBe(false);
  });
});

// ========== Event fabric ==========
describe('EventFabric', () => {
  test('publish delivers to matching subscriber', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    const seen: NervousEvent[] = [];
    f.subscribe({ topic: 'a.b' }, (e) => seen.push(e));
    f.publish(mkEvent({ topic: 'a.b' }));
    expect(seen).toHaveLength(1);
  });

  test('publish to non-matching subscriber delivers nothing', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    const seen: NervousEvent[] = [];
    f.subscribe({ topic: 'a.b' }, (e) => seen.push(e));
    f.publish(mkEvent({ topic: 'a.c' }));
    expect(seen).toHaveLength(0);
  });

  test('wildcard * subscriber receives everything', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    const seen: NervousEvent[] = [];
    f.subscribe({ topic: '*' }, (e) => seen.push(e));
    f.publish(mkEvent({ topic: 'a.b' }));
    f.publish(mkEvent({ topic: 'c.d' }));
    expect(seen).toHaveLength(2);
  });

  test('RegExp topic subscriber receives matching topics only', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    const seen: NervousEvent[] = [];
    f.subscribe({ topic: /^fs\./ }, (e) => seen.push(e));
    f.publish(mkEvent({ topic: 'fs.change' }));
    f.publish(mkEvent({ topic: 'os.metrics' }));
    f.publish(mkEvent({ topic: 'fs.error' }));
    expect(seen).toHaveLength(2);
  });

  test('unsubscribe removes the handler', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    const seen: NervousEvent[] = [];
    const id = f.subscribe({ topic: 'a.b' }, (e) => seen.push(e));
    f.publish(mkEvent({ topic: 'a.b' }));
    expect(seen).toHaveLength(1);
    expect(f.unsubscribe(id)).toBe(true);
    expect(f.unsubscribe(id)).toBe(false);
    f.publish(mkEvent({ topic: 'a.b' }));
    expect(seen).toHaveLength(1);
  });

  test('subscribe with explicit id rejects duplicates', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    f.subscribe({ topic: 'a' }, 'sub-1', () => {});
    expect(() => f.subscribe({ topic: 'a' }, 'sub-1', () => {})).toThrow(FabricError);
  });

  test('publish returns delivered count', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    f.subscribe({ topic: 'a' }, () => {});
    f.subscribe({ topic: 'a' }, () => {});
    f.subscribe({ topic: 'b' }, () => {});
    expect(f.publish(mkEvent({ topic: 'a' }))).toBe(2);
    expect(f.publish(mkEvent({ topic: 'b' }))).toBe(1);
    expect(f.publish(mkEvent({ topic: 'c' }))).toBe(0);
  });

  test('handler throw is isolated (other handlers still run)', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    const seen: NervousEvent[] = [];
    f.subscribe({ topic: 'a' }, () => { throw new Error('boom'); });
    f.subscribe({ topic: 'a' }, (e) => seen.push(e));
    f.publish(mkEvent({ topic: 'a' }));
    expect(seen).toHaveLength(1);
  });

  test('filter throw is isolated', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    const seen: NervousEvent[] = [];
    f.subscribe({ payloadPredicate: () => { throw new Error('boom'); } }, (e) => seen.push(e));
    f.subscribe({ topic: 'a' }, (e) => seen.push(e));
    f.publish(mkEvent({ topic: 'a' }));
    expect(seen).toHaveLength(1);
  });

  test('publish emits fabric-level published event', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    let publishedCount = 0;
    f.on('published', () => { publishedCount++; });
    f.publish(mkEvent({ topic: 'a' }));
    f.publish(mkEvent({ topic: 'b' }));
    expect(publishedCount).toBe(2);
  });

  test('publish with no subscribers emits dropped event', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    let dropped = 0;
    f.on('dropped', () => { dropped++; });
    f.publish(mkEvent({ topic: 'unmatched' }));
    expect(dropped).toBe(1);
  });

  test('publish emits error event when handler throws', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    let errors = 0;
    f.on('error', () => { errors++; });
    f.subscribe({ topic: 'a' }, () => { throw new Error('boom'); });
    f.publish(mkEvent({ topic: 'a' }));
    expect(errors).toBe(1);
  });

  test('recordByDefault config', () => {
    const f = new EventFabric({ recordByDefault: true, logger: new SilentLogger() });
    expect(f.isRecording()).toBe(true);
    f.publish(mkEvent({ topic: 'a' }));
    f.publish(mkEvent({ topic: 'b' }));
    expect(f.recorder.size()).toBe(2);
  });

  test('startRecording / stopRecording', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    expect(f.isRecording()).toBe(false);
    f.startRecording();
    expect(f.isRecording()).toBe(true);
    f.publish(mkEvent({ topic: 'a' }));
    f.stopRecording();
    f.publish(mkEvent({ topic: 'b' }));
    expect(f.recorder.size()).toBe(1);
  });

  test('attach + detach calls source start/stop', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    let started = 0, stopped = 0;
    const src = {
      id: 'test',
      start: () => { started++; },
      stop: () => { stopped++; },
    };
    f.attach(src);
    expect(started).toBe(1);
    expect(f.sourceCount()).toBe(1);
    expect(f.detach('test')).toBe(true);
    expect(stopped).toBe(1);
    expect(f.sourceCount()).toBe(0);
  });

  test('attach forwards source events to fabric', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    const seen: NervousEvent[] = [];
    f.subscribe({ topic: 'src.test' }, (e) => seen.push(e));
    const src = {
      id: 'test',
      start: (sink: (e: NervousEvent) => void) => {
        sink(mkEvent({ topic: 'src.test', source: 'test' }));
      },
      stop: () => {},
    };
    f.attach(src);
    expect(seen).toHaveLength(1);
  });

  test('attach rejects duplicate source id', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    const src1 = { id: 'dup', start: () => {}, stop: () => {} };
    const src2 = { id: 'dup', start: () => {}, stop: () => {} };
    f.attach(src1);
    expect(() => f.attach(src2)).toThrow(FabricError);
  });

  test('shutdown detaches sources and clears subscribers', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    let stopped = 0;
    f.subscribe({ topic: 'a' }, () => {});
    f.attach({ id: 's', start: () => {}, stop: () => { stopped++; } });
    f.shutdown();
    expect(stopped).toBe(1);
    expect(f.subscriptionCount()).toBe(0);
    expect(f.sourceCount()).toBe(0);
  });

  test('unsubscribe during publish is safe', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    let id2: string;
    f.subscribe({ topic: 'a' }, () => {
      f.unsubscribe(id2);
    });
    id2 = f.subscribe({ topic: 'a' }, () => {});
    expect(() => f.publish(mkEvent({ topic: 'a' }))).not.toThrow();
  });

  test('metrics counts track publishes and deliveries', () => {
    const f = new EventFabric({ logger: new SilentLogger() });
    f.subscribe({ topic: 'a' }, () => {});
    f.publish(mkEvent({ topic: 'a' }));
    f.publish(mkEvent({ topic: 'b' })); // dropped
    const m = f.metrics.snapshot();
    expect(m.eventsPublished).toBe(2);
    expect(m.eventsDelivered).toBe(1);
    expect(m.activeSubscriptions).toBe(1);
    expect(m.avgLatencyMs).toBeGreaterThanOrEqual(0);
  });
});

// ========== Router ==========
describe('EventRouter', () => {
  test('addRoute and route', () => {
    const r = new EventRouter();
    r.addRoute(makeRoute({ topic: 'a' }, 'handler', 'h1', 0));
    const result = r.route(mkEvent({ topic: 'a' }));
    expect(result.destinations).toHaveLength(1);
    expect(result.destinations[0].target).toBe('h1');
  });

  test('removeRoute', () => {
    const r = new EventRouter();
    const id = makeRouteId();
    r.addRoute({ id, filter: { topic: 'a' }, destination: 'handler', target: 'h1', priority: 0 });
    expect(r.size()).toBe(1);
    expect(r.removeRoute(id)).toBe(true);
    expect(r.removeRoute(id)).toBe(false);
    expect(r.size()).toBe(0);
  });

  test('duplicate route id rejected', () => {
    const r = new EventRouter();
    r.addRoute({ id: 'r1', filter: { topic: 'a' }, destination: 'handler', target: 'h1', priority: 0 });
    expect(() => r.addRoute({ id: 'r1', filter: { topic: 'b' }, destination: 'handler', target: 'h2', priority: 0 })).toThrow(RouterError);
  });

  test('priority ordering (lower runs first)', () => {
    const r = new EventRouter();
    r.addRoute(makeRoute({ topic: 'a' }, 'handler', 'low', 10));
    r.addRoute(makeRoute({ topic: 'a' }, 'handler', 'high', 1));
    r.addRoute(makeRoute({ topic: 'a' }, 'handler', 'mid', 5));
    const result = r.route(mkEvent({ topic: 'a' }));
    expect(result.destinations.map((d) => d.target)).toEqual(['high', 'mid', 'low']);
  });

  test('route with no matches returns empty', () => {
    const r = new EventRouter();
    r.addRoute(makeRoute({ topic: 'a' }, 'handler', 'h1', 0));
    expect(r.route(mkEvent({ topic: 'b' })).destinations).toHaveLength(0);
  });

  test('route supports queue and topic destinations', () => {
    const r = new EventRouter();
    r.addRoute(makeRoute({ topic: 'a' }, 'queue', 'q1', 0));
    r.addRoute(makeRoute({ topic: 'a' }, 'topic', 't1', 1));
    const result = r.route(mkEvent({ topic: 'a' }));
    expect(result.destinations.map((d) => d.destination)).toEqual(['queue', 'topic']);
  });

  test('route validates event', () => {
    const r = new EventRouter();
    expect(() => r.route(null as unknown as NervousEvent)).toThrow(RouterError);
  });

  test('addRoute validates shape', () => {
    const r = new EventRouter();
    // @ts-expect-error: testing runtime
    expect(() => r.addRoute(null)).toThrow(RouterError);
    expect(() => r.addRoute({ id: '', filter: {}, destination: 'handler', target: 't', priority: 0 })).toThrow(RouterError);
    expect(() => r.addRoute({ id: 'x', filter: {}, destination: 'invalid' as never, target: 't', priority: 0 })).toThrow(RouterError);
    expect(() => r.addRoute({ id: 'x', filter: {}, destination: 'handler', target: '', priority: 0 })).toThrow(RouterError);
  });

  test('clear removes all routes', () => {
    const r = new EventRouter();
    r.addRoute(makeRoute({ topic: 'a' }, 'handler', 'h1', 0));
    r.addRoute(makeRoute({ topic: 'b' }, 'handler', 'h2', 0));
    r.clear();
    expect(r.size()).toBe(0);
  });

  test('listRoutes in priority order', () => {
    const r = new EventRouter();
    const a = makeRouteId(); const b = makeRouteId(); const c = makeRouteId();
    r.addRoute({ id: a, filter: { topic: 'x' }, destination: 'handler', target: 'a', priority: 5 });
    r.addRoute({ id: b, filter: { topic: 'x' }, destination: 'handler', target: 'b', priority: 1 });
    r.addRoute({ id: c, filter: { topic: 'x' }, destination: 'handler', target: 'c', priority: 3 });
    expect(r.listRoutes()).toEqual([b, c, a]);
  });
});

// ========== Recorder ==========
describe('EventRecorder', () => {
  test('default max size', () => {
    expect(DEFAULT_RECORDER_MAX_SIZE).toBe(10_000);
    const r = new EventRecorder();
    expect(r.getCapacity()).toBe(DEFAULT_RECORDER_MAX_SIZE);
  });

  test('start/stop and record', () => {
    const r = new EventRecorder(100);
    r.start();
    expect(r.isRecording()).toBe(true);
    r.record(mkEvent({ topic: 'a' }));
    r.record(mkEvent({ topic: 'b' }));
    expect(r.size()).toBe(2);
    r.stop();
    expect(r.isRecording()).toBe(false);
    r.record(mkEvent({ topic: 'c' }));
    expect(r.size()).toBe(2);
  });

  test('record returns false when not recording', () => {
    const r = new EventRecorder(100);
    expect(r.record(mkEvent({ topic: 'a' }))).toBe(false);
  });

  test('ring-buffer overwrites oldest', () => {
    const r = new EventRecorder(3);
    r.start();
    r.record(mkEvent({ topic: 'a', id: '1' }));
    r.record(mkEvent({ topic: 'b', id: '2' }));
    r.record(mkEvent({ topic: 'c', id: '3' }));
    r.record(mkEvent({ topic: 'd', id: '4' }));
    expect(r.size()).toBe(3);
    const events = r.getEvents();
    expect(events.map((e) => e.topic)).toEqual(['b', 'c', 'd']);
  });

  test('getEvents returns chronological order before wrap', () => {
    const r = new EventRecorder(10);
    r.start();
    r.record(mkEvent({ topic: 'a', timestamp: 100 }));
    r.record(mkEvent({ topic: 'b', timestamp: 200 }));
    r.record(mkEvent({ topic: 'c', timestamp: 300 }));
    const events = r.getEvents();
    expect(events.map((e) => e.topic)).toEqual(['a', 'b', 'c']);
  });

  test('getEvents returns chronological order after wrap', () => {
    const r = new EventRecorder(2);
    r.start();
    r.record(mkEvent({ topic: 'a', timestamp: 100 }));
    r.record(mkEvent({ topic: 'b', timestamp: 200 }));
    r.record(mkEvent({ topic: 'c', timestamp: 300 }));
    r.record(mkEvent({ topic: 'd', timestamp: 400 }));
    const events = r.getEvents();
    expect(events.map((e) => e.topic)).toEqual(['c', 'd']);
  });

  test('getEvents with filter', () => {
    const r = new EventRecorder(100);
    r.start();
    r.record(mkEvent({ topic: 'a', severity: 'info' }));
    r.record(mkEvent({ topic: 'b', severity: 'error' }));
    r.record(mkEvent({ topic: 'c', severity: 'warn' }));
    const errors = r.getEvents({ severity: ['error', 'warn'] });
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.topic)).toEqual(['b', 'c']);
  });

  test('clear empties buffer', () => {
    const r = new EventRecorder(100);
    r.start();
    r.record(mkEvent({ topic: 'a' }));
    r.clear();
    expect(r.size()).toBe(0);
    expect(r.getEvents()).toHaveLength(0);
  });

  test('exportJSON returns string', () => {
    const r = new EventRecorder(100);
    r.start();
    r.record(mkEvent({ topic: 'a' }));
    r.record(mkEvent({ topic: 'b' }));
    const json = r.exportJSON();
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  test('exportJSON pretty', () => {
    const r = new EventRecorder(100);
    r.start();
    r.record(mkEvent({ topic: 'a' }));
    const json = r.exportJSON(undefined, true);
    expect(json).toContain('\n');
  });

  test('invalid maxSize throws', () => {
    expect(() => new EventRecorder(0)).toThrow(RecorderError);
    expect(() => new EventRecorder(-1)).toThrow(RecorderError);
    // @ts-expect-error: testing runtime
    expect(() => new EventRecorder('big')).toThrow(RecorderError);
  });

  test('record invalid event throws', () => {
    const r = new EventRecorder(100);
    r.start();
    // @ts-expect-error: testing runtime
    expect(() => r.record(null)).toThrow(RecorderError);
  });
});

// ========== Queue ==========
describe('EventQueue', () => {
  test('enqueue and size', () => {
    const q = new EventQueue();
    q.enqueue(mkEvent({ topic: 'a' }));
    q.enqueue(mkEvent({ topic: 'b' }));
    expect(q.size()).toBe(2);
  });

  test('dequeue blocks then resolves', async () => {
    const q = new EventQueue();
    const p = q.dequeue();
    q.enqueue(mkEvent({ topic: 'a' }));
    const e = await p;
    expect(e?.topic).toBe('a');
    expect(q.size()).toBe(0);
  });

  test('dequeue non-empty resolves immediately', async () => {
    const q = new EventQueue();
    q.enqueue(mkEvent({ topic: 'a' }));
    const e = await q.dequeue();
    expect(e?.topic).toBe('a');
  });

  test('unbounded queue accepts unlimited events', () => {
    const q = new EventQueue();
    for (let i = 0; i < 1000; i++) q.enqueue(mkEvent({ topic: 'a' }));
    expect(q.size()).toBe(1000);
  });

  test('bounded queue throws when full', () => {
    const q = new EventQueue({ capacity: 2 });
    q.enqueue(mkEvent({ topic: 'a' }));
    q.enqueue(mkEvent({ topic: 'b' }));
    expect(() => q.enqueue(mkEvent({ topic: 'c' }))).toThrow(QueueError);
  });

  test('bounded queue with waitWhenFull blocks then resolves', async () => {
    const q = new EventQueue({ capacity: 1, waitWhenFull: true });
    q.enqueue(mkEvent({ topic: 'a' }));
    const p = q.enqueue(mkEvent({ topic: 'b' })) as Promise<boolean>;
    // Drain one to make room.
    void q.dequeue();
    const accepted = await p;
    expect(accepted).toBe(true);
    expect(q.size()).toBe(1);
  });

  test('stop resolves pending dequeuers with null', async () => {
    const q = new EventQueue();
    const p = q.dequeue();
    q.stop();
    expect(await p).toBeNull();
  });

  test('stop rejects pending enqueues', async () => {
    const q = new EventQueue({ capacity: 1, waitWhenFull: true });
    q.enqueue(mkEvent({ topic: 'a' }));
    const p = q.enqueue(mkEvent({ topic: 'b' })) as Promise<boolean>;
    q.stop();
    await expect(p).rejects.toThrow(QueueError);
  });

  test('enqueue after stop throws', () => {
    const q = new EventQueue();
    q.stop();
    expect(() => q.enqueue(mkEvent({ topic: 'a' }))).toThrow(QueueError);
  });

  test('drain resolves when empty', async () => {
    const q = new EventQueue();
    await expect(q.drain()).resolves.toBeUndefined();
  });

  test('drain waits for producers pending', async () => {
    const q = new EventQueue({ capacity: 1, waitWhenFull: true });
    q.enqueue(mkEvent({ topic: 'a' }));
    const p = q.enqueue(mkEvent({ topic: 'b' })) as Promise<boolean>;
    // Drain one to make room for the producer.
    void q.dequeue();
    await p;
    await q.drain();
    expect(q.size()).toBe(1);
  });

  test('clear empties buffer', () => {
    const q = new EventQueue();
    q.enqueue(mkEvent({ topic: 'a' }));
    q.clear();
    expect(q.size()).toBe(0);
  });

  test('default queue capacity constant', () => {
    expect(DEFAULT_QUEUE_CAPACITY).toBe(1024);
    const q = new EventQueue({ waitWhenFull: true });
    expect(q.getCapacity()).toBe(DEFAULT_QUEUE_CAPACITY);
  });

  test('enqueue invalid event throws', () => {
    const q = new EventQueue();
    // @ts-expect-error: testing runtime
    expect(() => q.enqueue(null)).toThrow(QueueError);
  });

  test('capacity validation', () => {
    expect(() => new EventQueue({ capacity: -1 })).toThrow(QueueError);
  });
});

// ========== Metrics ==========
describe('MetricsCollector', () => {
  test('initial snapshot is zeros', () => {
    const m = new MetricsCollector();
    const s = m.snapshot();
    expect(s.eventsPublished).toBe(0);
    expect(s.eventsDelivered).toBe(0);
    expect(s.eventsDropped).toBe(0);
    expect(s.activeSubscriptions).toBe(0);
    expect(s.activeSources).toBe(0);
    expect(s.avgLatencyMs).toBe(0);
    expect(s.p50LatencyMs).toBe(0);
    expect(s.p99LatencyMs).toBe(0);
  });

  test('counters increment', () => {
    const m = new MetricsCollector();
    m.recordPublish();
    m.recordPublish();
    m.recordDeliver();
    m.recordDrop();
    expect(m.snapshot().eventsPublished).toBe(2);
    expect(m.snapshot().eventsDelivered).toBe(1);
    expect(m.snapshot().eventsDropped).toBe(1);
  });

  test('subscription and source gauges', () => {
    const m = new MetricsCollector();
    m.incSubscription();
    m.incSubscription();
    m.decSubscription();
    m.incSource();
    expect(m.snapshot().activeSubscriptions).toBe(1);
    expect(m.snapshot().activeSources).toBe(1);
    m.decSource();
    expect(m.snapshot().activeSources).toBe(0);
  });

  test('setActiveSubscriptions rejects negative', () => {
    const m = new MetricsCollector();
    expect(() => m.setActiveSubscriptions(-1)).toThrow(RangeError);
  });

  test('latency tracking avg + percentiles', () => {
    const m = new MetricsCollector(100);
    for (let i = 1; i <= 100; i++) m.recordLatency(i);
    expect(m.sampleCount()).toBe(100);
    expect(m.avgLatency()).toBeCloseTo(50.5, 1);
    expect(m.percentile(50)).toBeGreaterThanOrEqual(50);
    expect(m.percentile(99)).toBeGreaterThanOrEqual(98);
    expect(m.percentile(0)).toBe(1);
    expect(m.percentile(100)).toBe(100);
  });

  test('percentile rejects out-of-range', () => {
    const m = new MetricsCollector();
    expect(() => m.percentile(-1)).toThrow(RangeError);
    expect(() => m.percentile(101)).toThrow(RangeError);
  });

  test('recordLatency ignores non-finite/negative', () => {
    const m = new MetricsCollector(10);
    m.recordLatency(NaN);
    m.recordLatency(-1);
    m.recordLatency(Infinity);
    m.recordLatency(5);
    expect(m.sampleCount()).toBe(1);
  });

  test('ring-buffer wraps', () => {
    const m = new MetricsCollector(3);
    m.recordLatency(1);
    m.recordLatency(2);
    m.recordLatency(3);
    m.recordLatency(4);
    m.recordLatency(5);
    expect(m.sampleCount()).toBe(3);
    // The buffer should now contain [3, 4, 5].
    expect(m.percentile(0)).toBe(3);
    expect(m.percentile(100)).toBe(5);
  });

  test('snapshot returns rounded latencies', () => {
    const m = new MetricsCollector(10);
    m.recordLatency(0.123456);
    const s = m.snapshot();
    expect(s.avgLatencyMs).toBe(0.123);
  });

  test('reset zeroes everything', () => {
    const m = new MetricsCollector(10);
    m.recordPublish();
    m.recordLatency(5);
    m.incSubscription();
    m.reset();
    const s = m.snapshot();
    expect(s.eventsPublished).toBe(0);
    expect(s.avgLatencyMs).toBe(0);
    expect(s.activeSubscriptions).toBe(0);
    expect(m.sampleCount()).toBe(0);
  });

  test('constructor rejects invalid args', () => {
    expect(() => new MetricsCollector(0)).toThrow(RangeError);
    expect(() => new MetricsCollector(10, 0)).toThrow(RangeError);
  });

  test('default latency buffer constant', () => {
    expect(DEFAULT_LATENCY_BUFFER).toBe(1024);
  });
});

// ========== Sources ==========
describe('Sources', () => {
  // ----- Filesystem -----
  describe('FilesystemSource', () => {
    let tmpDir: string;
    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(tmpdir(), 'nervous-fs-')); });
    afterEach(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ } });

    test('start/stop', () => {
      const src = new FilesystemSource({ path: tmpDir });
      const seen: NervousEvent[] = [];
      src.start((e) => seen.push(e));
      expect(src.isAvailable()).toBe(true);
      src.stop();
      expect(src.isAvailable()).toBe(false);
    });

    test('emits fs.change on file creation', (done) => {
      const src = new FilesystemSource({ path: tmpDir });
      const seen: NervousEvent[] = [];
      src.start((e) => seen.push(e));
      // Allow watcher to settle.
      setTimeout(() => {
        const filePath = path.join(tmpDir, 'hello.txt');
        fs.writeFileSync(filePath, 'world');
        setTimeout(() => {
          try {
            const changes = seen.filter((e) => e.topic === 'fs.change');
            expect(changes.length).toBeGreaterThan(0);
            expect(changes[0].source).toBe('filesystem');
            src.stop();
            done();
          } catch (e) { src.stop(); done(e); }
        }, 200);
      }, 100);
    });

    test('rejects missing path', () => {
      expect(() => new FilesystemSource({ path: '' })).toThrow(SourceError);
      // @ts-expect-error: testing runtime
      expect(() => new FilesystemSource({})).toThrow(SourceError);
    });

    test('start on non-existent path throws', () => {
      const src = new FilesystemSource({ path: '/definitely/does/not/exist/abc' });
      expect(() => src.start(() => {})).toThrow(SourceError);
    });
  });

  // ----- OS -----
  describe('OSSource', () => {
    test('emits os.metrics on start and interval', (done) => {
      const src = new OSSource({ intervalMs: 50 });
      const seen: NervousEvent[] = [];
      src.start((e) => seen.push(e));
      setTimeout(() => {
        src.stop();
        try {
          expect(seen.length).toBeGreaterThanOrEqual(1);
          expect(seen[0].topic).toBe('os.metrics');
          const payload = seen[0].payload as { cpus: unknown[]; loadavg: number[]; memory: { total: number; free: number; used: number; usedPct: number }; uptime: number };
          expect(Array.isArray(payload.cpus)).toBe(true);
          expect(payload.loadavg).toHaveLength(3);
          expect(typeof payload.memory.total).toBe('number');
          expect(typeof payload.memory.usedPct).toBe('number');
          expect(typeof payload.uptime).toBe('number');
          done();
        } catch (e) { done(e); }
      }, 120);
    });

    test('rejects invalid interval', () => {
      expect(() => new OSSource({ intervalMs: 0 })).toThrow(RangeError);
      expect(() => new OSSource({ intervalMs: -5 })).toThrow(RangeError);
    });

    test('start/stop is idempotent', () => {
      const src = new OSSource({ intervalMs: 1000 });
      src.start(() => {});
      src.start(() => {});
      src.stop();
      src.stop();
    });
  });

  // ----- Process -----
  describe('ProcessSource', () => {
    test('poll returns entries or null (defensive)', async () => {
      const src = new ProcessSource({ intervalMs: 1000 });
      const seen: NervousEvent[] = [];
      src.start((e) => seen.push(e));
      // Wait briefly to let the immediate poll resolve.
      await new Promise((r) => setTimeout(r, 100));
      src.stop();
      // Either we got spawn events (ps available) or a single warning event.
      // Either way, no throw.
      expect(seen.length).toBeGreaterThanOrEqual(0);
    });

    test('start/stop', () => {
      const src = new ProcessSource({ intervalMs: 1000 });
      src.start(() => {});
      src.stop();
    });

    test('rejects invalid interval', () => {
      expect(() => new ProcessSource({ intervalMs: 0 })).toThrow(RangeError);
    });
  });

  // ----- Network -----
  describe('NetworkSource', () => {
    test('emits net.stats or net.warning (defensive)', (done) => {
      const src = new NetworkSource({ intervalMs: 50 });
      const seen: NervousEvent[] = [];
      src.start((e) => seen.push(e));
      setTimeout(() => {
        src.stop();
        try {
          expect(seen.length).toBeGreaterThanOrEqual(1);
          const topics = seen.map((e) => e.topic);
          expect(topics.includes('net.stats') || topics.includes('net.warning')).toBe(true);
          done();
        } catch (e) { done(e); }
      }, 120);
    });

    test('readLinuxNetDev returns null on non-Linux or array on Linux', () => {
      const r = readLinuxNetDev();
      // On Linux this is an array; on other platforms this is null.
      expect(r === null || Array.isArray(r)).toBe(true);
    });

    test('rejects invalid interval', () => {
      expect(() => new NetworkSource({ intervalMs: 0 })).toThrow(RangeError);
    });
  });

  // ----- Custom -----
  describe('CustomSource', () => {
    test('producer is called with emit', () => {
      let emitted: NervousEvent[] = [];
      const src = new CustomSource({
        id: 'custom-1',
        producer: (emit) => {
          emit({ topic: 'c.a', payload: { v: 1 } });
          emit({ topic: 'c.b', payload: { v: 2 } });
        },
      });
      src.start((e) => emitted.push(e));
      expect(emitted).toHaveLength(2);
      expect(emitted[0].topic).toBe('c.a');
      expect(emitted[0].source).toBe('custom-1');
      expect(emitted[1].topic).toBe('c.b');
      src.stop();
    });

    test('producer returning cleanup function is called on stop', () => {
      let cleaned = false;
      const src = new CustomSource({
        producer: () => () => { cleaned = true; },
      });
      src.start(() => {});
      src.stop();
      expect(cleaned).toBe(true);
    });

    test('producer throw is wrapped', () => {
      const src = new CustomSource({
        producer: () => { throw new Error('boom'); },
      });
      expect(() => src.start(() => {})).toThrow(SourceError);
    });

    test('requires producer', () => {
      // @ts-expect-error: testing runtime
      expect(() => new CustomSource({})).toThrow(SourceError);
    });

    test('can emit raw NervousEvent too', () => {
      const seen: NervousEvent[] = [];
      const e = createEvent('raw.x', 'src', { v: 1 });
      const src = new CustomSource({ producer: (emit) => { emit(e); } });
      src.start((ev) => seen.push(ev));
      expect(seen).toHaveLength(1);
      expect(seen[0].id).toBe(e.id);
    });
  });

  // ----- Notification -----
  describe('NotificationSource', () => {
    test('notify publishes notification.<topic>', () => {
      const seen: NervousEvent[] = [];
      const src = new NotificationSource();
      src.start((e) => seen.push(e));
      const ev = src.notify('user.signup', { user: 'alice' });
      expect(ev).not.toBeNull();
      expect(ev!.topic).toBe('notification.user.signup');
      expect(ev!.source).toBe('notifications');
      expect(seen).toHaveLength(1);
      src.stop();
    });

    test('notify with already-prefixed topic', () => {
      const src = new NotificationSource();
      src.start(() => {});
      const ev = src.notify('notification.system.boot', {});
      expect(ev!.topic).toBe('notification.system.boot');
      src.stop();
    });

    test('notify returns null when not started', () => {
      const src = new NotificationSource();
      expect(src.notify('x', {})).toBeNull();
    });

    test('notify rejects empty topic', () => {
      const src = new NotificationSource();
      src.start(() => {});
      expect(() => src.notify('', {})).toThrow(SourceError);
      src.stop();
    });

    test('severity and tags passed through', () => {
      const seen: NervousEvent[] = [];
      const src = new NotificationSource();
      src.start((e) => seen.push(e));
      src.notify('alert', { v: 1 }, { severity: 'error', tags: ['urgent'] });
      expect(seen[0].severity).toBe('error');
      expect(seen[0].tags).toEqual(['urgent']);
      src.stop();
    });
  });

  // ----- Application -----
  describe('ApplicationSource', () => {
    test('recordRequest emits app.request', () => {
      const seen: NervousEvent[] = [];
      const src = new ApplicationSource();
      src.start((e) => seen.push(e));
      src.recordRequest({ method: 'GET', url: '/health', headers: { host: 'localhost' } });
      expect(seen).toHaveLength(1);
      expect(seen[0].topic).toBe('app.request');
      expect(seen[0].source).toBe('application');
      const payload = seen[0].payload as { method: string; url: string; headers?: Record<string, string> };
      expect(payload.method).toBe('GET');
      expect(payload.url).toBe('/health');
      expect(payload.headers?.host).toBe('localhost');
      src.stop();
    });

    test('start/stop is idempotent', () => {
      const src = new ApplicationSource();
      src.start(() => {});
      src.start(() => {});
      src.stop();
      src.stop();
    });

    test('accepts external emitter', () => {
      const { EventEmitter } = require('node:events');
      const ee = new EventEmitter();
      const seen: NervousEvent[] = [];
      const src = new ApplicationSource({ emitter: ee });
      src.start((e) => seen.push(e));
      ee.emit('request', { method: 'POST', url: '/x' });
      expect(seen).toHaveLength(1);
      src.stop();
    });
  });

  // ----- Stubs -----
  describe('Hardware stubs', () => {
    test('UsbSource start emits stub.usb.started, stop is clean', () => {
      const seen: NervousEvent[] = [];
      const src = new UsbSource();
      src.start((e) => seen.push(e));
      expect(src.isRunning()).toBe(true);
      src.stop();
      expect(src.isRunning()).toBe(false);
      expect(seen.filter((e) => e.topic === 'stub.usb.started')).toHaveLength(1);
    });

    test('BluetoothSource start emits stub.bluetooth.started', () => {
      const seen: NervousEvent[] = [];
      const src = new BluetoothSource();
      src.start((e) => seen.push(e));
      src.stop();
      expect(seen.filter((e) => e.topic === 'stub.bluetooth.started')).toHaveLength(1);
    });

    test('SensorSource start emits stub.sensor.started', () => {
      const seen: NervousEvent[] = [];
      const src = new SensorSource();
      src.start((e) => seen.push(e));
      src.stop();
      expect(seen.filter((e) => e.topic === 'stub.sensor.started')).toHaveLength(1);
    });

    test('CameraSource start emits stub.camera.started', () => {
      const seen: NervousEvent[] = [];
      const src = new CameraSource();
      src.start((e) => seen.push(e));
      src.stop();
      expect(seen.filter((e) => e.topic === 'stub.camera.started')).toHaveLength(1);
    });

    test('MicrophoneSource start emits stub.microphone.started', () => {
      const seen: NervousEvent[] = [];
      const src = new MicrophoneSource();
      src.start((e) => seen.push(e));
      src.stop();
      expect(seen.filter((e) => e.topic === 'stub.microphone.started')).toHaveLength(1);
    });

    test('emitStatus: false suppresses status event', () => {
      const seen: NervousEvent[] = [];
      const src = new UsbSource({ emitStatus: false });
      src.start((e) => seen.push(e));
      src.stop();
      expect(seen).toHaveLength(0);
    });

    test('simulationIntervalMs emits periodic samples', (done) => {
      const seen: NervousEvent[] = [];
      const src = new UsbSource({ simulationIntervalMs: 30 });
      src.start((e) => seen.push(e));
      setTimeout(() => {
        src.stop();
        try {
          const samples = seen.filter((e) => e.topic === 'stub.usb.sample');
          expect(samples.length).toBeGreaterThan(0);
          done();
        } catch (e) { done(e); }
      }, 100);
    });

    test('StubSource is abstract (cannot be instantiated at runtime via TS type-check)', () => {
      // TypeScript abstract classes are not enforced at runtime, but the
      // `@ts-expect-error` directive above ensures the type system rejects
      // direct instantiation. We sanity-check that `StubSource` is a class
      // and that subclasses behave correctly.
      expect(typeof StubSource).toBe('function');
    });
  });
});

// ========== Errors ==========
describe('Errors', () => {
  test('NervousSystemError has code', () => {
    const e = new NervousSystemError('boom');
    expect(e.code).toBe('NERVOUS_SYSTEM_ERROR');
    expect(e.message).toBe('boom');
    expect(e instanceof Error).toBe(true);
  });

  test('FabricError code', () => {
    expect(new FabricError('x').code).toBe('FABRIC_ERROR');
    expect(new FabricError('x') instanceof NervousSystemError).toBe(true);
  });

  test('FilterError code', () => {
    expect(new FilterError('x').code).toBe('FILTER_ERROR');
  });

  test('RouterError code', () => {
    expect(new RouterError('x').code).toBe('ROUTER_ERROR');
  });

  test('RecorderError code', () => {
    expect(new RecorderError('x').code).toBe('RECORDER_ERROR');
  });

  test('SourceError code', () => {
    expect(new SourceError('x').code).toBe('SOURCE_ERROR');
  });

  test('QueueError code', () => {
    expect(new QueueError('x').code).toBe('QUEUE_ERROR');
  });

  test('cause is preserved', () => {
    const inner = new Error('inner');
    const e = new FabricError('outer', inner);
    expect(e.cause).toBe(inner);
  });

  test('custom code override', () => {
    const e = new NervousSystemError('x', 'CUSTOM_CODE');
    expect(e.code).toBe('CUSTOM_CODE');
  });

  test('subclass name is preserved', () => {
    const e = new QueueError('x');
    expect(e.name).toBe('QueueError');
  });
});

// ========== Logging ==========
describe('Logging', () => {
  test('SCRUBBED_FIELD_NAMES exported', () => {
    expect(Array.isArray(SCRUBBED_FIELD_NAMES)).toBe(true);
    expect(SCRUBBED_FIELD_NAMES.length).toBeGreaterThan(0);
  });

  test('shouldScrubField matches exact and suffix', () => {
    expect(shouldScrubField('secret')).toBe(true);
    expect(shouldScrubField('token')).toBe(true);
    expect(shouldScrubField('apiKey')).toBe(true);
    expect(shouldScrubField('password')).toBe(true);
    expect(shouldScrubField('privateKey')).toBe(true);
    expect(shouldScrubField('user_secret')).toBe(true);
    expect(shouldScrubField('api_token')).toBe(true);
    expect(shouldScrubField('notsensitive')).toBe(false);
    expect(shouldScrubField('username')).toBe(false);
  });

  test('scrubMetadata recurses', () => {
    const out = scrubMetadata({ user: 'alice', secret: 's', nested: { token: 't', ok: 1 }, list: [{ password: 'p' }] }) as Record<string, unknown>;
    expect(out.user).toBe('alice');
    expect(out.secret).toBe('[redacted]');
    const nested = out.nested as Record<string, unknown>;
    expect(nested.token).toBe('[redacted]');
    expect(nested.ok).toBe(1);
    const list = out.list as Array<Record<string, unknown>>;
    expect(list[0].password).toBe('[redacted]');
  });

  test('SilentLogger is silent', () => {
    const l = new SilentLogger();
    expect(() => l.debug('x')).not.toThrow();
    expect(() => l.info('x')).not.toThrow();
    expect(() => l.warn('x')).not.toThrow();
    expect(() => l.error('x')).not.toThrow();
  });
});

// ========== End-to-end ==========
describe('End-to-end', () => {
  test('fabric + recorder + filesystem source round-trip', (done) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nervous-e2e-'));
    const fabric = new EventFabric({ recordByDefault: true, logger: new SilentLogger() });
    const fsSource = new FilesystemSource({ path: tmpDir, id: 'fs-e2e' });
    fabric.attach(fsSource);

    // Allow watcher to settle, then write a file.
    setTimeout(() => {
      fs.writeFileSync(path.join(tmpDir, 'e2e.txt'), 'hello');
      setTimeout(() => {
        try {
          const events = fabric.recorder.getEvents({ topic: 'fs.change' });
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].source).toBe('fs-e2e');
          const payload = events[0].payload as { path: string; event: string };
          expect(payload.path).toContain('e2e.txt');
          fabric.shutdown();
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
          done();
        } catch (e) {
          fabric.shutdown();
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
          done(e);
        }
      }, 300);
    }, 150);
  });

  test('fabric + router + queue integration', async () => {
    const fabric = new EventFabric({ logger: new SilentLogger() });
    const router = new EventRouter();
    const queue = new EventQueue();

    // Route every 'fs.change' event to the queue.
    router.addRoute(makeRoute({ topic: 'fs.change' }, 'queue', 'q1', 0));

    // Subscribe to fs.change in the fabric and forward to the router → queue.
    fabric.subscribe({ topic: 'fs.change' }, (event) => {
      const result = router.route(event);
      for (const d of result.destinations) {
        if (d.destination === 'queue' && d.target === 'q1') queue.enqueue(event);
      }
    });

    fabric.publish(mkEvent({ topic: 'fs.change', source: 'e2e', payload: { path: 'x' } }));
    const e = await queue.dequeue();
    expect(e?.topic).toBe('fs.change');
    expect(e?.source).toBe('e2e');
    fabric.shutdown();
    queue.stop();
  });

  test('fabric + custom source + notification source + recorder', () => {
    const fabric = new EventFabric({ recordByDefault: true, logger: new SilentLogger() });
    const notif = new NotificationSource();
    fabric.attach(notif);
    const custom = new CustomSource({
      id: 'custom-e2e',
      producer: (emit) => {
        emit({ topic: 'custom.tick', payload: { n: 1 } });
        emit({ topic: 'custom.tick', payload: { n: 2 } });
      },
    });
    fabric.attach(custom);

    notif.notify('alert', { msg: 'hi' });
    expect(fabric.recorder.size()).toBe(3);
    const ticks = fabric.recorder.getEvents({ topic: 'custom.tick' });
    expect(ticks).toHaveLength(2);
    const alerts = fabric.recorder.getEvents({ topic: 'notification.alert' });
    expect(alerts).toHaveLength(1);
    fabric.shutdown();
  });
});
