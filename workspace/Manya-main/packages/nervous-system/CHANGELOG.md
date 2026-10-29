# Changelog

All notable changes to `@manya/nervous-system` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Adheres to [SemVer](https://semver.org/).

## [1.0.0] — 2024-01-15
### Added
- Initial release.
- `EventFabric` core: `publish()`, `subscribe()`, `unsubscribe()`, wildcard `*` topic, per-topic O(1) indexing, attach/detach sources, fabric-level `published`/`error`/`dropped` events.
- Event model: `NervousEvent` type, `createEvent()`, `serialize()`, `deserialize()`, `eventsEqual()`, `generateEventId()`, `isSeverity()`.
- Filters: `EventFilter` spec, `compileFilter()`, `matchEvent()`, `and()` / `or()` / `not()` combinators.
- Router: `EventRouter` with priority-ordered routes, `makeRoute()`, `makeRouteId()`, `handler` / `queue` / `topic` destinations.
- Recorder: `EventRecorder` ring buffer with `start(maxSize?)`, `stop()`, `record()`, `getEvents(filter?)`, `clear()`, `export()`, `exportJSON()`.
- Queue: `EventQueue` FIFO with `enqueue()`, `dequeue()`, `drain()`, `size()`, bounded/unbounded modes, `waitWhenFull` backpressure.
- Metrics: `MetricsCollector` with publish/deliver/drop counters, subscription/source gauges, latency ring buffer, `avg`/`p50`/`p99` percentiles, `snapshot()`, `reset()`.
- Sources:
  - `FilesystemSource` (fs.watch, emits `fs.change`).
  - `OSSource` (os.cpus / loadavg / memory / uptime, emits `os.metrics`).
  - `ProcessSource` (ps / tasklist, emits `process.spawn` / `process.exit`, defensive).
  - `NetworkSource` (/proc/net/dev or os.networkInterfaces, emits `net.stats`, defensive).
  - `CustomSource` (user-supplied producer function).
  - `NotificationSource` (in-process `notify()`).
  - `ApplicationSource` (HTTP/RPC request hook via EventEmitter).
  - Stubs: `UsbSource`, `BluetoothSource`, `SensorSource`, `CameraSource`, `MicrophoneSource`.
- Typed error hierarchy: `NervousSystemError` (base) + `FabricError`, `FilterError`, `RouterError`, `RecorderError`, `SourceError`, `QueueError`.
- Structured logging: `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`, `scrubMetadata()`, `shouldScrubField()`.
- Comprehensive unit test suite (152 tests) covering event model, filters, fabric, router, recorder, queue, metrics, all sources (incl. defensive skips), errors, logging, and an end-to-end fabric + recorder + filesystem source round-trip.
