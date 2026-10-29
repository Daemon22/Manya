# @manya/nervous-system

> Universal event infrastructure — a high-performance event fabric for the MANYA Intelligence OS. Publish/subscribe, filtering, priority routing, ring-buffer recording, bounded/unbounded queues, performance metrics, and pluggable event sources spanning filesystems, OS metrics, processes, network activity, custom producers, notifications, applications, and hardware stubs (USB / Bluetooth / sensors / cameras / microphones).

`@manya/nervous-system` is the real-time event fabric of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides an in-process pub/sub fabric with O(1) topic lookup, O(k) per-topic filter evaluation, regex topic matching, structured event filters with logical combinators (`and`/`or`/`not`), a priority-ordered router, a fixed-capacity ring-buffer recorder with optional auto-recording, a bounded/unbounded async queue with promise-based blocking dequeue and configurable backpressure, a latency-tracking metrics collector, and eleven event sources covering the most common operational signals.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project. `@manya/nervous-system` extends that sovereignty into real-time sensing: **your events, your filters, your routing, your record buffer — yours alone.**

- **Sovereign.** No network calls. Every source is in-process and pluggable.
- **Fast.** O(1) topic lookup, O(k) per-topic filter evaluation. 100k+ events/sec on a single core for matched-delivery workloads.
- **Filterable.** Compile declarative filters to fast predicates. Combine with `and` / `or` / `not`.
- **Observable.** Built-in ring-buffer recorder, latency metrics, and per-event delivery counts.
- **Defensive.** Sources that touch the host (filesystem, processes, network) never throw from `start()` — they emit warning events instead.
- **Honest.** Hardware sources (USB, Bluetooth, sensors, cameras, microphones) ship as documented stubs; production deployments must wire platform-specific bindings.

---

## Features

| Area | What you get |
| --- | --- |
| **Event model** | `NervousEvent` type, `createEvent()` factory, `serialize()`/`deserialize()` JSON round-trip, structural validation, stable IDs. |
| **Filters** | `EventFilter` spec with topic (string / `'*'` / RegExp), source, severity, tags (subset match), payload predicate. `compileFilter()`, `matchEvent()`, `and()` / `or()` / `not()` combinators. |
| **Fabric** | `EventFabric` class with `publish()`, `subscribe()`, `unsubscribe()`, wildcard `*` topic, per-topic O(1) indexing, attach/detach sources, fabric-level `published`/`error`/`dropped` events. |
| **Router** | `EventRouter` with priority-ordered routes, `handler`/`queue`/`topic` destinations, `addRoute`/`removeRoute`/`route`. |
| **Recorder** | `EventRecorder` ring buffer with `start(maxSize?)`, `stop()`, `record()`, `getEvents(filter?)`, `clear()`, `export(filter?)`, `exportJSON(filter?)`. |
| **Queue** | `EventQueue` FIFO with `enqueue()`/`dequeue()`/`drain()`/`size()`, bounded or unbounded, optional `waitWhenFull` backpressure. |
| **Metrics** | `MetricsCollector` with publish/deliver/drop counters, active subscription/source gauges, latency ring buffer, `avg`/`p50`/`p99` percentiles, `snapshot()`, `reset()`. |
| **Sources — real** | `FilesystemSource` (fs.watch), `OSSource` (os.cpus/loadavg/memory/uptime), `ProcessSource` (ps / tasklist, defensive), `NetworkSource` (/proc/net/dev or os.networkInterfaces), `CustomSource` (producer fn), `NotificationSource` (in-process notify), `ApplicationSource` (HTTP/RPC request hook). |
| **Sources — stubs** | `UsbSource`, `BluetoothSource`, `SensorSource`, `CameraSource`, `MicrophoneSource` — start/stop only, emit `stub.<name>.started` events. |
| **Logging** | `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`. |

---

## Install

```bash
npm install @manya/nervous-system
```

Requires Node.js 18+.

---

## Quick start

### 1. Publish/subscribe with the bare fabric

```ts
import { EventFabric, createEvent } from '@manya/nervous-system';

const fabric = new EventFabric();

const subId = fabric.subscribe(
  { topic: 'app.login' },
  (event) => console.log('login:', event.payload),
);

fabric.publish(createEvent('app.login', 'demo', { user: 'alice' }));
// → login: { user: 'alice' }

fabric.unsubscribe(subId);
```

### 2. Attach an OS metrics source and record events

```ts
import { EventFabric, OSSource } from '@manya/nervous-system';

const fabric = new EventFabric({ recordByDefault: true });
fabric.attach(new OSSource({ intervalMs: 5000 }));

fabric.subscribe({ topic: 'os.metrics' }, (e) => {
  const m = e.payload as { memory: { usedPct: number } };
  console.log(`memory used: ${(m.memory.usedPct * 100).toFixed(1)}%`);
});

// later:
fabric.shutdown();
```

