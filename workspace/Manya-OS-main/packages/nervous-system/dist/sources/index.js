"use strict";
/**
 * @manya-os/nervous-system — event sources barrel.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrophoneSource = exports.CameraSource = exports.SensorSource = exports.BluetoothSource = exports.UsbSource = exports.StubSource = exports.ApplicationSource = exports.NotificationSource = exports.CustomSource = exports.readLinuxNetDev = exports.DEFAULT_NETWORK_INTERVAL_MS = exports.NetworkSource = exports.DEFAULT_PROCESS_INTERVAL_MS = exports.ProcessSource = exports.DEFAULT_OS_INTERVAL_MS = exports.OSSource = exports.FilesystemSource = void 0;
var filesystem_js_1 = require("./filesystem.js");
Object.defineProperty(exports, "FilesystemSource", { enumerable: true, get: function () { return filesystem_js_1.FilesystemSource; } });
var os_js_1 = require("./os.js");
Object.defineProperty(exports, "OSSource", { enumerable: true, get: function () { return os_js_1.OSSource; } });
Object.defineProperty(exports, "DEFAULT_OS_INTERVAL_MS", { enumerable: true, get: function () { return os_js_1.DEFAULT_OS_INTERVAL_MS; } });
var process_js_1 = require("./process.js");
Object.defineProperty(exports, "ProcessSource", { enumerable: true, get: function () { return process_js_1.ProcessSource; } });
Object.defineProperty(exports, "DEFAULT_PROCESS_INTERVAL_MS", { enumerable: true, get: function () { return process_js_1.DEFAULT_PROCESS_INTERVAL_MS; } });
var network_js_1 = require("./network.js");
Object.defineProperty(exports, "NetworkSource", { enumerable: true, get: function () { return network_js_1.NetworkSource; } });
Object.defineProperty(exports, "DEFAULT_NETWORK_INTERVAL_MS", { enumerable: true, get: function () { return network_js_1.DEFAULT_NETWORK_INTERVAL_MS; } });
Object.defineProperty(exports, "readLinuxNetDev", { enumerable: true, get: function () { return network_js_1.readLinuxNetDev; } });
var custom_js_1 = require("./custom.js");
Object.defineProperty(exports, "CustomSource", { enumerable: true, get: function () { return custom_js_1.CustomSource; } });
var notification_js_1 = require("./notification.js");
Object.defineProperty(exports, "NotificationSource", { enumerable: true, get: function () { return notification_js_1.NotificationSource; } });
var application_js_1 = require("./application.js");
Object.defineProperty(exports, "ApplicationSource", { enumerable: true, get: function () { return application_js_1.ApplicationSource; } });
var stubs_js_1 = require("./stubs.js");
Object.defineProperty(exports, "StubSource", { enumerable: true, get: function () { return stubs_js_1.StubSource; } });
Object.defineProperty(exports, "UsbSource", { enumerable: true, get: function () { return stubs_js_1.UsbSource; } });
Object.defineProperty(exports, "BluetoothSource", { enumerable: true, get: function () { return stubs_js_1.BluetoothSource; } });
Object.defineProperty(exports, "SensorSource", { enumerable: true, get: function () { return stubs_js_1.SensorSource; } });
Object.defineProperty(exports, "CameraSource", { enumerable: true, get: function () { return stubs_js_1.CameraSource; } });
Object.defineProperty(exports, "MicrophoneSource", { enumerable: true, get: function () { return stubs_js_1.MicrophoneSource; } });
//# sourceMappingURL=index.js.map