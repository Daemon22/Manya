"use strict";
/**
 * @manya-os/ledger — timestamp barrel.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMITMENT_BYTES = exports.COMMITMENT_NONCE_BYTES = exports.verifyTimestamp = exports.issueTimestamp = exports.reveal = exports.commit = exports.canonicalTimestampBytes = exports.TIMESTAMP_TOKEN_VERSION = exports.LocalTimestampAuthority = void 0;
var authority_js_1 = require("./authority.js");
Object.defineProperty(exports, "LocalTimestampAuthority", { enumerable: true, get: function () { return authority_js_1.LocalTimestampAuthority; } });
Object.defineProperty(exports, "TIMESTAMP_TOKEN_VERSION", { enumerable: true, get: function () { return authority_js_1.TIMESTAMP_TOKEN_VERSION; } });
Object.defineProperty(exports, "canonicalTimestampBytes", { enumerable: true, get: function () { return authority_js_1.canonicalTimestampBytes; } });
var timestamp_js_1 = require("./timestamp.js");
Object.defineProperty(exports, "commit", { enumerable: true, get: function () { return timestamp_js_1.commit; } });
Object.defineProperty(exports, "reveal", { enumerable: true, get: function () { return timestamp_js_1.reveal; } });
Object.defineProperty(exports, "issueTimestamp", { enumerable: true, get: function () { return timestamp_js_1.issueTimestamp; } });
Object.defineProperty(exports, "verifyTimestamp", { enumerable: true, get: function () { return timestamp_js_1.verifyTimestamp; } });
Object.defineProperty(exports, "COMMITMENT_NONCE_BYTES", { enumerable: true, get: function () { return timestamp_js_1.COMMITMENT_NONCE_BYTES; } });
Object.defineProperty(exports, "COMMITMENT_BYTES", { enumerable: true, get: function () { return timestamp_js_1.COMMITMENT_BYTES; } });
//# sourceMappingURL=index.js.map