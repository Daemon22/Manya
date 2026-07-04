/**
 * @manya/nervous-system — universal event infrastructure.
 *
 * Public API surface for `@manya/nervous-system`. Everything exported here
 * is part of the stable, semver-bound public API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

// ----- types & errors -----
export * from './types.js';
export * from './errors.js';

// ----- logging -----
export {
  Logger, LogLevel, ConsoleLogger, SilentLogger,
  scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES,
} from './logging.js';

// ----- event model -----
export {
  createEvent, serialize, deserialize, eventsEqual,
  generateEventId, isSeverity,
} from './event/event.js';
export type { CreateEventOptions } from './event/event.js';

// ----- filters -----
export { compileFilter, matchEvent, and, or, not } from './filter/filter.js';

// ----- fabric -----
export { EventFabric, DEFAULT_NERVOUS_CONFIG } from './fabric/fabric.js';

// ----- router -----
export { EventRouter, makeRouteId, makeRoute } from './router/router.js';
export type { RoutingResult } from './router/router.js';

// ----- recorder -----
export { EventRecorder, DEFAULT_RECORDER_MAX_SIZE } from './recorder/recorder.js';

// ----- queue -----
export { EventQueue, DEFAULT_QUEUE_CAPACITY } from './queue/queue.js';
export type { QueueOptions } from './queue/queue.js';

// ----- metrics -----
export { MetricsCollector, DEFAULT_LATENCY_BUFFER, DEFAULT_LATENCY_SAMPLE_EVERY } from './metrics/metrics.js';

// ----- sources -----
export { FilesystemSource } from './sources/filesystem.js';
export type { FilesystemSourceOptions } from './sources/filesystem.js';

export { OSSource, DEFAULT_OS_INTERVAL_MS } from './sources/os.js';
export type { OSSourceOptions } from './sources/os.js';

export { ProcessSource, DEFAULT_PROCESS_INTERVAL_MS } from './sources/process.js';
export type { ProcessSourceOptions } from './sources/process.js';

export { NetworkSource, DEFAULT_NETWORK_INTERVAL_MS, readLinuxNetDev } from './sources/network.js';
export type { NetworkSourceOptions } from './sources/network.js';

export { CustomSource } from './sources/custom.js';
export type { CustomSourceOptions, CustomProducer } from './sources/custom.js';

export { NotificationSource } from './sources/notification.js';
export type { NotificationSourceOptions } from './sources/notification.js';

export { ApplicationSource } from './sources/application.js';
export type { ApplicationSourceOptions } from './sources/application.js';

export {
  StubSource, UsbSource, BluetoothSource, SensorSource, CameraSource, MicrophoneSource,
} from './sources/stubs.js';
export type { StubSourceOptions } from './sources/stubs.js';