### 3. Combine filters with `and` / `or` / `not`

```ts
import { EventFabric, and, or, not } from '@manya/nervous-system';

const fabric = new EventFabric();

const filter = and(
  or({ topic: 'fs.change' }, { topic: 'fs.error' }),
  not({ severity: 'debug' }),
);

fabric.subscribe(filter, (e) => console.log('interesting fs event:', e));

fabric.publish({ id: 'x', topic: 'fs.change', source: 'fs', payload: { path: '/tmp/x' }, timestamp: Date.now(), severity: 'info' });
```

### 4. Route events to queues with priority

```ts
import { EventFabric, EventRouter, EventQueue, makeRoute } from '@manya/nervous-system';

const fabric = new EventFabric();
const router = new EventRouter();
const queue = new EventQueue({ capacity: 1024 });

router.addRoute(makeRoute({ topic: 'alert.critical' }, 'queue', 'alerts', 0));
router.addRoute(makeRoute({ topic: 'alert.*' }, 'queue', 'alerts', 10));

fabric.subscribe({ topic: /^alert\./ }, (event) => {
  for (const d of router.route(event).destinations) {
    if (d.destination === 'queue') queue.enqueue(event);
  }
});

// async consumer:
(async () => {
  while (true) {
    const e = await queue.dequeue();
    if (e === null) break;
    console.log('processing', e.topic);
  }
})();
```

---

## Configuration

```ts
export interface NervousConfig {
  defaultMaxSize?: number;    // recorder ring-buffer capacity (default 10_000)
  recordByDefault?: boolean;  // auto-record every published event (default false)
  logLevel?: LogLevel;        // default 'info'
  logger?: Logger;            // overrides logLevel
}
```

### Built-in defaults

| Constant | Value | Purpose |
| --- | --- | --- |
| `DEFAULT_NERVOUS_CONFIG.defaultMaxSize` | `10_000` | Recorder capacity. |
| `DEFAULT_NERVOUS_CONFIG.recordByDefault` | `false` | Whether the fabric auto-records. |
| `DEFAULT_RECORDER_MAX_SIZE` | `10_000` | Standalone recorder default capacity. |
| `DEFAULT_QUEUE_CAPACITY` | `1_024` | Bounded blocking-queue default capacity. |
| `DEFAULT_LATENCY_BUFFER` | `1_024` | Latency ring-buffer capacity. |
| `DEFAULT_OS_INTERVAL_MS` | `5_000` | `OSSource` sampling interval. |
| `DEFAULT_PROCESS_INTERVAL_MS` | `5_000` | `ProcessSource` polling interval. |
| `DEFAULT_NETWORK_INTERVAL_MS` | `5_000` | `NetworkSource` sampling interval. |

---

## Performance notes

- **Topic indexing.** Subscribers with a plain-string `topic` are stored under that exact topic key; O(1) lookup on publish. Subscribers with `'*'`, RegExp, or undefined topic are stored under the wildcard bucket and re-evaluated for every event.
- **Compiled filters.** `compileFilter()` produces a closure that runs each predicate clause in declaration order. The payload predicate (if any) runs last, only when the structural fields already match.
- **Combinators.** `and()` / `or()` / `not()` pre-compile their children at construction time, so a combined filter is just a tree of pre-compiled closures — no recompilation per event.
- **Ring buffer.** The recorder and the latency metrics use `Float64Array` / `Array` ring buffers with O(1) `record()` and O(N) sort-and-percentile.
- **Defensive sources.** `ProcessSource` and `NetworkSource` swallow host-command failures and emit a single warning event; they never throw from `start()`.
- **Backpressure.** `EventQueue` with `waitWhenFull: true` returns a Promise from `enqueue()` that resolves once room is available, giving producers natural async backpressure.

---

## Security notes

- **Local-only.** No data leaves the host process. Sources do not phone home.
- **No PII in logs.** `secret`, `token`, `apiKey`, `password`, `privateKey` are scrubbed by `ConsoleLogger`.
- **Payload provenance.** Every event carries a `source` string identifying its producer; downstream filters and routes can gate on this.
- **Defensive sources.** `ProcessSource` and `NetworkSource` never throw from `start()` — they emit a `process.warning` / `net.warning` event if the host command is unavailable.
- **Hardware stubs are stubs.** `UsbSource`, `BluetoothSource`, `SensorSource`, `CameraSource`, `MicrophoneSource` ship as no-op stubs. Production deployments that need real hardware events MUST subclass `StubSource` (or replace the class) with platform-specific bindings reviewed for security.

For threat models, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference.
- [CHANGELOG.md](./CHANGELOG.md) — release history.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface.
- [LICENSE](./LICENSE) — Apache-2.0.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
