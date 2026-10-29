# @manya/nervous-system Security Policy

## Scope
`@manya/nervous-system` runs entirely in-process. No event payloads, filter predicates, or source samples leave the host process. The fabric, recorder, queue, and metrics are all in-memory data structures.

## Threat model

### Event source security
- **Adversary:** a malicious event source that injects crafted events to trigger downstream side effects (e.g., a `process.spawn` event that a router routes to an autostart handler).
- **Asset:** the integrity of downstream consumers (handlers, queues, recorders).
- **Goal:** ensure that every event carries trustworthy provenance (`source`) and that consumers can filter on it.

### Payload sanitisation
- **Adversary:** an event payload containing sensitive data (PII, secrets, tokens) that ends up in logs or the recorder.
- **Asset:** the confidentiality of payload data when logged.
- **Goal:** `ConsoleLogger` scrubs `secret`, `token`, `apiKey`, `password`, `privateKey` (and `_`-suffixed variants) before writing to stdout/stderr. The recorder stores payloads verbatim — callers must apply their own redaction before persisting.

### Hardware source stubs
- **Adversary:** a deployment that uses the stub `UsbSource` / `BluetoothSource` / `SensorSource` / `CameraSource` / `MicrophoneSource` and assumes real platform events.
- **Asset:** the operator's expectation of hardware observability.
- **Goal:** stubs are documented as no-ops. Production deployments that need real hardware events MUST subclass and bind to platform-specific APIs.

### Queue backpressure
- **Adversary:** a slow consumer paired with a fast producer, exhausting memory.
- **Asset:** host memory and process stability.
- **Goal:** `EventQueue` supports `capacity` + `waitWhenFull` for natural async backpressure. Producers can `await enqueue()` to be notified when room is available.

## Security guarantees
1. **No remote calls.** All sources are in-process and local. The fabric never opens a socket.
2. **Provenance on every event.** Every `NervousEvent` carries a `source` string; consumers can filter on it.
3. **No PII in logs.** `ConsoleLogger` scrubs known sensitive field names before emitting.
4. **Defensive sources.** `ProcessSource` and `NetworkSource` never throw from `start()` — they emit a `process.warning` / `net.warning` event if the host command is unavailable.
5. **Handler isolation.** A throwing handler does not interrupt delivery to other matching subscribers; the fabric emits an `error` event for observability.

## Known limitations
- **Hardware sources are stubs.** `UsbSource`, `BluetoothSource`, `SensorSource`, `CameraSource`, `MicrophoneSource` emit a single `stub.<name>.started` event on start and otherwise no-op. Real platform bindings must be supplied by the deployer.
- **ProcessSource polls.** Polling `ps` / `tasklist` is a coarse signal; very short-lived processes (< `intervalMs`) may be missed entirely. Use a higher polling frequency if you need finer granularity, at the cost of CPU.
- **FilesystemSource uses `fs.watch`.** `fs.watch` is platform-dependent: it may emit multiple events per change, miss events on network filesystems, or fail to recurse on platforms that do not support `recursive`. Treat `fs.change` events as best-effort signals, not as a reliable audit log.
- **Recorder is in-memory.** The ring buffer lives in process memory. Persistence (disk, database) is the caller's responsibility — call `recorder.exportJSON()` and write to durable storage on a schedule.
- **Metrics are advisory.** Latency samples use `process.hrtime.bigint()` and are subject to event-loop scheduling jitter. Treat p99 as a signal, not a hard SLI.
- **Filter payload predicate runs untrusted code.** If you compile a filter with a `payloadPredicate` supplied by an untrusted source, it can execute arbitrary code. Only compile filters you trust.

## Reporting a vulnerability
See root [SECURITY.md](../../SECURITY.md). Do NOT open a public issue for security vulnerabilities.
