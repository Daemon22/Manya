"use strict";
/**
 * @manya-os/ledger — store barrel.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMPACT_THRESHOLD_BYTES = exports.FileLedgerStore = exports.cloneEvent = exports.InMemoryLedgerStore = void 0;
var memory_js_1 = require("./memory.js");
Object.defineProperty(exports, "InMemoryLedgerStore", { enumerable: true, get: function () { return memory_js_1.InMemoryLedgerStore; } });
Object.defineProperty(exports, "cloneEvent", { enumerable: true, get: function () { return memory_js_1.cloneEvent; } });
var file_js_1 = require("./file.js");
Object.defineProperty(exports, "FileLedgerStore", { enumerable: true, get: function () { return file_js_1.FileLedgerStore; } });
Object.defineProperty(exports, "DEFAULT_COMPACT_THRESHOLD_BYTES", { enumerable: true, get: function () { return file_js_1.DEFAULT_COMPACT_THRESHOLD_BYTES; } });
//# sourceMappingURL=index.js.map