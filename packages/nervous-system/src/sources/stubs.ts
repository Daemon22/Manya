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
import { createEvent } from '../event/event.js';

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
export abstract class StubSource {
  public readonly id: string;
  public readonly name: string;
  protected readonly severity: Severity;
  private readonly emitStatus: boolean;
  private readonly simulationIntervalMs: number;
  private sink: EventSink | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(name: string, opts?: StubSourceOptions) {
    const o = opts ?? {};
    this.name = name;
    this.id = o.id ?? name;
    this.severity = o.severity ?? 'debug';
    this.emitStatus = o.emitStatus !== false;
    this.simulationIntervalMs = o.simulationIntervalMs ?? 0;
  }

  /** Begin producing. Emits a single `stub.<name>.started` event. */
  start(sink: EventSink): void {
    this.sink = sink;
    if (this.emitStatus) {
      this.emit(createEvent(`stub.${this.name}.started`, this.id, {
        message: `${this.name} source is a stub; no platform bindings attached`,
      }, { severity: this.severity }));
    }
    if (this.simulationIntervalMs > 0) {
      this.timer = setInterval(() => {
        const sample = this.produceSample();
        if (sample !== null) {
          this.emit(createEvent(`stub.${this.name}.sample`, this.id, sample, { severity: this.severity }));
        }
      }, this.simulationIntervalMs);
      if (typeof this.timer.unref === 'function') this.timer.unref();
    }
  }

  /** Stop producing. */
  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.sink = null;
  }

  /** Whether the source is currently producing. */
  isRunning(): boolean { return this.sink !== null; }

  /** Override to produce simulated samples. Return `null` to skip. */
  protected produceSample(): unknown | null { return null; }

  /** Emit an event to the sink (defensive). */
  protected emit(ev: NervousEvent): void {
    try { this.sink?.(ev); } catch { /* swallow */ }
  }
}

/** USB device stub. Emits `stub.usb.started` on start. */
export class UsbSource extends StubSource {
  constructor(opts?: StubSourceOptions) { super('usb', opts); }
  protected produceSample(): unknown | null {
    return { devices: [], simulated: true };
  }
}

/** Bluetooth device stub. Emits `stub.bluetooth.started` on start. */
export class BluetoothSource extends StubSource {
  constructor(opts?: StubSourceOptions) { super('bluetooth', opts); }
  protected produceSample(): unknown | null {
    return { devices: [], simulated: true };
  }
}

/** Sensor stub. Emits `stub.sensor.started` on start. */
export class SensorSource extends StubSource {
  constructor(opts?: StubSourceOptions) { super('sensor', opts); }
  protected produceSample(): unknown | null {
    return { readings: {}, simulated: true };
  }
}

/** Camera stub. Emits `stub.camera.started` on start. */
export class CameraSource extends StubSource {
  constructor(opts?: StubSourceOptions) { super('camera', opts); }
  protected produceSample(): unknown | null {
    return { frame: null, simulated: true };
  }
}

/** Microphone stub. Emits `stub.microphone.started` on start. */
export class MicrophoneSource extends StubSource {
  constructor(opts?: StubSourceOptions) { super('microphone', opts); }
  protected produceSample(): unknown | null {
    return { sample: null, simulated: true };
  }
}
