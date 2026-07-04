/**
 * @manya/nervous-system — hardware/peripheral source stubs.
 *
 * `UsbSource`, `BluetoothSource`, `SensorSource`, `CameraSource`, and
 * `MicrophoneSource` are stubs. They implement the {@link EventSource}
 * contract (start/stop) but emit no real platform events. Production
 * deployments must subclass or replace them with platform-specific
 * bindings (libusb, BlueZ, kernel sensorfs, v4l2, PulseAudio, etc.).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { EventSink, NervousEvent, Severity } from '../types.js';
/** Common options for stub sources. */
export interface StubSourceOptions {
    /** Source id. Defaults to the source name (e.g. 'usb'). */
    id?: string;
    /** Whether to emit a single status event on start (default true). */
    emitStatus?: boolean;
    /** Severity for the status event. Default 'debug'. */
    severity?: Severity;
    /** Sampling interval in ms when emitting simulated events (default 0 = none). */
    simulationIntervalMs?: number;
}
/**
 * Base class for hardware stubs. Subclasses (or external bindings) override
 * `produceSample()` to emit real platform events. The default implementation
 * emits a single `stub.<name>.started` event on start and optionally emits
 * `stub.<name>.sample` events on the configured simulation interval.
 */
export declare abstract class StubSource {
    readonly id: string;
    readonly name: string;
    protected readonly severity: Severity;
    private readonly emitStatus;
    private readonly simulationIntervalMs;
    private sink;
    private timer;
    constructor(name: string, opts?: StubSourceOptions);
    /** Begin producing. Emits a single `stub.<name>.started` event. */
    start(sink: EventSink): void;
    /** Stop producing. */
    stop(): void;
    /** Whether the source is currently producing. */
    isRunning(): boolean;
    /** Override to produce simulated samples. Return `null` to skip. */
    protected produceSample(): unknown | null;
    /** Emit an event to the sink (defensive). */
    protected emit(ev: NervousEvent): void;
}
/** USB device stub. Emits `stub.usb.started` on start. */
export declare class UsbSource extends StubSource {
    constructor(opts?: StubSourceOptions);
    protected produceSample(): unknown | null;
}
/** Bluetooth device stub. Emits `stub.bluetooth.started` on start. */
export declare class BluetoothSource extends StubSource {
    constructor(opts?: StubSourceOptions);
    protected produceSample(): unknown | null;
}
/** Sensor stub. Emits `stub.sensor.started` on start. */
export declare class SensorSource extends StubSource {
    constructor(opts?: StubSourceOptions);
    protected produceSample(): unknown | null;
}
/** Camera stub. Emits `stub.camera.started` on start. */
export declare class CameraSource extends StubSource {
    constructor(opts?: StubSourceOptions);
    protected produceSample(): unknown | null;
}
/** Microphone stub. Emits `stub.microphone.started` on start. */
export declare class MicrophoneSource extends StubSource {
    constructor(opts?: StubSourceOptions);
    protected produceSample(): unknown | null;
}
//# sourceMappingURL=stubs.d.ts.map