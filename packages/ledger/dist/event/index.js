"use strict";
/**
 * @manya-os/ledger — event barrel.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENESIS_PREV_HASH = exports.eventKeyId = exports.verifyEventSignature = exports.signEvent = exports.computeEventHash = exports.createEvent = exports.canonicalSerializeToString = exports.canonicalSerialize = void 0;
var codec_js_1 = require("./codec.js");
Object.defineProperty(exports, "canonicalSerialize", { enumerable: true, get: function () { return codec_js_1.canonicalSerialize; } });
Object.defineProperty(exports, "canonicalSerializeToString", { enumerable: true, get: function () { return codec_js_1.canonicalSerializeToString; } });
var event_js_1 = require("./event.js");
Object.defineProperty(exports, "createEvent", { enumerable: true, get: function () { return event_js_1.createEvent; } });
Object.defineProperty(exports, "computeEventHash", { enumerable: true, get: function () { return event_js_1.computeEventHash; } });
Object.defineProperty(exports, "signEvent", { enumerable: true, get: function () { return event_js_1.signEvent; } });
Object.defineProperty(exports, "verifyEventSignature", { enumerable: true, get: function () { return event_js_1.verifyEventSignature; } });
Object.defineProperty(exports, "eventKeyId", { enumerable: true, get: function () { return event_js_1.eventKeyId; } });
Object.defineProperty(exports, "GENESIS_PREV_HASH", { enumerable: true, get: function () { return event_js_1.GENESIS_PREV_HASH; } });
//# sourceMappingURL=index.js.map