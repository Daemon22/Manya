"use strict";
/**
 * @manya-os/nervous-system — universal event infrastructure.
 *
 * Public API surface for `@manya-os/nervous-system`. Everything exported here
 * is part of the stable, semver-bound public API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrophoneSource = exports.CameraSource = exports.SensorSource = exports.BluetoothSource = exports.UsbSource = exports.StubSource = exports.ApplicationSource = exports.NotificationSource = exports.CustomSource = exports.readLinuxNetDev = exports.DEFAULT_NETWORK_INTERVAL_MS = exports.NetworkSource = exports.DEFAULT_PROCESS_INTERVAL_MS = exports.ProcessSource = exports.DEFAULT_OS_INTERVAL_MS = exports.OSSource = exports.FilesystemSource = exports.DEFAULT_LATENCY_SAMPLE_EVERY = exports.DEFAULT_LATENCY_BUFFER = exports.MetricsCollector = exports.CollaborationRequestQueue = exports.DEFAULT_QUEUE_CAPACITY = exports.EventQueue = exports.DEFAULT_RECORDER_MAX_SIZE = exports.EventRecorder = exports.makeRoute = exports.makeRouteId = exports.EventRouter = exports.DEFAULT_NERVOUS_CONFIG = exports.EventFabric = exports.not = exports.or = exports.and = exports.matchEvent = exports.compileFilter = exports.isSeverity = exports.generateEventId = exports.eventsEqual = exports.deserialize = exports.serialize = exports.createEvent = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
// ----- types & errors -----
__exportStar(require("./types.js"), exports);
__exportStar(require("./errors.js"), exports);
// ----- logging -----
var logging_js_1 = require("./logging.js");
Object.defineProperty(exports, "ConsoleLogger", { enumerable: true, get: function () { return logging_js_1.ConsoleLogger; } });
Object.defineProperty(exports, "SilentLogger", { enumerable: true, get: function () { return logging_js_1.SilentLogger; } });
Object.defineProperty(exports, "scrubMetadata", { enumerable: true, get: function () { return logging_js_1.scrubMetadata; } });
Object.defineProperty(exports, "shouldScrubField", { enumerable: true, get: function () { return logging_js_1.shouldScrubField; } });
Object.defineProperty(exports, "SCRUBBED_FIELD_NAMES", { enumerable: true, get: function () { return logging_js_1.SCRUBBED_FIELD_NAMES; } });
// ----- event model -----
var event_js_1 = require("./event/event.js");
Object.defineProperty(exports, "createEvent", { enumerable: true, get: function () { return event_js_1.createEvent; } });
Object.defineProperty(exports, "serialize", { enumerable: true, get: function () { return event_js_1.serialize; } });
Object.defineProperty(exports, "deserialize", { enumerable: true, get: function () { return event_js_1.deserialize; } });
Object.defineProperty(exports, "eventsEqual", { enumerable: true, get: function () { return event_js_1.eventsEqual; } });
Object.defineProperty(exports, "generateEventId", { enumerable: true, get: function () { return event_js_1.generateEventId; } });
Object.defineProperty(exports, "isSeverity", { enumerable: true, get: function () { return event_js_1.isSeverity; } });
// ----- filters -----
var filter_js_1 = require("./filter/filter.js");
Object.defineProperty(exports, "compileFilter", { enumerable: true, get: function () { return filter_js_1.compileFilter; } });
Object.defineProperty(exports, "matchEvent", { enumerable: true, get: function () { return filter_js_1.matchEvent; } });
Object.defineProperty(exports, "and", { enumerable: true, get: function () { return filter_js_1.and; } });
Object.defineProperty(exports, "or", { enumerable: true, get: function () { return filter_js_1.or; } });
Object.defineProperty(exports, "not", { enumerable: true, get: function () { return filter_js_1.not; } });
// ----- fabric -----
var fabric_js_1 = require("./fabric/fabric.js");
Object.defineProperty(exports, "EventFabric", { enumerable: true, get: function () { return fabric_js_1.EventFabric; } });
Object.defineProperty(exports, "DEFAULT_NERVOUS_CONFIG", { enumerable: true, get: function () { return fabric_js_1.DEFAULT_NERVOUS_CONFIG; } });
// ----- router -----
var router_js_1 = require("./router/router.js");
Object.defineProperty(exports, "EventRouter", { enumerable: true, get: function () { return router_js_1.EventRouter; } });
Object.defineProperty(exports, "makeRouteId", { enumerable: true, get: function () { return router_js_1.makeRouteId; } });
Object.defineProperty(exports, "makeRoute", { enumerable: true, get: function () { return router_js_1.makeRoute; } });
// ----- recorder -----
var recorder_js_1 = require("./recorder/recorder.js");
Object.defineProperty(exports, "EventRecorder", { enumerable: true, get: function () { return recorder_js_1.EventRecorder; } });
Object.defineProperty(exports, "DEFAULT_RECORDER_MAX_SIZE", { enumerable: true, get: function () { return recorder_js_1.DEFAULT_RECORDER_MAX_SIZE; } });
// ----- queue -----
var queue_js_1 = require("./queue/queue.js");
Object.defineProperty(exports, "EventQueue", { enumerable: true, get: function () { return queue_js_1.EventQueue; } });
Object.defineProperty(exports, "DEFAULT_QUEUE_CAPACITY", { enumerable: true, get: function () { return queue_js_1.DEFAULT_QUEUE_CAPACITY; } });
// ----- collaboration -----
var queue_js_2 = require("./collaboration/queue.js");
Object.defineProperty(exports, "CollaborationRequestQueue", { enumerable: true, get: function () { return queue_js_2.CollaborationRequestQueue; } });
// ----- metrics -----
var metrics_js_1 = require("./metrics/metrics.js");
Object.defineProperty(exports, "MetricsCollector", { enumerable: true, get: function () { return metrics_js_1.MetricsCollector; } });
Object.defineProperty(exports, "DEFAULT_LATENCY_BUFFER", { enumerable: true, get: function () { return metrics_js_1.DEFAULT_LATENCY_BUFFER; } });
Object.defineProperty(exports, "DEFAULT_LATENCY_SAMPLE_EVERY", { enumerable: true, get: function () { return metrics_js_1.DEFAULT_LATENCY_SAMPLE_EVERY; } });
// ----- sources -----
var filesystem_js_1 = require("./sources/filesystem.js");
Object.defineProperty(exports, "FilesystemSource", { enumerable: true, get: function () { return filesystem_js_1.FilesystemSource; } });
var os_js_1 = require("./sources/os.js");
Object.defineProperty(exports, "OSSource", { enumerable: true, get: function () { return os_js_1.OSSource; } });
Object.defineProperty(exports, "DEFAULT_OS_INTERVAL_MS", { enumerable: true, get: function () { return os_js_1.DEFAULT_OS_INTERVAL_MS; } });
var process_js_1 = require("./sources/process.js");
Object.defineProperty(exports, "ProcessSource", { enumerable: true, get: function () { return process_js_1.ProcessSource; } });
Object.defineProperty(exports, "DEFAULT_PROCESS_INTERVAL_MS", { enumerable: true, get: function () { return process_js_1.DEFAULT_PROCESS_INTERVAL_MS; } });
var network_js_1 = require("./sources/network.js");
Object.defineProperty(exports, "NetworkSource", { enumerable: true, get: function () { return network_js_1.NetworkSource; } });
Object.defineProperty(exports, "DEFAULT_NETWORK_INTERVAL_MS", { enumerable: true, get: function () { return network_js_1.DEFAULT_NETWORK_INTERVAL_MS; } });
Object.defineProperty(exports, "readLinuxNetDev", { enumerable: true, get: function () { return network_js_1.readLinuxNetDev; } });
var custom_js_1 = require("./sources/custom.js");
Object.defineProperty(exports, "CustomSource", { enumerable: true, get: function () { return custom_js_1.CustomSource; } });
var notification_js_1 = require("./sources/notification.js");
Object.defineProperty(exports, "NotificationSource", { enumerable: true, get: function () { return notification_js_1.NotificationSource; } });
var application_js_1 = require("./sources/application.js");
Object.defineProperty(exports, "ApplicationSource", { enumerable: true, get: function () { return application_js_1.ApplicationSource; } });
var stubs_js_1 = require("./sources/stubs.js");
Object.defineProperty(exports, "StubSource", { enumerable: true, get: function () { return stubs_js_1.StubSource; } });
Object.defineProperty(exports, "UsbSource", { enumerable: true, get: function () { return stubs_js_1.UsbSource; } });
Object.defineProperty(exports, "BluetoothSource", { enumerable: true, get: function () { return stubs_js_1.BluetoothSource; } });
Object.defineProperty(exports, "SensorSource", { enumerable: true, get: function () { return stubs_js_1.SensorSource; } });
Object.defineProperty(exports, "CameraSource", { enumerable: true, get: function () { return stubs_js_1.CameraSource; } });
Object.defineProperty(exports, "MicrophoneSource", { enumerable: true, get: function () { return stubs_js_1.MicrophoneSource; } });
//# sourceMappingURL=index.js.map