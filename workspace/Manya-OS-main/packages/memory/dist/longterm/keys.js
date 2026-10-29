"use strict";
/**
 * @manya-os/memory — utility for generating stable IDs.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomId = randomId;
const crypto_1 = require("crypto");
/** Generate a prefixed random ID (default 16 hex chars). */
function randomId(prefix = 'mem', bytes = 8) {
    return `${prefix}_${(0, crypto_1.randomBytes)(bytes).toString('hex')}`;
}
//# sourceMappingURL=keys.js.map