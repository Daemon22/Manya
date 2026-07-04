# Contributing to @manya/nervous-system

## Code style
- TypeScript strict mode mandatory.
- `.js` import specifiers in source (NodeNext convention).
- No external runtime dependencies — only Node built-ins (`events`, `fs`, `os`, `child_process`, `crypto`, `path`).
- All public symbols carry JSDoc.
- All synchronous host calls (`fs.watch`, `child_process.exec`, `readFileSync`) MUST be wrapped defensively so a source's `start()` never throws synchronously.

## Testing
- Tests live in `tests/nervous-system.spec.ts` and use `jest` + `ts-jest`.
- Run from monorepo root:
  ```bash
  npx jest packages/nervous-system --no-coverage
  ```
- Type-check from monorepo root:
  ```bash
  npx tsc --noEmit -p packages/nervous-system/tsconfig.json
  ```
- Sources that touch host-specific resources (filesystem, `/proc/net/dev`, `ps`/`tasklist`) must have defensive tests that pass on every platform. Skip or assert-soft when the resource is unavailable.

## Adding a new event source
1. Define the source class in `src/sources/<name>.ts`. Implement the `EventSource` contract:
   ```ts
   { id: string; start(sink: EventSink): void; stop(): void }
   ```
2. Wrap every host call (`fs`, `child_process`, `os`, network) in try/catch. On failure, emit a single `<name>.warning` event and continue as a no-op.
3. Export the class and its options interface from `src/sources/index.ts` and the top-level `src/index.ts` barrel.
4. Add unit tests: start/stop, event payload shape, defensive behaviour for missing host resources, and idempotent start/stop.
5. Update `docs/API.md` and `README.md`.

## Adding a new filter clause
1. Extend the `EventFilter` interface in `src/types.ts`.
2. Update `compileFilter()` in `src/filter/filter.ts` to handle the new clause. Place cheap predicates first; expensive predicates (like payload) last.
3. Add unit tests covering positive, negative, and edge cases.

## Wiring a real hardware binding
The `UsbSource`, `BluetoothSource`, `SensorSource`, `CameraSource`, and `MicrophoneSource` classes extend `StubSource`. To wire real platform bindings:
1. Subclass the stub (e.g. `class MyUsbSource extends UsbSource`).
2. Override `produceSample()` to read from the real platform API (libusb, BlueZ, v4l2, PulseAudio, etc.).
3. Emit `usb.attach` / `usb.detach` / `sensor.reading` / `camera.frame` / `microphone.sample` events as appropriate.
4. Review security implications — hardware sources can leak audio, video, location, and identifiers. Document a threat model in your subclass.

## Licensing
Apache-2.0, attributed to the Manya Hael Foundation. See root [CONTRIBUTING.md](../../CONTRIBUTING.md).
