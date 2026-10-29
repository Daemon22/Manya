"use strict";
/**
 * @manya-os/nervous-system — hardware/peripheral source stubs.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrophoneSource = exports.CameraSource = exports.SensorSource = exports.BluetoothSource = exports.UsbSource = exports.StubSource = void 0;
const event_js_1 = require("../event/event.js");
/**
 * Base class for hardware stubs. Subclasses (or external bindings) override
 * `produceSample()` to emit real platform events. The default implementation
 * emits a single `stub.<name>.started` event on start and optionally emits
 * `stub.<name>.sample` events on the configured simulation interval.
 */
class StubSource {
    id;
    name;
    severity;
    emitStatus;
    simulationIntervalMs;
    sink = null;
    timer = null;
    constructor(name, opts) {
        const o = opts ?? {};
        this.name = name;
        this.id = o.id ?? name;
        this.severity = o.severity ?? 'debug';
        this.emitStatus = o.emitStatus !== false;
        this.simulationIntervalMs = o.simulationIntervalMs ?? 0;
    }
    /** Begin producing. Emits a single `stub.<name>.started` event. */
    start(sink) {
        this.sink = sink;
        if (this.emitStatus) {
            this.emit((0, event_js_1.createEvent)(`stub.${this.name}.started`, this.id, {
                message: `${this.name} source is a stub; no platform bindings attached`,
            }, { severity: this.severity }));
        }
        if (this.simulationIntervalMs > 0) {
            this.timer = setInterval(() => {
                const sample = this.produceSample();
                if (sample !== null) {
                    this.emit((0, event_js_1.createEvent)(`stub.${this.name}.sample`, this.id, sample, { severity: this.severity }));
                }
            }, this.simulationIntervalMs);
            if (typeof this.timer.unref === 'function')
                this.timer.unref();
        }
    }
    /** Stop producing. */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.sink = null;
    }
    /** Whether the source is currently producing. */
    isRunning() { return this.sink !== null; }
    /** Override to produce simulated samples. Return `null` to skip. */
    produceSample() { return null; }
    /** Emit an event to the sink (defensive). */
    emit(ev) {
        try {
            this.sink?.(ev);
        }
        catch { /* swallow */ }
    }
}
exports.StubSource = StubSource;
/** USB device stub. Emits `stub.usb.started` on start. */
class UsbSource extends StubSource {
    constructor(opts) { super('usb', opts); }
    produceSample() {
        return { devices: [], simulated: true };
    }
}
exports.UsbSource = UsbSource;
/** Bluetooth device stub. Emits `stub.bluetooth.started` on start. */
class BluetoothSource extends StubSource {
    constructor(opts) { super('bluetooth', opts); }
    produceSample() {
        return { devices: [], simulated: true };
    }
}
exports.BluetoothSource = BluetoothSource;
/** Sensor stub. Emits `stub.sensor.started` on start. */
class SensorSource extends StubSource {
    constructor(opts) { super('sensor', opts); }
    produceSample() {
        return { readings: {}, simulated: true };
    }
}
exports.SensorSource = SensorSource;
/** Camera stub. Emits `stub.camera.started` on start. */
class CameraSource extends StubSource {
    constructor(opts) { super('camera', opts); }
    produceSample() {
        return { frame: null, simulated: true };
    }
}
exports.CameraSource = CameraSource;
/** Microphone stub. Emits `stub.microphone.started` on start. */
class MicrophoneSource extends StubSource {
    constructor(opts) { super('microphone', opts); }
    produceSample() {
        return { sample: null, simulated: true };
    }
}
exports.MicrophoneSource = MicrophoneSource;
//# sourceMappingURL=stubs.js.map