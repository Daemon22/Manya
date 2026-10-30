"use strict";
/**
 * @manya-os/attest — session barrel export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySessionStore = exports.SESSION_TOKEN_BYTES = exports.DEFAULT_SESSION_TTL_MS = exports.SessionManager = void 0;
var session_js_1 = require("./session.js");
Object.defineProperty(exports, "SessionManager", { enumerable: true, get: function () { return session_js_1.SessionManager; } });
Object.defineProperty(exports, "DEFAULT_SESSION_TTL_MS", { enumerable: true, get: function () { return session_js_1.DEFAULT_SESSION_TTL_MS; } });
Object.defineProperty(exports, "SESSION_TOKEN_BYTES", { enumerable: true, get: function () { return session_js_1.SESSION_TOKEN_BYTES; } });
var store_js_1 = require("./store.js");
Object.defineProperty(exports, "InMemorySessionStore", { enumerable: true, get: function () { return store_js_1.InMemorySessionStore; } });
//# sourceMappingURL=index.js.map