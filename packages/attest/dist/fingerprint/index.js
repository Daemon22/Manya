"use strict";
/**
 * @manya-os/attest — fingerprint barrel export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceFingerprint = exports.LINUX_MACHINE_ID_PATHS = exports.REDACTED = exports.newCorrelationId = exports.stableStringify = exports.deriveDeviceId = exports.redactSignals = exports.collectDeviceSignals = void 0;
var collector_js_1 = require("./collector.js");
Object.defineProperty(exports, "collectDeviceSignals", { enumerable: true, get: function () { return collector_js_1.collectDeviceSignals; } });
Object.defineProperty(exports, "redactSignals", { enumerable: true, get: function () { return collector_js_1.redactSignals; } });
Object.defineProperty(exports, "deriveDeviceId", { enumerable: true, get: function () { return collector_js_1.deriveDeviceId; } });
Object.defineProperty(exports, "stableStringify", { enumerable: true, get: function () { return collector_js_1.stableStringify; } });
Object.defineProperty(exports, "newCorrelationId", { enumerable: true, get: function () { return collector_js_1.newCorrelationId; } });
Object.defineProperty(exports, "REDACTED", { enumerable: true, get: function () { return collector_js_1.REDACTED; } });
Object.defineProperty(exports, "LINUX_MACHINE_ID_PATHS", { enumerable: true, get: function () { return collector_js_1.LINUX_MACHINE_ID_PATHS; } });
var fingerprint_js_1 = require("./fingerprint.js");
Object.defineProperty(exports, "DeviceFingerprint", { enumerable: true, get: function () { return fingerprint_js_1.DeviceFingerprint; } });
//# sourceMappingURL=index.js.map