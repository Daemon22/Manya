# @manya/nervous-system — API Reference

> Complete TypeScript API reference for `@manya/nervous-system` v1.0.0.

## Contents
- [Types](#types)
- [Errors](#errors)
- [Logging](#logging)
- [Event model](#event-model)
- [Filters](#filters)
- [EventFabric](#eventfabric)
- [EventRouter](#eventrouter)
- [EventRecorder](#eventrecorder)
- [EventQueue](#eventqueue)
- [MetricsCollector](#metricscollector)
- [Sources](#sources)
  - [FilesystemSource](#filesystemsource)
  - [OSSource](#ossource)
  - [ProcessSource](#processsource)
  - [NetworkSource](#networksource)
  - [CustomSource](#customsource)
  - [NotificationSource](#notificationsource)
  - [ApplicationSource](#applicationsource)
  - [Hardware stubs](#hardware-stubs)

---

## Types

### `Severity`
```ts
type Severity = 'debug' | 'info' | 'warn' | 'error';
```

### `SubscriptionId`
```ts
type SubscriptionId = string;
```

### `RouteId`
```ts
type RouteId = string;
```

### `NervousEvent`
```ts
interface NervousEvent {
  id: string;
  topic: string;
  source: string;
  payload: unknown;
  timestamp: number;
  severity: Severity;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
```

### `PayloadPredicate`
```ts
type PayloadPredicate = (payload: unknown) => boolean;
```

### `CompiledFilter`
```ts
type CompiledFilter = (event: NervousEvent) => boolean;
```

### `EventFilter`
```ts
interface EventFilter {
  topic?: string | RegExp;
  source?: string;
  severity?: Severity | Severity[];
  tags?: string[];
  payloadPredicate?: PayloadPredicate;
}
```

### `EventSink`
```ts
type EventSink = (event: NervousEvent) => void;
```

### `EventSource`
```ts
interface EventSource {
  id: string;
  start(sink: EventSink): void;
  stop(): void;
}
```

### `RouteDestination`
```ts
type RouteDestination = 'handler' | 'queue' | 'topic';
```

### `Route`
```ts
interface Route {
  id: RouteId;
  filter: EventFilter;
  destination: RouteDestination;
  target: string;
  priority: number;
}
```

### `FabricMetrics`
```ts
interface FabricMetrics {
  eventsPublished: number;
  eventsDelivered: number;
  eventsDropped: number;
  activeSubscriptions: number;
  activeSources: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p99LatencyMs: number;
}
```

### `NervousConfig`
```ts
interface NervousConfig {
  defaultMaxSize?: number;
  recordByDefault?: boolean;
  logLevel?: LogLevel;
  logger?: Logger;
}
```

---

## Errors

All errors extend `NervousSystemError` which extends `Error`. Every error carries a stable `code: string`.

| Class | Code |
| --- | --- |
| `NervousSystemError` | `NERVOUS_SYSTEM_ERROR` |
| `FabricError` | `FABRIC_ERROR` |
| `FilterError` | `FILTER_ERROR` |
| `RouterError` | `ROUTER_ERROR` |
| `RecorderError` | `RECORDER_ERROR` |
| `SourceError` | `SOURCE_ERROR` |
| `QueueError` | `QUEUE_ERROR` |

```ts
class NervousSystemError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown);
}
```

---

## Logging

### `Logger`
```ts
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}
```

### `LogLevel`
```ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
```

### `ConsoleLogger`
```ts
class ConsoleLogger implements Logger {
  constructor(level?: LogLevel);
}
```

### `SilentLogger`
```ts
class SilentLogger implements Logger {}
```

### `SCRUBBED_FIELD_NAMES`
```ts
const SCRUBBED_FIELD_NAMES: readonly ['secret', 'token', 'apiKey', 'password', 'privateKey'];
```

### `shouldScrubField(name)`
Returns true if `name` exactly matches or ends with `_<needle>` for any needle in `SCRUBBED_FIELD_NAMES`.

### `scrubMetadata(meta)`
Returns a deep copy of `meta` with sensitive fields replaced by `'[redacted]'`.

---

## Event model

### `createEvent(topic, source, payload, opts?)`
```ts
function createEvent(
  topic: string,
  source: string,
  payload: unknown,
  opts?: {
    id?: string;
    timestamp?: number;
    severity?: Severity;
    tags?: string[];
    metadata?: Record<string, unknown>;
  },
): NervousEvent;
```
Creates a `NervousEvent` with auto-generated id and timestamp. Throws `NervousSystemError` if `topic` / `source` is empty or `severity` is invalid.

### `serialize(event, pretty?)`
Returns the event as a JSON string. Throws `NervousSystemError` on serialization failure.

### `deserialize(json)`
Parses a JSON string into a `NervousEvent` and validates required fields (`id`, `topic`, `source`, `timestamp`, `severity`) and optional field types (`tags` array, `metadata` object). Throws `NervousSystemError` on any structural defect.

### `eventsEqual(a, b)`
Returns true if `serialize(a) === serialize(b)`.

### `generateEventId()`
Returns a `crypto.randomUUID()`-based id (with a fallback for older runtimes).

### `isSeverity(s)`
Type guard for `Severity`.

---

## Filters

### `compileFilter(filter)`
```ts
function compileFilter(filter: EventFilter): CompiledFilter;
```
Compiles an `EventFilter` into a fast predicate. Order of evaluation: `topic` → `source` → `severity` → `tags` → `payloadPredicate`. Throws `FilterError` on invalid shape.

### `matchEvent(filter, event)`
One-shot convenience: compiles the filter and runs it against the event.

### `and(...filters)`
Returns a new `EventFilter` whose compiled predicate matches iff every input matches. Empty → match-all. Sub-filters are pre-compiled.

### `or(...filters)`
Returns a new `EventFilter` whose compiled predicate matches iff any input matches. Empty → match-none.

### `not(filter)`
Returns a new `EventFilter` whose compiled predicate is the logical negation of the input.

---

## EventFabric

```ts
class EventFabric {
  constructor(config?: NervousConfig);
  readonly recorder: EventRecorder;
  readonly metrics: MetricsCollector;
  readonly config: Required<Omit<NervousConfig, 'logger'>>;

  getLogger(): Logger;
  isRecording(): boolean;
  startRecording(): void;
  stopRecording(): void;

  subscribe(filter: EventFilter, handler: (event: NervousEvent) => void): SubscriptionId;
  subscribe(filter: EventFilter, id: SubscriptionId, handler: (event: NervousEvent) => void): SubscriptionId;
  unsubscribe(id: SubscriptionId): boolean;
  subscriptionCount(): number;
  topicCount(): number;

  publish(event: NervousEvent): number;

  attach(source: EventSource): void;
  detach(sourceId: string): boolean;
  detachAll(): void;
  listSources(): string[];
  sourceCount(): number;

  on(event: 'published', handler: (event: NervousEvent) => void): this;
  on(event: 'error', handler: (err: Error, event: NervousEvent) => void): this;
  on(event: 'dropped', handler: (event: NervousEvent) => void): this;
  on(event: string, handler: (...args: any[]) => void): this;
  off(event: string, handler: (...args: any[]) => void): this;

  shutdown(): void;
}
```

`publish()` returns the number of subscribers the event was delivered to. A throwing handler is isolated: an `error` fabric-event is emitted, the handler's delivery is counted as dropped, and other matching subscribers still run.

`attach(source)` calls `source.start(sink)` where `sink` funnels emitted events back into `publish()`. `detach(id)` calls `source.stop()`. `shutdown()` detaches all sources, stops recording, clears subscribers, and removes all listeners.

### `DEFAULT_NERVOUS_CONFIG`
```ts
const DEFAULT_NERVOUS_CONFIG: Required<Omit<NervousConfig, 'logger'>>;
// { defaultMaxSize: 10_000, recordByDefault: false, logLevel: 'info' }
```

---

## EventRouter

```ts
class EventRouter {
  addRoute(route: Route): void;
  removeRoute(id: RouteId): boolean;
  getRoute(id: RouteId): Route | null;
  listRoutes(): RouteId[];
  size(): number;
  route(event: NervousEvent): RoutingResult;
  clear(): void;
}

interface RoutingResult {
  event: NervousEvent;
  destinations: Array<{
    routeId: RouteId;
    destination: RouteDestination;
    target: string;
    priority: number;
  }>;
}
```

Routes are sorted by `priority` ascending (lower runs first), with stable tie-break by `id`. Throws `RouterError` on duplicate id, invalid route shape, or filter throw.

### `makeRoute(filter, destination, target, priority?, id?)`
Builds a `Route` with a generated id (or caller-supplied id).

### `makeRouteId(prefix?)`
Returns a unique `RouteId` of the form `<prefix>-<n>` (prefix defaults to `'route'`).

---

## EventRecorder

```ts
class EventRecorder {
  constructor(maxSize?: number);
  start(maxSize?: number): void;
  stop(): void;
  isRecording(): boolean;
  getCapacity(): number;
  size(): number;
  record(event: NervousEvent): boolean;
  getEvents(filter?: EventFilter): NervousEvent[];
  clear(): void;
  export(filter?: EventFilter): NervousEvent[];
  exportJSON(filter?: EventFilter, pretty?: boolean): string;
}
```

`start(maxSize?)` is idempotent. If `maxSize` is supplied, it must match the constructor's capacity (otherwise throws `RecorderError`); the capacity is fixed at construction time. `record()` is O(1). `getEvents()` returns a fresh array in chronological order.

### `DEFAULT_RECORDER_MAX_SIZE`
```ts
const DEFAULT_RECORDER_MAX_SIZE = 10_000;
```

---

## EventQueue

```ts
class EventQueue {
  constructor(opts?: { capacity?: number; waitWhenFull?: boolean });
  getCapacity(): number;
  isBlocking(): boolean;
  size(): number;
  isEmpty(): boolean;
  isFull(): boolean;
  isStopped(): boolean;

  enqueue(event: NervousEvent): boolean | Promise<boolean>;
  dequeue(): Promise<NervousEvent | null>;
  drain(): Promise<void>;
  stop(): void;
  clear(): void;
}
```

- `enqueue()` returns `true` synchronously when there was room. With `waitWhenFull: true`, returns a Promise that resolves once room is available (or rejects if `stop()` is called first).
- `dequeue()` resolves to the next event, blocks while empty, or resolves to `null` if the queue is stopped.
- `drain()` resolves when no producers are pending (backpressure relieved). Buffer may still contain events — that's the consumer's responsibility.
- `stop()` rejects pending enqueues with `QueueError` and resolves pending dequeuers with `null`.

### `DEFAULT_QUEUE_CAPACITY`
```ts
const DEFAULT_QUEUE_CAPACITY = 1_024;
```

---

## MetricsCollector

```ts
class MetricsCollector {
  constructor(capacity?: number, sampleEvery?: number);

  recordPublish(): void;
  recordDeliver(): void;
  recordDrop(): void;
  setActiveSubscriptions(n: number): void;
  incSubscription(): void;
  decSubscription(): void;
  setActiveSources(n: number): void;
  incSource(): void;
  decSource(): void;
  recordLatency(ms: number): void;

  sampleCount(): number;
  totalSamplesObserved(): number;
  avgLatency(): number;
  percentile(p: number): number;
  snapshot(): FabricMetrics;
  reset(): void;
}
```

Latency is stored in a `Float64Array` ring buffer. `percentile(p)` uses nearest-rank ordering; throws `RangeError` for `p` outside `[0, 100]`. `recordLatency()` silently ignores non-finite or negative values. `snapshot()` returns latencies rounded to 3 decimal places.

### Constants
```ts
const DEFAULT_LATENCY_BUFFER = 1_024;
const DEFAULT_LATENCY_SAMPLE_EVERY = 1;
```

---

## Sources

Every source implements the `EventSource` contract (`id`, `start(sink)`, `stop()`). All sources are defensive — they never throw from `start()` for missing host resources, and they emit a single warning event instead.

### FilesystemSource

```ts
class FilesystemSource {
  constructor(opts: {
    path: string;
    id?: string;
    recursive?: boolean;
    severity?: Severity;
    tags?: string[];
  });
  readonly id: string;
  isAvailable(): boolean;
  start(sink: EventSink): void;
  stop(): void;
}
```

Watches `path` via `fs.watch`. Emits `fs.change` events with payload `{ path, event }`. On watcher error, emits `fs.error`. Throws `SourceError` from `start()` only if `fs.watch` itself throws synchronously (e.g. path does not exist).

### OSSource

```ts
class OSSource {
  constructor(opts?: {
    id?: string;
    intervalMs?: number;  // default 5_000
    severity?: Severity;
    tags?: string[];
  });
  readonly id: string;
  start(sink: EventSink): void;
  stop(): void;
  sample(): void;
}
```

Emits `os.metrics` events with payload `{ cpus, loadavg, memory: { total, free, used, usedPct }, uptime }`. `start()` emits one immediate sample then sets an interval. `unref()` is called on the timer.

### ProcessSource

```ts
class ProcessSource {
  constructor(opts?: {
    id?: string;
    intervalMs?: number;  // default 5_000
    severity?: Severity;
    tags?: string[];
  });
  readonly id: string;
  isAvailable(): boolean;
  start(sink: EventSink): void;
  stop(): void;
  poll(): Promise<void>;
}
```

Polls `ps -A -o pid=,comm=` (POSIX) or `tasklist /FO CSV /NH` (Windows). Emits `process.spawn` for newly seen PIDs and `process.exit` for disappeared PIDs. If the command is unavailable, emits a single `process.warning` event and continues as a no-op.

### NetworkSource

```ts
class NetworkSource {
  constructor(opts?: {
    id?: string;
    intervalMs?: number;  // default 5_000
    severity?: Severity;
    tags?: string[];
  });
  readonly id: string;
  start(sink: EventSink): void;
  stop(): void;
  sample(): void;
}
```

On Linux, parses `/proc/net/dev` for per-interface byte counters. On other platforms, falls back to `os.networkInterfaces()` with byte counters zeroed and emits a single `net.warning` event. Emits `net.stats` events with payload `{ interfaces: Array<{ name, rxBytes, txBytes }>, rx_bytes, tx_bytes }`.

### `readLinuxNetDev()`
```ts
function readLinuxNetDev(): Array<{ name: string; rxBytes: number; txBytes: number }> | null;
```
Returns `null` if `/proc/net/dev` is unavailable.

### CustomSource

```ts
class CustomSource {
  constructor(opts: {
    id?: string;
    producer: (emit: (event: NervousEvent | { topic: string; payload: unknown; severity?: Severity; tags?: string[]; metadata?: Record<string, unknown> }) => void) => void | (() => void);
    severity?: Severity;
    tags?: string[];
  });
  readonly id: string;
  start(sink: EventSink): void;
  stop(): void;
}
```

Calls the producer on `start()` with an `emit` callback. The producer can emit either a fully-formed `NervousEvent` or a `{ topic, payload, ... }` shorthand (in which case the source constructs the event with `source = this.id`). If the producer returns a cleanup function, it's called on `stop()`.

### NotificationSource

```ts
class NotificationSource {
  constructor(opts?: {
    id?: string;       // default 'notifications'
    severity?: Severity;
    tags?: string[];
  });
  readonly id: string;
  start(sink: EventSink): void;
  stop(): void;
  notify(topic: string, payload: unknown, opts?: {
    severity?: Severity;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): NervousEvent | null;
}
```

`notify()` publishes a `notification.<topic>` event (or uses the topic verbatim if it already starts with `notification.`). Returns the constructed event, or `null` if the source is not started.

### ApplicationSource

```ts
class ApplicationSource {
  constructor(opts?: {
    id?: string;     // default 'application'
    severity?: Severity;
    tags?: string[];
    emitter?: EventEmitter;  // default: internal
  });
  readonly id: string;
  start(sink: EventSink): void;
  stop(): void;
  recordRequest(req: { method?: string; url?: string; headers?: Record<string, string>; body?: unknown }): void;
  getEmitter(): EventEmitter;
}
```

Listens for `request` events on the configured (or internal) EventEmitter and emits `app.request` events with payload `{ method, url, headers?, body? }`. `recordRequest()` is a convenience for tests and for applications that don't have a real HTTP server.

### Hardware stubs

```ts
abstract class StubSource {
  protected constructor(name: string, opts?: {
    id?: string;
    emitStatus?: boolean;
    severity?: Severity;
    simulationIntervalMs?: number;
  });
  readonly id: string;
  readonly name: string;
  isRunning(): boolean;
  start(sink: EventSink): void;
  stop(): void;
  protected produceSample(): unknown | null;
}

class UsbSource extends StubSource { constructor(opts?: StubSourceOptions); }
class BluetoothSource extends StubSource { constructor(opts?: StubSourceOptions); }
class SensorSource extends StubSource { constructor(opts?: StubSourceOptions); }
class CameraSource extends StubSource { constructor(opts?: StubSourceOptions); }
class MicrophoneSource extends StubSource { constructor(opts?: StubSourceOptions); }
```

Stubs emit a single `stub.<name>.started` event on start (suppressible via `emitStatus: false`). When `simulationIntervalMs > 0`, they emit periodic `stub.<name>.sample` events with the value returned by `produceSample()`. Production deployments MUST subclass and override `produceSample()` to bind to real platform APIs (libusb, BlueZ, v4l2, PulseAudio, kernel sensorfs, etc.).
