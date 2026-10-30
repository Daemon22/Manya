"use strict";
/**
 * @manya-os/attest — challenge barrel export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CHALLENGE_BYTES = exports.DEFAULT_CHALLENGE_TTL_MS = exports.isChallengeExpired = exports.verifyResponse = exports.signChallenge = exports.decodeChallenge = exports.generateChallenge = exports.DEFAULT_NONCE_BYTES = exports.DEFAULT_NONCE_TTL_MS = exports.NonceStore = void 0;
var nonce_js_1 = require("./nonce.js");
Object.defineProperty(exports, "NonceStore", { enumerable: true, get: function () { return nonce_js_1.NonceStore; } });
Object.defineProperty(exports, "DEFAULT_NONCE_TTL_MS", { enumerable: true, get: function () { return nonce_js_1.DEFAULT_NONCE_TTL_MS; } });
Object.defineProperty(exports, "DEFAULT_NONCE_BYTES", { enumerable: true, get: function () { return nonce_js_1.DEFAULT_NONCE_BYTES; } });
var challenge_js_1 = require("./challenge.js");
Object.defineProperty(exports, "generateChallenge", { enumerable: true, get: function () { return challenge_js_1.generateChallenge; } });
Object.defineProperty(exports, "decodeChallenge", { enumerable: true, get: function () { return challenge_js_1.decodeChallenge; } });
Object.defineProperty(exports, "signChallenge", { enumerable: true, get: function () { return challenge_js_1.signChallenge; } });
Object.defineProperty(exports, "verifyResponse", { enumerable: true, get: function () { return challenge_js_1.verifyResponse; } });
Object.defineProperty(exports, "isChallengeExpired", { enumerable: true, get: function () { return challenge_js_1.isChallengeExpired; } });
Object.defineProperty(exports, "DEFAULT_CHALLENGE_TTL_MS", { enumerable: true, get: function () { return challenge_js_1.DEFAULT_CHALLENGE_TTL_MS; } });
Object.defineProperty(exports, "DEFAULT_CHALLENGE_BYTES", { enumerable: true, get: function () { return challenge_js_1.DEFAULT_CHALLENGE_BYTES; } });
//# sourceMappingURL=index.js.map