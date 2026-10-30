"use strict";
/**
 * @manya-os/attest — remote barrel export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ATTESTATION_FRESHNESS_MS = exports.deserializeAndVerifyAttestation = exports.produceAndSerializeAttestation = exports.verifyAttestation = exports.produceAttestation = exports.stableStringify = exports.validateQuote = exports.deserializeQuote = exports.serializeQuote = exports.ATTESTATION_QUOTE_VERSION = void 0;
var quote_js_1 = require("./quote.js");
Object.defineProperty(exports, "ATTESTATION_QUOTE_VERSION", { enumerable: true, get: function () { return quote_js_1.ATTESTATION_QUOTE_VERSION; } });
Object.defineProperty(exports, "serializeQuote", { enumerable: true, get: function () { return quote_js_1.serializeQuote; } });
Object.defineProperty(exports, "deserializeQuote", { enumerable: true, get: function () { return quote_js_1.deserializeQuote; } });
Object.defineProperty(exports, "validateQuote", { enumerable: true, get: function () { return quote_js_1.validateQuote; } });
Object.defineProperty(exports, "stableStringify", { enumerable: true, get: function () { return quote_js_1.stableStringify; } });
var attestation_js_1 = require("./attestation.js");
Object.defineProperty(exports, "produceAttestation", { enumerable: true, get: function () { return attestation_js_1.produceAttestation; } });
Object.defineProperty(exports, "verifyAttestation", { enumerable: true, get: function () { return attestation_js_1.verifyAttestation; } });
Object.defineProperty(exports, "produceAndSerializeAttestation", { enumerable: true, get: function () { return attestation_js_1.produceAndSerializeAttestation; } });
Object.defineProperty(exports, "deserializeAndVerifyAttestation", { enumerable: true, get: function () { return attestation_js_1.deserializeAndVerifyAttestation; } });
Object.defineProperty(exports, "DEFAULT_ATTESTATION_FRESHNESS_MS", { enumerable: true, get: function () { return attestation_js_1.DEFAULT_ATTESTATION_FRESHNESS_MS; } });
//# sourceMappingURL=index.js.map